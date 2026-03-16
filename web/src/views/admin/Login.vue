<!-- web/src/views/admin/Login.vue -->
<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
    <div class="card" style="width:360px;padding:36px">
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:48px">🔐</div>
        <div style="font-weight:800;font-size:22px;margin-top:8px">管理员登录</div>
      </div>
      <input class="input" v-model="username" placeholder="用户名" style="margin-bottom:12px"/>
      <input class="input" v-model="password" type="password" placeholder="密码" style="margin-bottom:16px" @keydown.enter="login"/>
      <button class="btn btn-primary" style="width:100%" @click="login">登录</button>
      <p v-if="error" style="color:#e74c3c;text-align:center;margin-top:10px;font-size:14px">{{ error }}</p>
      <p style="color:var(--muted);text-align:center;margin-top:14px;font-size:12px">演示账号：admin / admin123</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter(), auth = useAuthStore()
const username = ref(''), password = ref(''), error = ref('')

async function login() {
  try { await auth.login(username.value, password.value); router.push('/admin') }
  catch { error.value = '用户名或密码错误' }
}
</script>
