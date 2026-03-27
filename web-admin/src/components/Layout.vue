<template>
  <div class="layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">🖨️</span>
          <span class="logo-text">打印小站</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">{{ username?.charAt(0) }}</div>
          <div class="user-detail">
            <div class="user-name">{{ username }}</div>
            <div class="user-role">{{ roleLabel }}</div>
          </div>
        </div>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main">
      <div class="main-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const { role, username, logout } = authStore

const roleLabel = computed(() => {
  const labels = {
    super: '超级管理员',
    printer_op: '打印操作员',
    shop_op: '商城管理员',
    delivery_op: '配送管理员'
  }
  return labels[role.value] || role.value
})

const menus = computed(() => {
  const roleVal = role.value
  const list = [
    { path: '/', icon: '📊', label: '仪表盘' }
  ]

  if (roleVal === 'super' || roleVal === 'printer_op') {
    list.push(
      { path: '/printers', icon: '🖨️', label: '打印机' },
      { path: '/groups', icon: '📷', label: '照片分组' }
    )
  }

  if (roleVal === 'super' || roleVal === 'shop_op') {
    list.push({ path: '/shop', icon: '🛒', label: '商品管理' })
    list.push({ path: '/banners', icon: '🎠', label: '轮播图' })
  }

  if (roleVal === 'super' || roleVal === 'shop_op' || roleVal === 'delivery_op') {
    list.push({ path: '/orders', icon: '📦', label: '订单管理' })
  }

  if (roleVal === 'super' || roleVal === 'delivery_op') {
    list.push({ path: '/delivery', icon: '🚚', label: '配送管理' })
  }

  if (roleVal === 'super') {
    list.push({ path: '/admins', icon: '👥', label: '管理员' })
  }

  return list
})
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background: var(--color-bg-card);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
}

.sidebar-header {
  padding: var(--space-xl);
  border-bottom: 1px solid var(--color-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: var(--font-lg);
  font-weight: 800;
  color: var(--color-primary);
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-lg);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  margin-bottom: var(--space-xs);
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--color-bg-input);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
}

.nav-icon {
  font-size: 18px;
}

.nav-label {
  font-size: var(--font-sm);
}

.sidebar-footer {
  padding: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.user-name {
  font-weight: 600;
  font-size: var(--font-sm);
}

.user-role {
  font-size: var(--font-xs);
  color: var(--color-text-tertiary);
}

.logout-btn {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: var(--color-error-bg);
  color: var(--color-error);
  border-color: var(--color-error);
}

.main {
  flex: 1;
  margin-left: 220px;
  background: var(--color-bg-page);
}

.main-content {
  padding: var(--space-xl);
  max-width: 1200px;
}
</style>
