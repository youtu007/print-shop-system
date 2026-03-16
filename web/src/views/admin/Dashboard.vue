<!-- web/src/views/admin/Dashboard.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div class="section-title" style="margin-bottom:0">📊 管理后台</div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="color:var(--muted);font-size:14px">{{ auth.username }} ({{ roleLabel[auth.role] }})</span>
        <button class="btn btn-ghost" style="padding:6px 14px;font-size:13px" @click="logout">退出</button>
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:28px">
      <div v-for="stat in stats" :key="stat.label" class="card stat-card">
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-num">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
    <div class="admin-nav">
      <router-link v-for="link in links" :key="link.to" :to="link.to" class="card admin-link">
        {{ link.icon }} {{ link.label }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import api from '../../api'

const router = useRouter(), auth = useAuthStore()
const data = ref({})
const roleLabel = { super:'超级管理员', printer_op:'打印机管理员', shop_op:'商城管理员' }

onMounted(async () => {
  const { data: d } = await api.get('/api/admin/dashboard')
  data.value = d
})

const stats = computed(() => [
  { icon:'🟢', label:'在线打印机', value: data.value.online_printers ?? '-' },
  { icon:'📄', label:'今日打印任务', value: data.value.today_jobs ?? '-' },
  { icon:'📦', label:'待处理订单', value: data.value.pending_orders ?? '-' },
  { icon:'📸', label:'相片编组', value: data.value.total_groups ?? '-' },
])

const links = computed(() => {
  const all = [
    { to:'/admin/printers', icon:'🖨️', label:'打印机管理' },
    { to:'/admin/groups', icon:'📸', label:'相片编组' },
    { to:'/admin/orders', icon:'📦', label:'订单管理' },
    { to:'/admin/accounts', icon:'👥', label:'账号管理' },
  ]
  if (auth.role === 'shop_op') return all.filter(l => l.to === '/admin/orders')
  if (auth.role === 'printer_op') return all.filter(l => l.to !== '/admin/orders' && l.to !== '/admin/accounts')
  return all
})

async function logout() { auth.logout(); router.push('/admin/login') }
</script>

<style scoped>
.stat-card { text-align:center; }
.stat-icon { font-size:32px; margin-bottom:8px; }
.stat-num { font-size:36px; font-weight:900; color:var(--primary); }
.stat-label { color:var(--muted); font-size:14px; margin-top:4px; }
.admin-nav { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
.admin-link { text-decoration:none; color:var(--text); font-weight:600; font-size:16px; text-align:center; padding:24px; cursor:pointer; }
.admin-link:hover { background:#fff7f0; }
</style>
