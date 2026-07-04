<script setup>
import { computed } from 'vue'
import { ethers } from 'ethers'
import { useContract } from '../composables/useContract.js'

const { round, playersCount, prizePool, ticketPrice, isPaused, testMode, buyTicket } = useContract()

const prizePoolEth = computed(() => ethers.formatEther(prizePool.value))
const ticketPriceEth = computed(() => ethers.formatEther(ticketPrice.value))
</script>

<template>
  <div class="card">
    <h3>
      当前状态
      <span v-if="testMode" class="badge badge-test">VM 测试模式</span>
      <span v-else class="badge badge-vrf">Chainlink VRF</span>
      <span v-if="isPaused" class="badge badge-paused">已暂停</span>
    </h3>
    <div class="row">
      <div class="stat"><div class="label">当前期数</div><div class="value">{{ round }}</div></div>
      <div class="stat"><div class="label">参与者</div><div class="value">{{ playersCount }}</div></div>
      <div class="stat"><div class="label">奖池 (ETH)</div><div class="value">{{ prizePoolEth }}</div></div>
      <div class="stat"><div class="label">票价 (ETH)</div><div class="value">{{ ticketPriceEth }}</div></div>
    </div>
    <div style="margin-top:12px;">
      <button :disabled="isPaused" @click="buyTicket">购买彩票</button>
    </div>
  </div>
</template>