# LuckyBlock · 链上幸运彩票 — 项目理解与演示指南

## 一、项目概述

LuckyBlock 是一个基于以太坊智能合约的去中心化彩票系统。玩家支付固定 ETH 购买彩票，管理员触发开奖后，Chainlink VRF 生成链上真随机数选出中奖者，奖金自动转账。

**技术栈：** Solidity + Chainlink VRF V2 + Vue 3 + Vite + ethers.js

---

## 二、演示步骤

### 2.1 环境准备

| 工具 | 用途 |
|------|------|
| [MetaMask](https://metamask.io/) 浏览器插件 | 钱包 |
| [Remix IDE](https://remix.ethereum.org/) | 部署合约 |
| Node.js ≥ 18 | 运行前端 |

### 2.2 方式一：Remix VM 本地测试（推荐演示用）

> 无需测试币，无需 Chainlink 订阅，3 分钟跑通。

**步骤：**

1. 打开 Remix IDE，创建 `LuckyBlock.sol`，粘贴 [contracts/LuckyBlock.sol](./contracts/LuckyBlock.sol)
2. 左侧编译面板选择 `0.8.19` 编译器，点击 **Compile**
3. 部署面板环境选 **Remix VM (Cancun)**，构造函数参数：
   - `_subscriptionId`: `0`
   - `_vrfCoordinator`: `0x0000000000000000000000000000000000000000`
   - `_keyHash`: `0x0000000000000000000000000000000000000000000000000000000000000000`
   - `_callbackGasLimit`: `0`
   - `_testMode`: `true`
4. 点击 **transact** 部署
5. 切换 Remix 账户面板到不同地址，调用 `buyTicket`（value: `1000000000000000` wei = 0.001 ETH），重复多次
6. 切回部署者账户，调用 `drawWinner`，传入任意数字（如 `12345`）
7. 观察中奖者地址余额变化，调用 `getRound` 确认进入下一期
8. 调用 `withdrawFee` 提取平台费

### 2.3 方式二：Sepolia 测试网（展示真随机数）

**前置准备：**

1. 在 [vrf.chain.link](https://vrf.chain.link) 创建 Subscription，获取 `subscriptionId`
2. 向订阅充值 LINK 代币
3. MetaMask 切换到 Sepolia 网络，领取测试 ETH（[Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)）

**步骤：**

1. Remix 环境选 **Injected Provider - MetaMask**
2. 部署参数：
   - `_subscriptionId`: 你的订阅 ID
   - `_vrfCoordinator`: `0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625`
   - `_keyHash`: `0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c`
   - `_callbackGasLimit`: `100000`
   - `_testMode`: `false`
3. 在 vrf.chain.link 将部署的合约地址添加为 Consumer
4. 多账户买票 → 管理员调用 `requestDraw` → 等待约 30 秒 → 查看 `WinnerSelected` 事件

### 2.4 前端演示

```bash
cd frontend
npm install
npm run dev
```

1. 修改 `src/composables/useContract.js` 中的 `CONTRACT_ADDRESS` 为部署地址
2. 浏览器打开 `http://localhost:5173`
3. 连接 MetaMask → 购买彩票 → 管理员面板操作

---

## 三、项目讲解大纲

### 3.1 一句话介绍

> "这是一个去中心化彩票系统，用 Chainlink 预言机保证开奖的随机性和公平性，所有数据上链可查。"

### 3.2 核心流程（3 分钟讲清楚）

```
玩家买票 → 地址记录上链 → 管理员请求开奖 → Chainlink VRF 生成随机数
→ 合约回调自动选赢家 → 奖金自动转账 → 平台费累积 → 管理员提取
```

### 3.3 架构分层

```
┌─────────────────────────────────┐
│         前端 (Vue 3)            │  ← ethers.js 连接 MetaMask
├─────────────────────────────────┤
│     智能合约 (Solidity)          │  ← 业务逻辑 + 状态管理
├─────────────────────────────────┤
│   Chainlink VRF (预言机)         │  ← 链上真随机数
├─────────────────────────────────┤
│      以太坊 / Sepolia            │  ← 底层区块链
└─────────────────────────────────┘
```

### 3.4 奖池分配算法

```
总奖池 = 当前轮次销售额
玩家奖金 = 总奖池 × 80%
平台费   = 总奖池 × 20%（累积到 platformBalance）
```

### 3.5 安全设计

- **防重入攻击**：`_executeDraw` 严格遵循 CEI（Checks-Effects-Interactions）模式，先改状态后转账
- **权限控制**：`onlyManager` 修饰器统一管理管理员权限
- **紧急暂停**：`pause`/`unpause` 应对突发情况
- **testMode 不可变**：构造函数中 `immutable` 锁定，部署后无法篡改，保证公平性

---

## 四、相比原始需求的改进与亮点

### 4.1 随机数方案升级

| 原始设计 | 改进后 |
|----------|--------|
| 管理员手动传入 `drawWinner(index)` | Chainlink VRF V2 链上真随机数 |
| 管理员可操控开奖结果 | 随机数由预言机生成，不可预测 |
| 无 VM 测试方案 | `testMode` 保留 `drawWinner(uint256)` 用于本地测试 |

### 4.2 安全修复

| 问题 | 状态 |
|------|------|
| 原 `draw()` 函数先转账后改状态（重入漏洞） | 已修复为 CEI 模式 |
| 拼写错误 `palyed` | 已修正为 `played` |

### 4.3 接口规范化

所有函数名对齐需求文档，统一命名风格：

| 原实现 | 改进后 |
|--------|--------|
| `getTicketsCnt()` | `getPlayersCount()` |
| `getCurRound()` | `getRound()` |
| `claimPlatformFee()` | `withdrawFee()` |
| `getTotalFee()` / `totalFee` | `getPlatformBalance()` / `platformBalance` |
| `managerOnly` | `onlyManager` |
| 无 `getPlayers()` 公开接口 | 新增，任何人可查参与者列表 |

### 4.4 前端技术栈升级

| 原始 | 改进后 |
|------|--------|
| 单文件 HTML + 内联 JS | Vue 3 + Vite 工程化 |
| 全局变量混杂 | Composition API + 响应式状态管理 |
| 无组件拆分 | WalletConnect / LotteryStatus / AdminPanel / EventLog 组件化 |
| 合约逻辑散落 | 抽取至 `composables/useContract.js` |

### 4.5 关键设计亮点

1. **双模式设计**：`testMode` 在构造函数中通过 `immutable` 锁定，部署即确定，不可更改。VM 模式和 VRF 模式代码复用同一套 `_executeDraw` 逻辑
2. **事件驱动刷新**：前端通过监听合约事件（`TicketPurchased`、`WinnerSelected` 等）自动更新 UI，无需轮询
3. **多管理员支持**：`addManager`/`removeManager` 实现管理员权限的灵活管理
4. **平台费分离设计**：`platformBalance` 独立于奖池，历史累积费用不会与当前轮次混淆

---

## 五、合约接口速查

### 公共函数

| 函数 | 说明 |
|------|------|
| `buyTicket()` | 支付 0.001 ETH 购票 |
| `getBalance()` | 查询当前奖池 |
| `getPlayersCount()` | 查询参与者人数 |
| `getRound()` | 查询当前期数 |
| `getPlayers()` | 查询参与者地址列表 |
| `getTicketPrice()` | 查询票价 |
| `isPaused()` | 查询暂停状态 |

### 管理员函数

| 函数 | 说明 |
|------|------|
| `requestDraw()` | 请求 Chainlink VRF 开奖（非测试模式） |
| `drawWinner(uint256)` | VM 测试模式开奖 |
| `withdrawFee()` | 提取累积平台费 |
| `pause()` / `unpause()` | 紧急暂停/恢复 |
| `addManager(address)` / `removeManager(address)` | 管理管理员 |

### 事件

| 事件 | 触发时机 |
|------|----------|
| `TicketPurchased(address, uint256)` | 玩家购票 |
| `DrawRequested(uint256, uint256)` | VRF 请求发出 |
| `WinnerSelected(address, uint256, uint256)` | 开奖完成 |
| `PlatformFeeWithdrawn(uint256)` | 平台费提取 |

---

## 六、测试用例对照

| ID | 场景 | 预期 | 状态 |
|----|------|------|------|
| TC-01 | 部署合约 | manager = 部署者，round = 1 | 通过 |
| TC-02 | 玩家 A 买 0.001 ETH | players 长度 = 1，合约余额 = 0.001 ETH | 通过 |
| TC-03 | 玩家 B 买 0.001 ETH | players 长度 = 2，合约余额 = 0.002 ETH | 通过 |
| TC-04 | 管理员开奖 | 奖金 = 0.0016 ETH 转给赢家，round = 2 | 通过 |
| TC-05 | 非管理员开奖 | 回滚，提示 "Only manager" | 通过 |
| TC-06 | 管理员提取平台费 | platformBalance 归零，管理员收到 ETH | 通过 |
| TC-07 | 无人买票时开奖 | 回滚，提示 "No players" | 通过 |
| TC-08 | 索引越界开奖 | 取模运算不会越界，改为验证随机公平性 | 已覆盖 |

---

## 七、后续可扩展方向

- 多票种（不同价格、不同奖池）
- 定时自动开奖（Chainlink Automation）
- 后端服务（Spring Boot + MySQL）做数据索引和统计
- 前端增加历史开奖记录查询
- The Graph 子图做链上数据索引