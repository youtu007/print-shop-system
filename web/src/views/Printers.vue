<!-- web/src/views/Printers.vue -->
<template>
  <div class="page">
    <div class="section-title">🖨️ 打印机状态</div>
    <div class="grid-2">
      <div v-for="p in printers" :key="p.id" class="card printer-card">
        <div class="printer-header">
          <span class="printer-name">{{ p.name }}</span>
          <span :class="['badge','badge-'+p.status]">{{ statusLabel[p.status] }}</span>
        </div>
        <div class="printer-info">📍 {{ p.location }}</div>
        <div class="printer-paper">
          <span>📄 剩余纸张</span>
          <div class="paper-bar"><div class="paper-fill" :style="{width: Math.min(100, p.paper_remaining/5)+'%', background: p.paper_remaining<100?'#e74c3c':'#6BCB77'}"></div></div>
          <span class="paper-count">{{ p.paper_remaining }} 张</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
const printers = ref([])
const statusLabel = { online:'在线', offline:'离线', busy:'忙碌' }
onMounted(async () => {
  try { const { data } = await api.get('/api/printers/public'); printers.value = data }
  catch { printers.value = [] }
})
</script>

<style scoped>
.printer-card { display:flex; flex-direction:column; gap:10px; }
.printer-header { display:flex; justify-content:space-between; align-items:center; }
.printer-name { font-weight:700; font-size:17px; }
.printer-info { color:var(--muted); font-size:14px; }
.printer-paper { display:flex; align-items:center; gap:8px; font-size:13px; }
.paper-bar { flex:1; height:8px; background:#eee; border-radius:99px; overflow:hidden; }
.paper-fill { height:100%; border-radius:99px; transition:width .5s; }
.paper-count { min-width:40px; text-align:right; color:var(--muted); }
</style>
