// web/src/stores/auth.js
import { defineStore } from 'pinia'
import api from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({ token: localStorage.getItem('token'), role: localStorage.getItem('role'), username: localStorage.getItem('username') }),
  actions: {
    async login(username, password) {
      const { data } = await api.post('/api/auth/login', { username, password })
      this.token = data.token; this.role = data.role; this.username = data.username
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('username', data.username)
    },
    logout() {
      this.token = null; this.role = null; this.username = null
      localStorage.removeItem('token'); localStorage.removeItem('role'); localStorage.removeItem('username')
    }
  }
})
