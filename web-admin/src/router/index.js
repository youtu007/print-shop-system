import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Printers from '../views/Printers.vue'
import Groups from '../views/Groups.vue'
import Shop from '../views/Shop.vue'
import Orders from '../views/Orders.vue'
import Admins from '../views/Admins.vue'
import Layout from '../components/Layout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/',
    component: Layout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Dashboard', component: Dashboard },
      { path: 'printers', name: 'Printers', component: Printers },
      { path: 'groups', name: 'Groups', component: Groups },
      { path: 'shop', name: 'Shop', component: Shop },
      { path: 'orders', name: 'Orders', component: Orders },
      { path: 'admins', name: 'Admins', component: Admins, meta: { requiresSuper: true } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  // 避免路由守卫中的无限循环
  if (to.path === from.path) {
    next()
    return
  }

  const authStore = useAuthStore()
  const isAuth = authStore.isAuthenticated.value
  const userRole = authStore.role.value

  // 如果访问登录页且已登录，重定向到首页
  if (to.path === '/login' && isAuth) {
    next('/')
    return
  }

  // 如果访问需要认证的页面但未登录，重定向到登录页
  if (to.meta.requiresAuth && !isAuth) {
    next('/login')
    return
  }

  // 如果访问管理员页面但不是超管
  if (to.meta.requiresSuper && userRole !== 'super') {
    next('/')
    return
  }

  next()
})

export default router
