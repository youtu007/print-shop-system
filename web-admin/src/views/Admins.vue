<template>
  <div class="admins-page">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">管理员管理</h1>
        <p class="page-sub">管理管理员账号和权限</p>
      </div>
      <button class="btn-primary" @click="openModal()">+ 添加管理员</button>
    </div>

    <!-- 管理员列表 -->
    <div class="card">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="admins.length === 0" class="empty-tip">暂无管理员</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>账号</th>
            <th>角色</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="admin in admins" :key="admin.id">
            <td>
              <div class="admin-info">
                <span class="admin-avatar">{{ admin.username.charAt(0) }}</span>
                <span class="admin-name">{{ admin.username }}</span>
              </div>
            </td>
            <td>
              <span class="badge" :class="roleBadge(admin.role)">
                {{ roleText(admin.role) }}
              </span>
            </td>
            <td>{{ formatTime(admin.created_at) }}</td>
            <td>
              <button v-if="admin.role === 'printer_op'" class="btn-ghost" @click="openAccessModal(admin)">权限</button>
              <button
                v-if="admin.id !== currentAdminId"
                class="btn-danger"
                @click="deleteAdmin(admin.id)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 添加管理员弹窗 -->
    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-title">添加管理员</div>
        <form @submit.prevent="submitAdmin" class="modal-form">
          <div class="field">
            <label class="field-label">账号</label>
            <input v-model="form.username" class="input" required />
          </div>
          <div class="field">
            <label class="field-label">密码</label>
            <input v-model="form.password" type="password" class="input" required />
          </div>
          <div class="field">
            <label class="field-label">角色</label>
            <select v-model="form.role" class="input">
              <option value="super">超级管理员</option>
              <option value="printer_op">打印操作员</option>
              <option value="shop_op">商城管理员</option>
              <option value="delivery_op">配送管理员</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="showModal = false">取消</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 权限分配弹窗 -->
    <div v-if="showAccessModal" class="modal-mask" @click.self="showAccessModal = false">
      <div class="modal">
        <div class="modal-title">分配打印机权限 - {{ editingAdmin?.username }}</div>
        <div class="printer-list">
          <label v-for="printer in printers" :key="printer.id" class="printer-item">
            <input
              type="checkbox"
              :value="printer.id"
              v-model="selectedPrinters"
            />
            <span>{{ printer.name }}</span>
            <span class="text-secondary text-sm">{{ printer.location }}</span>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showAccessModal = false">取消</button>
          <button class="btn-primary" @click="saveAccess" :disabled="savingAccess">
            {{ savingAccess ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const authStore = useAuthStore()
const currentAdminId = authStore.token.value

const loading = ref(true)
const admins = ref([])
const printers = ref([])
const showModal = ref(false)
const showAccessModal = ref(false)
const editingAdmin = ref(null)
const submitting = ref(false)
const savingAccess = ref(false)
const selectedPrinters = ref([])
const form = ref({
  username: '',
  password: '',
  role: 'printer_op'
})

const roleBadge = (role) => {
  const map = {
    super: 'badge-error',
    printer_op: 'badge-info',
    shop_op: 'badge-success',
    delivery_op: 'badge-warning'
  }
  return map[role] || 'badge-info'
}

const roleText = (role) => {
  const map = {
    super: '超管',
    printer_op: '打印操作',
    shop_op: '商城管理',
    delivery_op: '配送管理'
  }
  return map[role] || role
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const loadData = async () => {
  try {
    const [adminsRes, printersRes] = await Promise.all([
      api.get('/admin/admins'),
      api.get('/printers')
    ])
    admins.value = adminsRes
    printers.value = printersRes
  } catch (err) {
    console.error('Failed to load data:', err)
  } finally {
    loading.value = false
  }
}

const openModal = () => {
  form.value = { username: '', password: '', role: 'printer_op' }
  showModal.value = true
}

const submitAdmin = async () => {
  submitting.value = true
  try {
    await api.post('/admin/admins', form.value)
    await loadData()
    showModal.value = false
  } catch (err) {
    alert(err?.error || '添加失败')
  } finally {
    submitting.value = false
  }
}

const deleteAdmin = async (id) => {
  if (!confirm('确定要删除这个管理员吗？')) return
  try {
    await api.delete(`/admin/admins/${id}`)
    await loadData()
  } catch (err) {
    alert(err?.error || '删除失败')
  }
}

const openAccessModal = async (admin) => {
  editingAdmin.value = admin
  try {
    const access = await api.get(`/admin/admins/${admin.id}/access`)
    selectedPrinters.value = access
  } catch (err) {
    selectedPrinters.value = []
  }
  showAccessModal.value = true
}

const saveAccess = async () => {
  savingAccess.value = true
  try {
    await api.put(`/admin/admins/${editingAdmin.value.id}/access`, {
      printer_ids: selectedPrinters.value
    })
    showAccessModal.value = false
  } catch (err) {
    alert(err?.error || '保存失败')
  } finally {
    savingAccess.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.admin-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.admin-name {
  font-weight: 600;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  width: 100%;
  max-width: 450px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-title {
  font-size: var(--font-lg);
  font-weight: 700;
  margin-bottom: var(--space-xl);
}

.modal-form .field {
  margin-bottom: var(--space-lg);
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-xl);
}

select.input {
  cursor: pointer;
}

.printer-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-height: 300px;
  overflow-y: auto;
}

.printer-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-input);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.printer-item input {
  width: 18px;
  height: 18px;
}

.loading {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-tertiary);
}
</style>
