// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract LuckyBlock is VRFConsumerBaseV2Plus {
    // ============ 角色管理 ============
    mapping(address => bool) public isManager;
    uint256 public managersCnt;
    address public platformFeeReceiver;

    // ============ 费用相关 ============
    uint256 public platformBalance;
    uint256 public roundFee;
    uint256 public feeRate;
    uint256 public roundSales;
    uint256 public curRound;
    bool public paused;

    // ============ 彩票 ============
    address[] public tickets;
    uint256 public ticketPrice;

    // ============ Chainlink VRF v2.5 ============
    address private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint256 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    bool private immutable i_nativePayment;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    bool public immutable testMode;
    uint256 public s_lastRequestId;
    mapping(uint256 => bool) public pendingDraws;

    // ============ 事件 ============
    event TicketPurchased(address indexed buyer, uint256 round);
    event DrawRequested(uint256 indexed requestId, uint256 round);
    event WinnerSelected(address indexed winner, uint256 prize, uint256 round);
    event PlatformFeeWithdrawn(uint256 amount);

    // ============ 构造函数 ============
    constructor(
        uint256 _subscriptionId,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        bool _nativePayment,
        bool _testMode
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        feeRate = 20;
        ticketPrice = 0.001 ether;
        platformFeeReceiver = msg.sender;

        isManager[msg.sender] = true;
        managersCnt = 1;
        curRound = 1;

        i_vrfCoordinator = _vrfCoordinator;
        i_subscriptionId = _subscriptionId;
        i_keyHash = _keyHash;
        i_callbackGasLimit = _callbackGasLimit;
        i_nativePayment = _nativePayment;

        testMode = _testMode;
    }

    // ============ 修饰器 ============
    modifier onlyManager() {
        require(isManager[msg.sender], "Only manager");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Lottery paused");
        _;
    }

    modifier needsNoFee() {
        require(msg.value == 0, "No ETH required");
        _;
    }

    // ============ 管理员管理 ============
    function addManager(address _addr) external onlyManager {
        if (!isManager[_addr]) {
            managersCnt++;
        }
        isManager[_addr] = true;
    }

    function removeManager(address _addr) external onlyManager {
        require(msg.sender != _addr, "Cannot remove yourself");
        if (isManager[_addr]) {
            managersCnt--;
        }
        isManager[_addr] = false;
    }

    // ============ 紧急暂停 ============
    function pause() external onlyManager whenNotPaused {
        paused = true;
    }

    function unpause() external onlyManager {
        require(paused, "Not paused");
        paused = false;
    }

    // ============ 购买彩票 ============
    function buyTicket() external payable whenNotPaused {
        require(msg.value == ticketPrice, "Wrong ticket price");
        tickets.push(msg.sender);
        roundSales += msg.value;
        roundFee = (roundSales * feeRate) / 100;
        emit TicketPurchased(msg.sender, curRound);
    }

    // ============ 查询函数 ============
    function getBalance() external view returns (uint256) {
        return roundSales - roundFee;
    }

    function getPlayersCount() external view returns (uint256) {
        return tickets.length;
    }

    function getRound() external view returns (uint256) {
        return curRound;
    }

    function getPlayers() external view returns (address[] memory) {
        return tickets;
    }

    function getTicketPrice() external view whenNotPaused returns (uint256) {
        return ticketPrice;
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function getRoundFee() external view onlyManager returns (uint256) {
        return roundFee;
    }

    function getPlatformBalance() external view onlyManager returns (uint256) {
        return platformBalance;
    }

    // ============ 提取平台费 ============
    function withdrawFee() external payable onlyManager needsNoFee {
        require(platformBalance > 0, "No platform fee");
        uint256 amount = platformBalance;
        platformBalance = 0;
        (bool ok, ) = payable(platformFeeReceiver).call{value: amount}("");
        require(ok, "Transfer failed");
        emit PlatformFeeWithdrawn(amount);
    }

    // ============ 开奖（Chainlink VRF v2.5 模式） ============
    function requestDraw() external payable onlyManager needsNoFee {
        require(!testMode, "Use drawWinner in test mode");
        require(tickets.length > 0, "No players");

        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_keyHash,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: i_nativePayment})
                )
            })
        );

        pendingDraws[requestId] = true;
        s_lastRequestId = requestId;
        emit DrawRequested(requestId, curRound);
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] calldata _randomWords
    ) internal override {
        require(pendingDraws[_requestId], "Request not found");
        pendingDraws[_requestId] = false;
        _executeDraw(_randomWords[0] % tickets.length);
    }

    // ============ 开奖（VM 测试模式） ============
    function drawWinner(uint256 _random) external payable onlyManager needsNoFee {
        require(testMode, "Only in test mode");
        require(tickets.length > 0, "No players");
        _executeDraw(_random % tickets.length);
    }

    // ============ 内部开奖逻辑（先改状态后转账，防重入） ============
    function _executeDraw(uint256 _winnerIndex) private {
        address winner = tickets[_winnerIndex];
        uint256 prize = roundSales - roundFee;

        // Checks-Effects-Interactions：先改状态
        platformBalance += roundFee;
        roundFee = 0;
        roundSales = 0;
        delete tickets;
        curRound++;

        // 最后转账
        (bool ok, ) = payable(winner).call{value: prize}("");
        require(ok, "Transfer failed");

        emit WinnerSelected(winner, prize, curRound - 1);
    }

    // ============ 接收 ETH ============
    receive() external payable {}
}