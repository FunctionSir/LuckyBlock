<script setup>
import { useContract } from './composables/useContract.js'
import WalletConnect from './components/WalletConnect.vue'
import LotteryStatus from './components/LotteryStatus.vue'
import AdminPanel from './components/AdminPanel.vue'
import EventLog from './components/EventLog.vue'

const { account, isManager } = useContract()
</script>

<template>
  <div class="app">
    <h1>LuckyBlock · 链上幸运彩票</h1>
    <WalletConnect />
    <LotteryStatus />
    <AdminPanel v-if="isManager" />
    <EventLog />
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  color: #e0e0e0;
  min-height: 100vh;
  padding: 20px;
}
.app {
  max-width: 800px;
  margin: 0 auto;
}
h1 {
  text-align: center;
  font-size: 2rem;
  background: linear-gradient(90deg, #f7971e, #ffd200);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 24px;
}
.card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
}
.card h3 {
  margin-bottom: 12px;
  color: #ffd200;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.stat {
  background: rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 12px 16px;
  flex: 1;
  min-width: 140px;
}
.stat .label { font-size: 0.75rem; color: #888; }
.stat .value { font-size: 1.1rem; font-weight: 600; color: #fff; margin-top: 4px; }
button {
  background: linear-gradient(135deg, #f7971e, #ffd200);
  color: #1a1a2e;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
button:hover { opacity: 0.85; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
.danger { background: linear-gradient(135deg, #e74c3c, #c0392b); }
.secondary { background: rgba(255,255,255,0.15); color: #e0e0e0; }
input {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  width: 100%;
}
input:focus { border-color: #ffd200; }
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}
.badge-test { background: #e67e22; color: #fff; }
.badge-vrf { background: #2ecc71; color: #fff; }
.badge-paused { background: #e74c3c; color: #fff; }
.divider { border-top: 1px solid rgba(255,255,255,0.1); margin: 16px 0; }
.note { font-size: 0.75rem; color: #888; margin-top: 8px; }
.log-list {
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.8rem;
  font-family: 'Courier New', monospace;
}
.log-entry { padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.log-entry.win { color: #2ecc71; }
.log-entry.buy { color: #3498db; }
.log-entry.draw { color: #f7971e; }
</style>