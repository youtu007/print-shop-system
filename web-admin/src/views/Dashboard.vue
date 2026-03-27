<template>
  <div class="dashboard">
    <!-- 头部 -->
    <div class="page-header">
      <h1 class="page-title">仪表盘</h1>
      <p class="page-sub">欢迎回来，{{ username }}</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-grid">
      <div class="skeleton-card" v-for="i in 4" :key="i">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div v-else class="stat-grid">
      <StatCard
        v-if="stats.online_printers !== undefined"
        icon="🖨️"
        :value="stats.online_printers"
        :suffix="`/${stats.total_printers}`"
        label="在线打印机"
        color="primary"
        :delay="1"
      />
      <StatCard
        v-if="stats.today_jobs !== undefined"
        icon="📄"
        :value="stats.today_jobs"
        label="今日任务"
        color="info"
        :delay="2"
      />
      <StatCard
        v-if="stats.total_groups !== undefined"
        icon="📷"
        :value="stats.total_groups"
        label="照片编组"
        color="info"
        :delay="2"
      />
      <StatCard
        v-if="stats.pending_orders !== undefined"
        icon="⏳"
        :value="stats.pending_orders"
        label="待处理订单"
        color="warning"
        :delay="3"
      />
      <StatCard
        v-if="stats.total_products !== undefined"
        icon="🛒"
        :value="stats.total_products"
        label="商品总数"
        color="success"
        :delay="3"
      />
      <StatCard
        v-if="stats.packing_orders !== undefined"
        icon="📦"
        :value="stats.packing_orders"
        label="待发货"
        color="warning"
        :delay="4"
      />
      <StatCard
        v-if="stats.shipping_orders !== undefined"
        icon="🚚"
        :value="stats.shipping_orders"
        label="配送中"
        color="info"
        :delay="4"
      />
      <StatCard
        v-if="stats.total_admins !== undefined"
        icon="👥"
        :value="stats.total_admins"
        label="管理员数"
        color="primary"
        :delay="5"
      />
    </div>

    <!-- 功能菜单 -->
    <div class="section-title">功能菜单</div>
    <div class="menu-grid">
      <router-link
        v-for="(item, index) in menus"
        :key="item.path"
        :to="item.path"
        class="menu-item"
        :class="`anim-slide-up anim-delay-${index + 4}`"
      >
        <div class="menu-icon" :class="item.color">{{ item.icon }}</div>
        <div class="menu-label">{{ item.label }}</div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import StatCard from '../components/StatCard.vue'

const authStore = useAuthStore()
const username = authStore.username
const role = authStore.role

const loading = ref(true)
const stats = ref({})

const menus = computed(() => {
  const roleVal = role.value
  const list = []

  if (roleVal === 'super' || roleVal === 'printer_op') {
    list.push(
      { path: '/printers', icon: '🖨️', label: '打印机管理', color: 'primary' },
      { path: '/groups', icon: '📷', label: '照片分组', color: 'info' }
    )
  }

  if (roleVal === 'super' || roleVal === 'shop_op') {
    list.push({ path: '/shop', icon: '🛒', label: '商品管理', color: 'success' })
    list.push({ path: '/banners', icon: '🎠', label: '轮播图管理', color: 'info' })
  }

  if (roleVal === 'super' || roleVal === 'shop_op' || roleVal === 'delivery_op') {
    list.push({ path: '/orders', icon: '📦', label: '订单管理', color: 'warning' })
  }

  if (roleVal === 'super' || roleVal === 'delivery_op') {
    list.push({ path: '/delivery', icon: '🚚', label: '配送管理', color: 'info' })
  }

  if (roleVal === 'super') {
    list.push({ path: '/admins', icon: '👥', label: '管理员', color: 'primary' })
  }

  return list
})

onMounted(async () => {
  try {
    stats.value = await api.get('/admin/dashboard')
  } catch (err) {
    console.error('Failed to load dashboard:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dashboard {
  animation: fadeIn 0.4s ease;
}

.page-header {
  margin-bottom: var(--space-xl);
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.skeleton-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-sm);
}

.skeleton-line {
  height: 24px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  animation: shimmer 1.5s infinite;
  margin-bottom: var(--space-md);
}

.skeleton-line.short {
  width: 60%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
}

.section-title {
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-lg);
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-lg);
}

.menu-item {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  text-align: center;
  text-decoration: none;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.menu-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.menu-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin: 0 auto var(--space-md);
}

.menu-icon.primary { background: var(--color-primary-bg); }
.menu-icon.success { background: var(--color-success-bg); }
.menu-icon.warning { background: var(--color-warning-bg); }
.menu-icon.info { background: var(--color-info-bg); }

.menu-label {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
