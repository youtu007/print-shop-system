import { reactive, computed } from 'vue'

const state = reactive({
  token: localStorage.getItem('token') || '',
  role: localStorage.getItem('role') || '',
  username: localStorage.getItem('username') || ''
})

export const useAuthStore = () => {
  const isAuthenticated = computed(() => !!state.token)

  const login = (token, role, username) => {
    state.token = token
    state.role = role
    state.username = username
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('username', username)
  }

  const logout = () => {
    state.token = ''
    state.role = ''
    state.username = ''
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    window.location.href = '/login'
  }

  return {
    token: computed(() => state.token),
    role: computed(() => state.role),
    username: computed(() => state.username),
    isAuthenticated,
    login,
    logout
  }
}
