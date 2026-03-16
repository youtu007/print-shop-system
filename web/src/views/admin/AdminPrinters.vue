<!-- web/src/views/admin/AdminPrinters.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="section-title" style="margin-bottom:0">🖨️ 打印机管理</div>
      <router-link to="/admin" class="btn btn-ghost" style="font-size:13px">← 返回</router-link>
    </div>
    <div class="grid-2">
      <div v-for="p in printers" :key="p.id" class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-weight:700">{{ p.name }}</span>
          <span :class="['badge','badge-'+p.status]">{{ statusLabel[p.status] }}</span>
        </div>
        <div style="color:var(--muted);font-size:13px;margin-bottom:10px">📍 {{ p.location }}</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <select v-model="p.status" class="input" style="flex:1;padding:6px 10px;font-size:13px" @change="updateStatus(p)">
            <option value="online">在线</option>
            <option value="offline">离线</option>
            <option value="busy">忙碌</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px">
          <span>📄 剩余：</span>
          <input type="number" v-model.number="p.paper_remaining" class="input" style="flex:1;padding:6px 10px;font-size:13px"/>
          <button class="btn btn-green" style="padding:6px 12px;font-size:12px" @click="updatePaper(p)">更新</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const printers = ref([])
const statusLabel = { online:'在线', offline:'离线', busy:'忙碌' }

onMounted(async () => {
  const { data } = await api.get('/api/printers')
  printers.value = data
})

async function updateStatus(p) {
  await api.put(`/api/printers/${p.id}`, { status: p.status })
}

async function updatePaper(p) {
  await api.put(`/api/printers/${p.id}`, { paper_remaining: p.paper_remaining })
  alert('已更新')
}
</script>
