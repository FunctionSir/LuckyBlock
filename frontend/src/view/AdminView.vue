<template>
  <div
    style="
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    "
  >
    <div
      style="display: flex; justify-content: space-between; align-items: center"
    >
      <h1>🔑 管理后台</h1>
      <router-link to="/" style="color: #2196f3">← 返回首页</router-link>
    </div>

    <div
      v-if="!isManager"
      style="
        background: #ffebee;
        padding: 20px;
        border-radius: 8px;
        color: #c62828;
      "
    >
      ⛔ 您不是管理员，无权访问此页面
    </div>

    <div v-else>
      <div
        style="
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        "
      >
        <p><strong>当前期数:</strong> 第 {{ round }} 期</p>
        <p><strong>奖池总额:</strong> {{ totalBalance }} ETH</p>
        <p><strong>平台累积手续费:</strong> {{ platformFee }} ETH</p>
        <p><strong>当前参与人数:</strong> {{ playerCount }} 人</p>
      </div>

      <div style="display: flex; gap: 10px; flex-wrap: wrap">
        <button
          @click="handleDraw"
          style="
            padding: 12px 30px;
            background: #ff9800;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          "
        >
          🎲 开奖
        </button>
        <button
          @click="handleWithdraw"
          style="
            padding: 12px 30px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          "
        >
          💰 提取平台费
        </button>
        <button
          @click="refreshAll"
          style="
            padding: 12px 30px;
            background: #9e9e9e;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          "
        >
          🔄 刷新数据
        </button>
      </div>

      <hr style="margin: 30px 0" />

      <h3>👥 本期所有玩家</h3>
      <ul v-if="players.length > 0">
        <li v-for="(p, idx) in players" :key="idx">{{ idx + 1 }}. {{ p }}</li>
      </ul>
      <p v-else>暂无玩家</p>

      <hr style="margin: 30px 0" />
    </div>
  </div>
</template>

<script setup>
import { useLottery } from "@/composables/useLottery"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter();
const {
  init,
  drawWinner,
  getBalance,
  getPlatformBalance,
  getTotalBalance,
  getPlayersCount,
  getPlayers,
  getRound,
  getCurrentAddress,
  withdrawFee,
  contract,
} = useLottery();

const address = ref("");
const round = ref(0);
const totalBalance = ref("0");
const platformFee = ref("0");
const playerCount = ref(0);
const players = ref([]);
const managerAddress = ref("");

const isManager = computed(() => {
  if (!address.value || !managerAddress.value) return false;
  return address.value.toLowerCase() === managerAddress.value.toLowerCase();
});

const refreshAll = async () => {
  totalBalance.value = await getTotalBalance();
  platformFee.value = await getPlatformBalance();
  playerCount.value = await getPlayersCount();
  players.value = await getPlayers();
  round.value = await getRound();
};

const handleDraw = async () => {
  if (!confirm("确认开奖？")) return;
  try {
    if (playerCount.value === 0) {
      alert("⚠️ 当前没有玩家参与，无法开奖");
      return;
    }
    //生成安全随机索引
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const winnerIndex = array[0] % playerCount.value;

    console.log(
      `🎲 随机中奖索引: ${winnerIndex} (玩家总数: ${playerCount.value})`,
    );
    await drawWinner(winnerIndex); //调用合约开奖
    alert(`开奖成功！中奖索引: ${winnerIndex}`);
    setTimeout(refreshAll, 5000);
  } catch (error) {
    alert("❌ 开奖失败: " + error.message);
  }
};

const handleWithdraw = async () => {
  if (platformFee.value <= 0) {
    alert("❌ 提取失败: 目前没有平台费");
    return;
  }
  if (!confirm("确认提取所有平台手续费吗？")) return;
  try {
    await withdrawFee();
    alert("✅ 手续费提取成功！");
    await refreshAll(); // 刷新数据
    setTimeout(refreshAll, 5000);
  } catch (error) {
    console.error("提取失败:", error);
    alert("❌ 提取失败: " + error.message);
  }
};

onMounted(async () => {
  await init();
  address.value = await getCurrentAddress();
  if (contract.value) {
    managerAddress.value = await contract.value.manager();
  }
  if (!isManager.value) {
    // 非管理员直接跳回首页
    router.push("/");
    return;
  }
  await refreshAll();
});
</script>
