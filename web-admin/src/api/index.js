import axios from 'axios'

const BACKEND = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({
  baseURL: BACKEND,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器 - 注入 token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器 - 处理 401
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('username')
      window.location.href = '/#/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default {
  get: (url, params) => api.get(url, { params }),
  post: (url, data) => api.post(url, data),
  put: (url, data) => api.put(url, data),
  delete: (url) => api.delete(url),
  upload: (url, formData) => api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
