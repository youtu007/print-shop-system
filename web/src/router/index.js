// web/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/',              component: () => import('../views/Home.vue') },
  { path: '/printers',     component: () => import('../views/Printers.vue') },
  { path: '/print/self',   component: () => import('../views/PrintSelf.vue') },
  { path: '/print/group',  component: () => import('../views/PrintGroup.vue') },
  { path: '/shop',         component: () => import('../views/Shop.vue') },
  { path: '/shop/orders/:id', component: () => import('../views/OrderStatus.vue') },
  { path: '/admin/login',  component: () => import('../views/admin/Login.vue') },
  { path: '/admin',        component: () => import('../views/admin/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/admin/printers', component: () => import('../views/admin/AdminPrinters.vue'), meta: { requiresAuth: true } },
  { path: '/admin/groups', component: () => import('../views/admin/AdminGroups.vue'), meta: { requiresAuth: true } },
  { path: '/admin/orders', component: () => import('../views/admin/AdminOrders.vue'), meta: { requiresAuth: true } },
  { path: '/admin/accounts', component: () => import('../views/admin/AdminAccounts.vue'), meta: { requiresAuth: true } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return '/admin/login'
  }
})

export default router
