// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

contract LuckyBlock is VRFConsumerBaseV2 {
    // ============ 角色管理 ============
    mapping(address => bool) public isManager;
    uint256 public managersCnt;
    address public platformFeeReceiver;

    // ============ 费用相关 ============
    uint256 public platformBalance; // 历史累积平台费
    uint256 public roundFee;        // 当前轮次平台费
    uint256 public feeRate;         // 平台费率（百分比）
    uint256 public roundSales;      // 当前轮次总销售额
    uint256 public curRound;        // 当前期数
    bool public paused;             // 紧急暂停

    // ============ 彩票 ============
    address[] public tickets;
    uint256 public ticketPrice;

    // ============ Chainlink VRF ============
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    bool public immutable testMode; // 构造函数锁定，不可更改
    uint256 public s_lastRequestId;
    mapping(uint256 => bool) public pendingDraws;

    // ============ 事件 ============
    event TicketPurchased(address indexed buyer, uint256 round);
    event DrawRequested(uint256 indexed requestId, uint256 round);
    event WinnerSelected(address indexed winner, uint256 prize, uint256 round);
    event PlatformFeeWithdrawn(uint256 amount);

    // ============ 构造函数 ============
    constructor(
        uint64 _subscriptionId,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        bool _testMode
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        feeRate = 20;
        ticketPrice = 0.001 ether;
        platformFeeReceiver = msg.sender;

        isManager[msg.sender] = true;
        managersCnt = 1;
        curRound = 1;

        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_subscriptionId = _subscriptionId;
        i_keyHash = _keyHash;
        i_callbackGasLimit = _callbackGasLimit;

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

    // ============ 查询函数（4.1 公共函数） ============
    function buyTicket() external payable whenNotPaused {
        require(msg.value == ticketPrice, "Wrong ticket price");
        tickets.push(msg.sender);
        roundSales += msg.value;
        roundFee = (roundSales * feeRate) / 100;
        emit TicketPurchased(msg.sender, curRound);
    }

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

    // ============ 管理员查询 ============
    function getRoundFee() external view onlyManager returns (uint256) {
        return roundFee;
    }

    function getPlatformBalance() external view onlyManager returns (uint256) {
        return platformBalance;
    }

    // ============ 提取平台费 ============
    function withdrawFee() external onlyManager needsNoFee {
        require(platformBalance > 0, "No platform fee");
        uint256 amount = platformBalance;
        platformBalance = 0;
        (bool ok, ) = payable(platformFeeReceiver).call{value: amount}("");
        require(ok, "Transfer failed");
        emit PlatformFeeWithdrawn(amount);
    }

    // ============ 开奖（Chainlink VRF 模式） ============
    function requestDraw() external onlyManager needsNoFee {
        require(!testMode, "Use drawWinner in test mode");
        require(tickets.length > 0, "No players");

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        pendingDraws[requestId] = true;
        s_lastRequestId = requestId;
        emit DrawRequested(requestId, curRound);
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(pendingDraws[_requestId], "Request not found");
        pendingDraws[_requestId] = false;
        _executeDraw(_randomWords[0] % tickets.length);
    }

    // ============ 开奖（VM 测试模式） ============
    function drawWinner(uint256 _random) external onlyManager needsNoFee {
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