<template>
  <div class="printers-page">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">打印机管理</h1>
        <p class="page-sub">管理打印设备状态</p>
      </div>
      <button v-if="isSuper" class="btn-primary" @click="showAddModal = true">
        + 添加打印机
      </button>
    </div>

    <!-- 打印机列表 -->
    <div class="printer-grid">
      <div
        v-for="printer in printers"
        :key="printer.id"
        class="printer-card"
      >
        <div class="printer-header">
          <div class="printer-status">
            <span class="pulse-dot" :class="{ offline: printer.status !== 'online' }"></span>
            <span class="status-text">{{ statusText(printer.status) }}</span>
          </div>
          <div class="printer-actions" v-if="isSuper">
            <button class="btn-ghost" @click="editPrinter(printer)">编辑</button>
            <button class="btn-danger" @click="deletePrinter(printer.id)">删除</button>
          </div>
        </div>

        <div class="printer-name">{{ printer.name }}</div>
        <div class="printer-location">{{ printer.location }}</div>

        <div class="printer-paper">
          <div class="paper-label">
            <span>纸张剩余</span>
            <span>{{ printer.paper_remaining }}%</span>
          </div>
          <div class="paper-bar">
            <div class="paper-fill" :style="{ width: printer.paper_remaining + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="printers.length === 0 && !loading" class="empty-tip">
      暂无打印机数据
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showAddModal || showEditModal" class="modal-mask" @click.self="closeModal">
      <div class="modal">
        <div class="modal-title">{{ showEditModal ? '编辑打印机' : '添加打印机' }}</div>
        <form @submit.prevent="submitPrinter" class="modal-form">
          <div class="field">
            <label class="field-label">打印机名称</label>
            <input v-model="form.name" class="input" placeholder="例如：前台打印机" required />
          </div>
          <div class="field">
            <label class="field-label">位置</label>
            <input v-model="form.location" class="input" placeholder="例如：店铺门口" required />
          </div>
          <div class="field">
            <label class="field-label">纸张剩余 (%)</label>
            <input v-model.number="form.paper_remaining" type="number" class="input" min="0" max="100" required />
          </div>
          <div class="field">
            <label class="field-label">状态</label>
            <select v-model="form.status" class="input">
              <option value="online">在线</option>
              <option value="busy">忙碌</option>
              <option value="offline">离线</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const authStore = useAuthStore()
const isSuper = computed(() => authStore.role.value === 'super')

const loading = ref(true)
const printers = ref([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const submitting = ref(false)
const form = ref({
  id: '',
  name: '',
  location: '',
  paper_remaining: 100,
  status: 'online'
})

const statusText = (status) => {
  const map = { online: '在线', busy: '忙碌', offline: '离线' }
  return map[status] || status
}

const loadPrinters = async () => {
  try {
    printers.value = await api.get('/printers')
  } catch (err) {
    console.error('Failed to load printers:', err)
  } finally {
    loading.value = false
  }
}

const editPrinter = (printer) => {
  form.value = { ...printer }
  showEditModal.value = true
}

const deletePrinter = async (id) => {
  if (!confirm('确定要删除这台打印机吗？')) return
  try {
    await api.delete(`/printers/${id}`)
    await loadPrinters()
  } catch (err) {
    alert(err?.error || '删除失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  form.value = { id: '', name: '', location: '', paper_remaining: 100, status: 'online' }
}

const submitPrinter = async () => {
  submitting.value = true
  try {
    if (showEditModal.value) {
      await api.put(`/printers/${form.value.id}`, form.value)
    } else {
      await api.post('/printers', form.value)
    }
    await loadPrinters()
    closeModal()
  } catch (err) {
    alert(err?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadPrinters)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.printer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-lg);
}

.printer-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
}

.printer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.printer-status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.status-text {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.pulse-dot.offline {
  background: var(--color-text-tertiary);
}

.printer-actions {
  display: flex;
  gap: var(--space-sm);
}

.printer-name {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-xs);
}

.printer-location {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.printer-paper {
  background: var(--color-bg-input);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}

.paper-label {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.paper-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.paper-fill {
  height: 100%;
  background: var(--color-success);
  border-radius: var(--radius-pill);
  transition: width 0.3s;
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
  max-width: 400px;
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
</style>
