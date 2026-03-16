<!-- web/src/views/OrderStatus.vue -->
<template>
  <div class="page">
    <div class="section-title">📦 订单状态</div>
    <div v-if="order" class="card" style="max-width:480px;margin:0 auto">
      <div style="margin-bottom:20px">
        <div style="font-weight:700;font-size:17px;margin-bottom:4px">订单 #{{ order.id.slice(0,8) }}</div>
        <div style="color:var(--muted);font-size:13px">{{ order.customer_name }} · {{ order.phone }}</div>
        <div style="color:var(--muted);font-size:13px">{{ order.address }}</div>
      </div>
      <div class="steps">
        <div v-for="(step,i) in steps" :key="step.key" :class="['step', stepIndex >= i ? 'active' : '']">
          <div class="step-dot">{{ step.icon }}</div>
          <div class="step-label">{{ step.label }}</div>
        </div>
      </div>
      <div style="margin-top:16px;font-size:14px;color:var(--muted)">
        商品：{{ order.items.map(i=>i.name+'×'+i.qty).join('、') }}
      </div>
      <div style="font-weight:700;margin-top:8px">合计：¥{{ order.total_price?.toFixed(1) }}</div>
    </div>
    <div v-else class="card" style="max-width:480px;margin:0 auto;text-align:center;padding:40px;color:var(--muted)">
      加载中...
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api'

const route = useRoute()
const order = ref(null)
const steps = [
  { key:'packing', icon:'📦', label:'配货中' },
  { key:'shipping', icon:'🚚', label:'配送中' },
  { key:'delivered', icon:'✅', label:'已送达' },
]
const stepIndex = computed(() => steps.findIndex(s => s.key === order.value?.delivery_status))

onMounted(async () => {
  const { data } = await api.get(`/api/shop/orders/${route.params.id}`)
  order.value = data
})
</script>

<style scoped>
.steps { display:flex; justify-content:space-between; position:relative; padding:10px 0; }
.steps::before { content:''; position:absolute; top:24px; left:10%; right:10%; height:3px; background:#eee; }
.step { display:flex; flex-direction:column; align-items:center; gap:6px; flex:1; position:relative; z-index:1; }
.step-dot { width:40px; height:40px; border-radius:50%; background:#eee; display:flex; align-items:center; justify-content:center; font-size:18px; transition:background .3s; }
.step.active .step-dot { background:var(--green); }
.step-label { font-size:13px; font-weight:600; color:var(--muted); }
.step.active .step-label { color:var(--green); }
</style>
