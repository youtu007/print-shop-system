<template>
  <div class="orders-page">
    <div class="page-header">
      <h1 class="page-title">订单管理</h1>
      <p class="page-sub">管理商城订单和配送状态</p>
    </div>

    <!-- 订单列表 -->
    <div class="card">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="orders.length === 0" class="empty-tip">暂无订单</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>商品</th>
            <th>总价</th>
            <th>状态</th>
            <th>配送状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>
              <span class="order-id">{{ order.id.slice(0, 8) }}</span>
            </td>
            <td>
              <div class="order-items">
                <div v-for="(item, idx) in parseItems(order.items)" :key="idx" class="item-row">
                  {{ item.name }} x{{ item.quantity }}
                </div>
              </div>
            </td>
            <td>¥{{ order.total_price }}</td>
            <td>
              <span class="badge" :class="order.is_paid ? 'badge-success' : 'badge-warning'">
                {{ order.is_paid ? '已付款' : '待付款' }}
              </span>
            </td>
            <td>
              <span class="badge" :class="deliveryBadge(order.delivery_status)">
                {{ deliveryText(order.delivery_status) }}
              </span>
            </td>
            <td>{{ formatTime(order.created_at) }}</td>
            <td>
              <button
                v-if="order.is_paid && order.delivery_status !== 'delivered'"
                class="btn-ghost"
                @click="updateStatus(order)"
              >
                更新状态
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 更新状态弹窗 -->
    <div v-if="showStatusModal" class="modal-mask" @click.self="showStatusModal = false">
      <div class="modal">
        <div class="modal-title">更新配送状态</div>
        <div class="status-options">
          <button
            v-for="status in statusOptions"
            :key="status.value"
            class="status-btn"
            :class="{ active: newStatus === status.value }"
            @click="newStatus = status.value"
          >
            <span class="status-icon">{{ status.icon }}</span>
            <span class="status-label">{{ status.label }}</span>
          </button>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showStatusModal = false">取消</button>
          <button class="btn-primary" @click="confirmUpdate" :disabled="updating">
            {{ updating ? '更新中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const loading = ref(true)
const orders = ref([])
const showStatusModal = ref(false)
const updating = ref(false)
const currentOrder = ref(null)
const newStatus = ref('')

const statusOptions = [
  { value: 'packing', label: '配货中', icon: '📦' },
  { value: 'shipping', label: '配送中', icon: '🚚' },
  { value: 'delivered', label: '已送达', icon: '✅' }
]

const deliveryBadge = (status) => {
  const map = {
    pending: 'badge-warning',
    paid: 'badge-info',
    packing: 'badge-info',
    shipping: 'badge-warning',
    delivered: 'badge-success'
  }
  return map[status] || 'badge-info'
}

const deliveryText = (status) => {
  const map = {
    pending: '待付款',
    paid: '已付款',
    packing: '配货中',
    shipping: '配送中',
    delivered: '已送达'
  }
  return map[status] || status
}

const parseItems = (itemsStr) => {
  try {
    return JSON.parse(itemsStr)
  } catch {
    return []
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadOrders = async () => {
  try {
    orders.value = await api.get('/shop/orders')
  } catch (err) {
    console.error('Failed to load orders:', err)
  } finally {
    loading.value = false
  }
}

const updateStatus = (order) => {
  currentOrder.value = order
  // 状态流转: paid -> packing -> shipping -> delivered
  if (order.delivery_status === 'paid' || order.delivery_status === 'pending') {
    newStatus.value = 'packing'
  } else if (order.delivery_status === 'packing') {
    newStatus.value = 'shipping'
  } else if (order.delivery_status === 'shipping') {
    newStatus.value = 'delivered'
  }
  showStatusModal.value = true
}

const confirmUpdate = async () => {
  updating.value = true
  try {
    await api.put(`/shop/orders/${currentOrder.value.id}`, {
      delivery_status: newStatus.value
    })
    await loadOrders()
    showStatusModal.value = false
  } catch (err) {
    alert(err?.error || '更新失败')
  } finally {
    updating.value = false
  }
}

onMounted(loadOrders)
</script>

<style scoped>
.order-id {
  font-family: monospace;
  font-size: var(--font-sm);
  color: var(--color-primary);
}

.order-items {
  font-size: var(--font-sm);
}

.item-row {
  padding: 2px 0;
}

.status-options {
  display: flex;
  gap: var(--space-md);
  margin: var(--space-xl) 0;
}

.status-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  cursor: pointer;
  transition: all 0.2s;
}

.status-btn:hover {
  border-color: var(--color-primary);
}

.status-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.status-icon {
  font-size: 24px;
}

.status-label {
  font-size: var(--font-sm);
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-xl);
}

.loading {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-tertiary);
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
  box-shadow: var(--shadow-lg);
}

.modal-title {
  font-size: var(--font-lg);
  font-weight: 700;
}
</style>
