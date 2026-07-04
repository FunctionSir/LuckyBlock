<script setup>
import { useContract } from '../composables/useContract.js'

const { logs } = useContract()
</script>

<template>
  <div class="card">
    <h3>事件日志</h3>
    <div class="log-list">
      <div v-if="logs.length === 0" class="log-entry">等待事件...</div>
      <div v-for="(log, i) in logs" :key="i" :class="['log-entry', log.type]">
        [{{ log.time }}] {{ log.msg }}
      </div>
    </div>
  </div>
</template>