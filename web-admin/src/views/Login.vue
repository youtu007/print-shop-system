<template>
  <div class="login-page">
    <div class="login-card anim-slide-up">
      <div class="login-header">
        <div class="login-icon">🔐</div>
        <h1 class="login-title">管理员登录</h1>
        <p class="login-sub">打印小站管理后台</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="field">
          <label class="field-label">账号</label>
          <input
            v-model="username"
            type="text"
            class="input"
            placeholder="请输入管理员账号"
            required
          />
        </div>

        <div class="field">
          <label class="field-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="请输入密码"
            required
          />
        </div>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>

        <div v-if="error" class="error-tip">{{ error }}</div>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    const res = await api.post('/auth/login', {
      username: username.value,
      password: password.value
    })

    authStore.login(res.token, res.role, res.username)
    router.push('/')
  } catch (err) {
    error.value = err?.error || '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  padding: var(--space-xl);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.login-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
}

.login-title {
  font-size: var(--font-xl);
  font-weight: 800;
  color: var(--color-text-primary);
}

.login-sub {
  font-size: var(--font-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--space-xs);
}

.login-form {
  margin-bottom: var(--space-xl);
}

.btn-primary {
  margin-top: var(--space-lg);
}

.error-tip {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: var(--color-error-bg);
  color: var(--color-error);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  text-align: center;
}

.demo-tip {
  padding-top: var(--space-xl);
  border-top: 1px solid var(--color-border);
}

.demo-title {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
  text-align: center;
}

.demo-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  font-size: var(--font-sm);
}

.demo-label {
  color: var(--color-text-tertiary);
}

.demo-val {
  color: var(--color-text-primary);
  font-family: monospace;
}
</style>
