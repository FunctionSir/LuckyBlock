// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.9.0;

contract LuckyBlock {
    mapping(address => bool) isManager;
    uint256 managersCnt;
    address platformFeeReceiver;
    uint256 totalFee;
    uint256 roundFee;
    uint256 feeRate;
    uint256 roundSales;
    uint256 curRound;
    bool paused;

    address[] tickets;
    uint256 ticketPrice;

    constructor() {
        // CONFIG HERE //
        feeRate = 20; // 20%
        ticketPrice = 1000000000000000; // 1000000000000000 wei = 0.001 ether.
        platformFeeReceiver = msg.sender;
        // END OF CONFIG //

        isManager[msg.sender] = true;
        managersCnt++;
        curRound = 1;
    }

    modifier managerOnly() {
        require(isManager[msg.sender], "You are not a manager!");
        _;
    }

    modifier whenNotPaused() {
        require(!paused,"Lottery paused!");
        _;
    }

    modifier needsNoFee() {
        require(msg.value == 0, "This operation needs no fee!");
        _;
    }

    function addManager(address _addr) public managerOnly {
        if (!isManager[_addr]) {
            managersCnt++;
        }
        isManager[_addr] = true;
    }

    function removeManager(address _addr) public managerOnly {
        require(msg.sender != _addr, "You can not remove yourself!");
        if (isManager[_addr]) {
            managersCnt--;
        }
        isManager[_addr] = false; // Or "delete isManager[_addr];"
    }

    function pause() public managerOnly whenNotPaused {
        paused = true;
    }

    function unpause() public managerOnly {
        require(paused,"Not paused yet!");
        paused = false;
    }

    function claimPlatformFee() public payable managerOnly needsNoFee {
        require(totalFee > 0, "No platform fee balance yet!");
        uint256 amount = totalFee;
        totalFee = 0;
        (bool ok, ) = payable(platformFeeReceiver).call{value: amount}("");
        require(ok, "Can not claim platform fee");
    }

    function isPaused() public view returns (bool) {
        return paused;
    }

    function getTicketPrice() public view whenNotPaused returns (uint256) {
        return ticketPrice;
    }

    function buyTicket() public payable whenNotPaused {
        require(msg.value == ticketPrice, "Msg.value is not equal to ticket price!");
        tickets.push(msg.sender);
        roundSales += msg.value;
        roundFee = roundSales * feeRate / 100;
    }
 
    function getPrizePool() public view returns (uint256) {
        return roundSales - roundFee;
    }

    function getRoundFee() public view managerOnly returns (uint256) {
        return roundFee;
    }

    function getTotalFee() public view managerOnly returns (uint256) {
        return totalFee;
    }

    function getTicketsCnt() public view returns (uint256) {
        return tickets.length;
    }

    function getCurRound() public view returns (uint256) {
        return curRound;
    }

    function draw(uint256 random) public payable managerOnly needsNoFee {
        require(tickets.length > 0, "No one palyed yet!");
        address winner = tickets[random % tickets.length];
        uint256 prize = roundSales - roundFee;
        totalFee += roundFee;
        roundFee = 0;
        roundSales = 0;
        delete tickets;
        curRound++;
        (bool ok, ) = payable(winner).call{value: prize}("");
        require(ok, "Can not draw!");
    }
}
