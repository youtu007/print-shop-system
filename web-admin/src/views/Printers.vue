<template>
  <div class="printers-page">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">打印机管理</h1>
        <p class="page-sub">管理打印设备状态与连接配置</p>
      </div>
      <button v-if="isSuper && activeTab === 'printers'" class="btn-primary" @click="showAddModal = true">
        + 添加打印机
      </button>
    </div>

    <!-- Tab 切换 -->
    <div class="tabs-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'printers' }" @click="activeTab = 'printers'">打印机</button>
      <button class="tab-btn" :class="{ active: activeTab === 'prices' }" @click="activeTab = 'prices'; loadPrices()">收费标准</button>
    </div>

    <!-- 打印机列表 -->
    <div v-if="activeTab === 'printers'" class="printer-grid">
      <div
        v-for="printer in printers"
        :key="printer.id"
        class="printer-card"
        :class="{ inactive: !printer.is_active }"
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

        <!-- 连接信息 -->
        <div class="connection-info" v-if="printer.ip_address || printer.connection_type">
          <span class="conn-badge" :class="printer.connection_type">{{ connectionTypeText(printer.connection_type) }}</span>
          <span class="conn-badge type">{{ printerTypeText(printer.printer_type) }}</span>
          <span v-if="printer.ip_address" class="conn-ip">{{ printer.ip_address }}</span>
        </div>

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

    <div v-if="printers.length === 0 && !loading && activeTab === 'printers'" class="empty-tip">
      暂无打印机数据
    </div>

    <!-- 收费标准 -->
    <div v-if="activeTab === 'prices'" class="prices-section">
      <div v-if="pricesLoading" class="empty-tip">加载中...</div>
      <template v-else>
        <div class="prices-card">
          <div class="prices-section-title">照片打印价格（元 / 张）</div>
          <div class="prices-grid">
            <div v-for="item in pricePhotoItems" :key="item.key" class="price-item">
              <label class="price-label">{{ item.label }}</label>
              <div class="price-input-wrap">
                <span class="price-prefix">¥</span>
                <input v-model="item.val" type="number" step="0.1" min="0" class="price-input" />
              </div>
            </div>
          </div>
        </div>

        <div class="prices-card">
          <div class="prices-section-title">文件打印价格（元 / 张）</div>
          <div class="prices-grid">
            <div v-for="item in priceDocItems" :key="item.key" class="price-item">
              <label class="price-label">{{ item.label }}</label>
              <div class="price-input-wrap">
                <span class="price-prefix">¥</span>
                <input v-model="item.val" type="number" step="0.1" min="0" class="price-input" />
              </div>
            </div>
          </div>
        </div>

        <div class="prices-actions">
          <button class="btn-primary" :disabled="pricesSaving" @click="savePrices">
            {{ pricesSaving ? '保存中...' : '保存收费标准' }}
          </button>
          <span v-if="pricesSaveOk" class="save-ok">✓ 已保存</span>
        </div>
      </template>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showAddModal || showEditModal" class="modal-mask" @click.self="closeModal">
      <div class="modal modal-wide">
        <div class="modal-title">{{ showEditModal ? '编辑打印机' : '添加打印机' }}</div>
        <form @submit.prevent="submitPrinter" class="modal-form">
          <div class="form-row">
            <div class="field">
              <label class="field-label">打印机名称</label>
              <input v-model="form.name" class="input" placeholder="例如：前台打印机" required />
            </div>
            <div class="field">
              <label class="field-label">位置</label>
              <input v-model="form.location" class="input" placeholder="例如：店铺门口" required />
            </div>
          </div>

          <div class="form-section-title">连接配置</div>

          <div class="form-row">
            <div class="field">
              <label class="field-label">连接方式</label>
              <select v-model="form.connection_type" class="input">
                <option value="network">网络打印机</option>
                <option value="bluetooth">蓝牙打印机</option>
                <option value="usb">USB直连</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">打印机类型</label>
              <select v-model="form.printer_type" class="input">
                <option value="doc">文档打印</option>
                <option value="photo">照片打印</option>
                <option value="both">文档+照片</option>
              </select>
            </div>
          </div>

          <div class="field" v-if="form.connection_type === 'network'">
            <label class="field-label">IP地址</label>
            <div class="input-with-btn">
              <input v-model="form.ip_address" class="input" placeholder="例如：192.168.1.100" />
              <button type="button" class="btn-outline" @click="testConnection" :disabled="testing || !form.ip_address">
                {{ testing ? '测试中...' : '测试' }}
              </button>
            </div>
            <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
              {{ testResult.message }}
            </div>
          </div>

          <div class="form-row">
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
          </div>

          <div class="field field-checkbox">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.is_active" />
              <span>启用打印机</span>
            </label>
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

// Tab
const activeTab = ref('printers')

// 收费标准
const pricesLoading = ref(false)
const pricesSaving = ref(false)
const pricesSaveOk = ref(false)

const DEFAULT_PHOTO = { '1寸': 0.5, '2寸': 0.8, '3寸': 1.5, '5寸': 3.0, '6寸': 5.0, 'A4': 8.0 }
const DEFAULT_DOC = { color: 2.0, bw: 0.5 }

const pricePhotoItems = ref(
  Object.entries(DEFAULT_PHOTO).map(([key, val]) => ({ key, label: key, val: String(val) }))
)
const priceDocItems = ref([
  { key: 'color', label: '彩印', val: '2.00' },
  { key: 'bw', label: '黑白', val: '0.50' }
])

const loadPrices = async () => {
  pricesLoading.value = true
  try {
    const p = await api.get('/print/prices')
    const ph = p.photo || DEFAULT_PHOTO
    const dc = p.doc || DEFAULT_DOC
    pricePhotoItems.value = Object.keys(DEFAULT_PHOTO).map(k => ({ key: k, label: k, val: String(ph[k] ?? DEFAULT_PHOTO[k]) }))
    priceDocItems.value = [
      { key: 'color', label: '彩印', val: String(dc.color ?? 2) },
      { key: 'bw', label: '黑白', val: String(dc.bw ?? 0.5) }
    ]
  } catch {}
  pricesLoading.value = false
}

const savePrices = async () => {
  const photo = {}
  for (const item of pricePhotoItems.value) {
    const v = parseFloat(item.val)
    if (isNaN(v) || v < 0) return alert(`${item.label} 价格无效`)
    photo[item.key] = v
  }
  const doc = {}
  for (const item of priceDocItems.value) {
    const v = parseFloat(item.val)
    if (isNaN(v) || v < 0) return alert(`${item.label} 价格无效`)
    doc[item.key] = v
  }
  pricesSaving.value = true
  try {
    await api.put('/print/prices', { photo, doc })
    pricesSaveOk.value = true
    setTimeout(() => { pricesSaveOk.value = false }, 3000)
  } catch (err) {
    alert(err?.error || '保存失败')
  }
  pricesSaving.value = false
}

const loading = ref(true)
const printers = ref([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const submitting = ref(false)
const testing = ref(false)
const testResult = ref(null)
const form = ref({
  id: '',
  name: '',
  location: '',
  paper_remaining: 100,
  status: 'online',
  ip_address: '',
  printer_type: 'doc',
  connection_type: 'network',
  is_active: true
})

const statusText = (status) => {
  const map = { online: '在线', busy: '忙碌', offline: '离线' }
  return map[status] || status
}

const connectionTypeText = (type) => {
  const map = { network: '网络', bluetooth: '蓝牙', usb: 'USB' }
  return map[type] || type
}

const printerTypeText = (type) => {
  const map = { doc: '文档', photo: '照片', both: '文档+照片' }
  return map[type] || type
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

const testConnection = async () => {
  testing.value = true
  testResult.value = null
  try {
    const res = await api.post('/printers/test', {
      ip_address: form.value.ip_address,
      connection_type: form.value.connection_type
    })
    testResult.value = res
  } catch (err) {
    testResult.value = { success: false, message: err?.error || '测试失败' }
  } finally {
    testing.value = false
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  form.value = { id: '', name: '', location: '', paper_remaining: 100, status: 'online', ip_address: '', printer_type: 'doc', connection_type: 'network', is_active: true }
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

/* 连接信息 */
.connection-info {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.conn-badge {
  font-size: var(--font-xs);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-input);
  color: var(--color-text-secondary);
}

.conn-badge.network { background: var(--color-primary-bg); color: var(--color-primary); }
.conn-badge.bluetooth { background: var(--color-info-bg); color: var(--color-info); }
.conn-badge.usb { background: var(--color-warning-bg); color: var(--color-warning); }
.conn-badge.type { background: var(--color-success-bg); color: var(--color-success); }

.conn-ip {
  font-size: var(--font-xs);
  color: var(--color-text-tertiary);
  font-family: monospace;
}

/* 弹窗宽度 */
.modal-wide {
  max-width: 560px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.form-section-title {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: var(--space-lg) 0 var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.field-checkbox {
  margin-top: var(--space-md);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}

.printer-card.inactive {
  opacity: 0.5;
}

.input-with-btn {
  display: flex;
  gap: var(--space-sm);
}

.input-with-btn .input {
  flex: 1;
}

.btn-outline {
  padding: 0 var(--space-md);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-sm);
  cursor: pointer;
  white-space: nowrap;
}

.btn-outline:hover:not(:disabled) {
  background: var(--color-primary-bg);
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-result {
  margin-top: var(--space-sm);
  font-size: var(--font-sm);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
}

.test-result.success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.test-result.error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

/* Tab */
.tabs-bar {
  display: flex;
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: 4px;
  margin-bottom: var(--space-xl);
  box-shadow: var(--shadow-sm);
  width: fit-content;
  gap: 4px;
}

.tab-btn {
  padding: 8px 24px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--color-primary);
  color: #fff;
}

/* 收费标准 */
.prices-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.prices-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
}

.prices-section-title {
  font-size: var(--font-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.prices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-lg);
}

.price-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.price-label {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.price-input-wrap {
  display: flex;
  align-items: center;
  background: var(--color-bg-input);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  padding: 0 var(--space-md);
  transition: border-color 0.2s;
}

.price-input-wrap:focus-within {
  border-color: var(--color-primary);
}

.price-prefix {
  color: var(--color-primary);
  font-weight: 700;
  margin-right: 4px;
}

.price-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--color-text-primary);
  outline: none;
  width: 0;
}

.prices-actions {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.save-ok {
  font-size: var(--font-sm);
  color: var(--color-success);
  font-weight: 600;
}
</style>
