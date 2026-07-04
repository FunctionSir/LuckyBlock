<script setup>
import { ref, computed } from 'vue'
import { ethers } from 'ethers'
import { useContract } from '../composables/useContract.js'

const {
  isPaused, testMode, platformBalance, roundFee,
  requestDraw, drawWinner, withdrawFee, togglePause,
  addManager, removeManager
} = useContract()

const randomInput = ref('12345')
const managerAddr = ref('')

const platformBalanceEth = computed(() => ethers.formatEther(platformBalance.value))
const roundFeeEth = computed(() => ethers.formatEther(roundFee.value))

function handleDrawForTest() {
  if (!randomInput.value) return alert('请输入随机数')
  drawWinner(randomInput.value)
}

function handleAddManager() {
  if (!ethers.isAddress(managerAddr.value)) return alert('无效地址')
  addManager(managerAddr.value)
  managerAddr.value = ''
}

function handleRemoveManager() {
  if (!ethers.isAddress(managerAddr.value)) return alert('无效地址')
  removeManager(managerAddr.value)
  managerAddr.value = ''
}
</script>

<template>
  <div class="card">
    <h3>管理员面板</h3>

    <div class="row" style="margin-bottom:12px;">
      <div class="stat"><div class="label">平台费余额 (ETH)</div><div class="value">{{ platformBalanceEth }}</div></div>
      <div class="stat"><div class="label">当前轮次平台费 (ETH)</div><div class="value">{{ roundFeeEth }}</div></div>
    </div>

    <div style="margin-bottom:12px;">
      <div style="font-size:0.85rem; margin-bottom:6px; color:#888;">开奖操作</div>
      <div class="row">
        <button :disabled="testMode" @click="requestDraw">请求 Chainlink 开奖</button>
        <button :disabled="!testMode" @click="handleDrawForTest">VM 测试开奖</button>
        <input v-model="randomInput" placeholder="随机数 (测试模式)" style="width:160px; flex:none;">
      </div>
      <div class="note">
        {{ testMode ? '当前为 VM 测试模式，使用 "VM 测试开奖" 按钮' : '当前为 Chainlink VRF 模式，调用 requestDraw 后等待 Chainlink 回调' }}
      </div>
    </div>

    <div class="divider"></div>

    <div class="row">
      <button class="secondary" @click="withdrawFee">提取平台费</button>
      <button class="danger" @click="togglePause">{{ isPaused ? '恢复' : '暂停' }}</button>
    </div>

    <div class="divider"></div>

    <div class="row">
      <input v-model="managerAddr" placeholder="管理员地址" style="flex:1;">
      <button class="secondary" @click="handleAddManager">添加管理员</button>
      <button class="secondary" @click="handleRemoveManager">移除管理员</button>
    </div>
  </div>
</template>