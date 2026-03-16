<!-- web/src/views/admin/AdminAccounts.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="section-title" style="margin-bottom:0">👥 账号管理</div>
      <router-link to="/admin" class="btn btn-ghost" style="font-size:13px">← 返回</router-link>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="section-title" style="font-size:15px">创建子管理员</div>
      <input class="input" v-model="form.username" placeholder="用户名" style="margin-bottom:10px"/>
      <input class="input" v-model="form.password" type="password" placeholder="密码" style="margin-bottom:10px"/>
      <select v-model="form.role" class="input" style="margin-bottom:10px">
        <option value="printer_op">打印机管理员</option>
        <option value="shop_op">商城管理员</option>
      </select>
      <button class="btn btn-primary" @click="create">➕ 创建</button>
    </div>
    <div v-for="a in admins" :key="a.id" class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <span style="font-size:24px">👤</span>
        <div style="flex:1">
          <div style="font-weight:700">{{ a.username }}</div>
          <div style="font-size:13px;color:var(--muted)">{{ roleLabel[a.role] }}</div>
        </div>
        <span :class="['badge', a.role==='super'?'badge-online':a.role==='printer_op'?'badge-busy':'badge-offline']">{{ roleLabel[a.role] }}</span>
      </div>
      <div v-if="a.role==='printer_op'" style="font-size:13px">
        <div style="margin-bottom:4px;font-weight:600">分配打印机：</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
          <label v-for="p in allPrinters" :key="p.id" style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
            <input type="checkbox" :value="p.id" v-model="a.assignedPrinters"/>
            {{ p.name }}
          </label>
        </div>
        <button class="btn btn-ghost" style="padding:4px 12px;font-size:12px" @click="saveAccess(a)">保存权限</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const admins = ref([]), allPrinters = ref([])
const form = ref({ username:'', password:'', role:'printer_op' })
const roleLabel = { super:'超级管理员', printer_op:'打印机管理员', shop_op:'商城管理员' }

onMounted(async () => {
  const [{ data: a }, { data: p }] = await Promise.all([
    api.get('/api/admin/admins'),
    api.get('/api/printers')
  ])
  admins.value = a.map(x => ({ ...x, assignedPrinters: [] }))
  allPrinters.value = p
})

async function create() {
  await api.post('/api/admin/admins', form.value)
  const { data } = await api.get('/api/admin/admins')
  admins.value = data.map(x => ({ ...x, assignedPrinters: [] }))
  form.value = { username:'', password:'', role:'printer_op' }
}

async function saveAccess(a) {
  await api.put(`/api/admin/admins/${a.id}/access`, { printer_ids: a.assignedPrinters })
  alert('权限已保存')
}
</script>
