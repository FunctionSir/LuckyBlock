<script setup>
import { useContract } from '../composables/useContract.js'

const { account, network, connectWallet } = useContract()
</script>

<template>
  <div class="card">
    <div class="row">
      <button v-if="!account" @click="connectWallet">连接 MetaMask</button>
      <span v-else style="font-size:0.85rem; color:#888;">
        已连接: {{ account.slice(0, 6) }}...{{ account.slice(-4) }}
      </span>
      <span v-if="network" :class="['badge', network === 'Sepolia' ? 'badge-vrf' : 'badge-test']">
        {{ network }}
      </span>
    </div>
  </div>
</template>