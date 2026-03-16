<!-- web/src/views/admin/AdminOrders.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="section-title" style="margin-bottom:0">📦 订单管理</div>
      <router-link to="/admin" class="btn btn-ghost" style="font-size:13px">← 返回</router-link>
    </div>
    <div v-for="o in orders" :key="o.id" class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:700">{{ o.customer_name }} · {{ o.phone }}</span>
        <span :class="['badge', statusClass[o.delivery_status]]">{{ statusLabel[o.delivery_status] }}</span>
      </div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">📍 {{ o.address }}</div>
      <div style="font-size:13px;margin-bottom:10px">{{ o.items?.map(i=>i.name+'×'+i.qty).join('、') }} · ¥{{ o.total_price?.toFixed(1) }}</div>
      <div style="display:flex;gap:8px">
        <button v-if="o.delivery_status==='packing'" class="btn btn-primary" style="font-size:13px;padding:6px 14px" @click="update(o,'shipping')">→ 配送中</button>
        <button v-if="o.delivery_status==='shipping'" class="btn btn-green" style="font-size:13px;padding:6px 14px" @click="update(o,'delivered')">→ 已送达</button>
        <span v-if="o.delivery_status==='delivered'" style="color:#27ae60;font-size:13px;font-weight:600">✅ 已完成</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const orders = ref([])
const statusLabel = { packing:'配货中', shipping:'配送中', delivered:'已送达' }
const statusClass = { packing:'badge-busy', shipping:'badge-online', delivered:'badge-offline' }

onMounted(async () => {
  const { data } = await api.get('/api/shop/orders')
  orders.value = data
})

async function update(o, status) {
  await api.put(`/api/shop/orders/${o.id}`, { delivery_status: status })
  o.delivery_status = status
}
</script>
