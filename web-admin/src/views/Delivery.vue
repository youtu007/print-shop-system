<template>
  <div class="delivery-page">
    <div class="page-header">
      <h1 class="page-title">配送管理</h1>
      <p class="page-sub">管理配送流程</p>
    </div>

    <!-- 配送状态 Tab -->
    <div class="tab-bar">
      <div
        class="tab-item"
        :class="{ active: currentTab === 'packing' }"
        @click="currentTab = 'packing'"
      >
        待发货
        <span v-if="countByStatus('packing')" class="tab-count">{{ countByStatus('packing') }}</span>
      </div>
      <div
        class="tab-item"
        :class="{ active: currentTab === 'shipping' }"
        @click="currentTab = 'shipping'"
      >
        配送中
        <span v-if="countByStatus('shipping')" class="tab-count">{{ countByStatus('shipping') }}</span>
      </div>
      <div
        class="tab-item"
        :class="{ active: currentTab === 'delivered' }"
        @click="currentTab = 'delivered'"
      >
        已送达
      </div>
    </div>

    <!-- 订单列表 -->
    <div class="card">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="filteredOrders.length === 0" class="empty-tip">暂无订单</div>
      <div v-else class="order-list">
        <div v-for="order in filteredOrders" :key="order.id" class="order-card">
          <div class="order-header">
            <span class="order-id">订单号: {{ order.id.slice(0, 8) }}</span>
            <span class="order-time">{{ formatTime(order.created_at) }}</span>
          </div>

          <div class="order-customer">
            <span class="customer-name">{{ order.customer_name }}</span>
            <span class="customer-phone">{{ order.phone }}</span>
          </div>

          <div class="order-items">
            <div v-for="(item, idx) in order.items" :key="idx" class="item-row">
              {{ item.name }} x{{ item.qty }}
            </div>
          </div>

          <div class="order-footer">
            <span class="order-total">¥{{ order.total_price }}</span>
            <div class="order-actions">
              <span v-if="!order.is_paid" class="unpaid-tip">待付款</span>
              <button
                v-if="order.is_paid && order.delivery_status !== 'delivered'"
                class="btn-primary"
                @click="updateStatus(order)"
              >
                {{ order.delivery_status === 'packing' ? '确认发货' : '确认送达' }}
              </button>
              <button class="btn-danger" @click="deleteOrder(order)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const loading = ref(true)
const orders = ref([])
const currentTab = ref('packing')

const filteredOrders = computed(() => {
  return orders.value.filter(o => o.delivery_status === currentTab.value)
})

const countByStatus = (status) => {
  return orders.value.filter(o => o.delivery_status === status).length
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

const deleteOrder = async (order) => {
  if (!confirm(`确定删除订单「${order.customer_name}」？此操作不可恢复。`)) return
  try {
    await api.delete(`/shop/orders/${order.id}`)
    await loadOrders()
  } catch (err) {
    alert(err?.error || '删除失败')
  }
}

const updateStatus = async (order) => {
  let newStatus
  if (order.delivery_status === 'packing') {
    newStatus = 'shipping'
  } else if (order.delivery_status === 'shipping') {
    newStatus = 'delivered'
  }

  if (!newStatus) return

  try {
    await api.put(`/shop/orders/${order.id}`, { delivery_status: newStatus })
    await loadOrders()
  } catch (err) {
    alert(err?.error || '操作失败')
  }
}

onMounted(loadOrders)
</script>

<style scoped>
.tab-bar {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-sm);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  position: relative;
}

.tab-item.active {
  background: var(--color-primary);
  color: white;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--color-error);
  color: white;
  font-size: 12px;
  border-radius: 10px;
  margin-left: var(--space-xs);
}

.tab-item.active .tab-count {
  background: white;
  color: var(--color-primary);
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.order-card {
  background: var(--color-bg-input);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.order-id {
  font-family: monospace;
  font-weight: 600;
  color: var(--color-primary);
}

.order-time {
  font-size: var(--font-sm);
  color: var(--color-text-tertiary);
}

.order-customer {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.customer-name {
  font-weight: 600;
}

.customer-phone {
  color: var(--color-text-secondary);
}

.order-items {
  margin-bottom: var(--space-md);
}

.item-row {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  padding: 2px 0;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.order-total {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-error);
}

.order-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.unpaid-tip {
  font-size: var(--font-sm);
  color: var(--color-warning);
}

.loading {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-tertiary);
}
</style>
