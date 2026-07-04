<template>
  <!-- ============ 页面容器 ============ -->
  <div
    style="
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    "
  >
    <h1>🎰 链上彩票</h1>

    <!-- ============ 未连接钱包状态 ============ -->
    <div
      v-if="!connected"
      style="
        background: #f0f0f0;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
      "
    >
      <p>请连接 MetaMask 钱包</p>
      <button
        @click="connectWallet"
        style="
          padding: 12px 30px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        "
      >
        连接 MetaMask
      </button>
    </div>

    <!-- ============ 已连接钱包状态 ============ -->
    <div v-else>
      <!-- 显示当前连接的钱包地址（完整显示） -->
      <p
        style="
          background: #e8f5e9;
          padding: 12px 16px;
          border-radius: 4px;
          word-break: break-all;
        "
      >
        ✅ 已连接: <strong>{{ address }}</strong>
      </p>

      <!-- 如果是管理员，显示进入后台的入口链接 -->
      <div
        v-if="isManager"
        style="
          background: #fff3e0;
          padding: 12px 16px;
          border-radius: 4px;
          margin: 10px 0;
          border-left: 4px solid #ff9800;
        "
      >
        🔑 您是管理员 →
        <router-link to="/admin" style="color: #ff9800; font-weight: bold"
          >进入管理后台</router-link
        >
      </div>

      <!-- ============ 彩票核心信息卡片 ============ -->
      <div
        style="
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        "
      >
        <p>
          <strong>📌 第 {{ round }} 期</strong>
        </p>
        <p>
          💰 奖池: <strong>{{ balance }} ETH</strong>
        </p>
        <p>
          👥 参与人数: <strong>{{ playerCount }} 人</strong>
        </p>
      </div>

      <!-- ============ 买票按钮 ============ -->
      <button
        @click="handleBuy"
        :disabled="loading"
        style="
          padding: 12px 40px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        "
      >
        {{ loading ? "⏳ 购买中..." : "🎫 花 0.001 ETH 买一张" }}
      </button>

      <hr style="margin: 30px 0" />

      <!-- ============ 本期参与者列表 ============ -->
      <h3>👥 本期参与者 (共 {{ playerCount }} 人)</h3>
      <ul v-if="players.length > 0" style="list-style: none; padding: 0">
        <li
          v-for="(p, idx) in players"
          :key="idx"
          style="padding: 6px 12px; border-bottom: 1px solid #eee"
        >
          <!-- 如果是当前用户自己，加特殊标记 -->
          <span
            v-if="p.toLowerCase() === address.toLowerCase()"
            style="color: #4caf50; font-weight: bold"
          >
            ⭐ {{ p }} (我)
          </span>
          <!-- 其他玩家 -->
          <span v-else>👤 {{ p }}</span>
        </li>
      </ul>
      <p v-else style="color: #999">暂无参与者</p>

      <hr style="margin: 30px 0" />
    </div>
  </div>
</template>

<script setup>
// ============ 导入依赖 ============
// useLottery: 封装了所有链上交互逻辑的 composable
import { useLottery } from "@/composables/useLottery"
// Vue 组合式 API
import { computed, onMounted, ref } from "vue"

// ============ 从 useLottery 中解构出需要的函数和状态 ============
const {
  init, // 初始化合约连接
  buyTicket, // 买票函数
  getBalance, // 查询奖池余额
  getPlayersCount, // 查询参与人数
  getPlayers, // 查询玩家列表
  getRound, // 查询当前期数
  getCurrentAddress, // 获取当前钱包地址
  loading, // 加载状态（用于按钮禁用）
  contract, // 合约实例（用于读取管理员地址）
} = useLottery();

// ============ 响应式状态变量 ============
const address = ref(""); // 当前连接的钱包地址
const balance = ref("0"); // 奖池金额（ETH 字符串）
const playerCount = ref(0); // 参与人数
const players = ref([]); // 玩家地址列表
const round = ref(0); // 当前期数
const connected = ref(false); // 是否已连接钱包
const managerAddress = ref(""); // 合约管理员地址（从链上读取）

// ============ 计算属性 ============
// 判断当前用户是否为管理员
// 比较当前连接地址和合约管理员地址是否一致（忽略大小写）
const isManager = computed(() => {
  if (!address.value || !managerAddress.value) return false;
  return address.value.toLowerCase() === managerAddress.value.toLowerCase();
});

// ============ 连接钱包函数 ============
const connectWallet = async () => {
  // 检查浏览器是否安装了 MetaMask
  if (!window.ethereum) return alert("请安装 MetaMask");

  // 1. 请求用户授权连接钱包（弹出 MetaMask 连接窗口）
  await window.ethereum.request({ method: "eth_requestAccounts" });

  // 2. 初始化合约连接（创建 Provider、Signer、Contract 实例）
  await init();

  // 3. 获取当前钱包地址
  address.value = await getCurrentAddress();

  // 4. 标记为已连接
  connected.value = true;

  // 5. 从链上读取管理员地址（用于判断当前用户是否有管理权限）
  if (contract.value) {
    managerAddress.value = await contract.value.manager();
  }

  // 6. 刷新所有数据（奖池、参与者、期数、历史记录）
  await refreshAll();
};

// ============ 刷新所有数据 ============
const refreshAll = async () => {
  // 并行从链上读取各项数据
  balance.value = await getBalance(); // 奖池金额
  playerCount.value = await getPlayersCount(); // 参与人数
  players.value = await getPlayers(); // 玩家列表
  round.value = await getRound(); // 当前期数
};

// ============ 买票处理函数 ============
const handleBuy = async () => {
  // 调用 useLottery 中的 buyTicket 函数
  // 内部会：调用合约买票 → 等待交易确认 → 上报后端
  await buyTicket();

  // 提示用户购票成功
  alert("购票成功！");
  // 等待 5 秒后刷新数据
  // 原因：链上数据需要时间同步，5 秒是给节点一个缓冲期
  // 确保刷新时读到的是已更新的链上状态
  setTimeout(refreshAll, 5000);
};

// ============ 生命周期钩子：组件挂载时执行 ============
onMounted(async () => {
  // 检测浏览器是否安装了 MetaMask
  if (window.ethereum) {
    try {
      // 1. 初始化合约连接（不弹窗，只建立连接）
      await init();

      // 2. 尝试获取当前钱包地址
      // 如果用户已经授权过，这里能直接拿到地址
      address.value = await getCurrentAddress();

      // 3. 标记为已连接
      connected.value = true;

      // 4. 读取管理员地址
      if (contract.value) {
        managerAddress.value = await contract.value.manager();
      }

      // 5. 刷新所有数据
      await refreshAll();
    } catch {
      // 如果用户未授权或连接失败，标记为未连接
      // 让用户点击"连接 MetaMask"按钮主动连接
      connected.value = false;
    }
  }
});
</script>
