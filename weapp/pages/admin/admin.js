const api = require('../../utils/api')
Page({
  data: { loggedIn: false, username: '', password: '', role: '', error: '' },
  onLoad() {
    const token = wx.getStorageSync('token')
    if (token) this.setData({ loggedIn: true, role: wx.getStorageSync('role') })
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }) },
  async login() {
    try {
      const data = await api.post('/api/auth/login', { username: this.data.username, password: this.data.password })
      wx.setStorageSync('token', data.token)
      wx.setStorageSync('role', data.role)
      getApp().globalData.token = data.token
      this.setData({ loggedIn: true, role: data.role, error: '' })
    } catch { this.setData({ error: '用户名或密码错误' }) }
  },
  goPrinters() {
    wx.navigateTo({ url: '/pages/printers/printers' })
  },
  goMine() {
    wx.navigateBack({ delta: 1 })
  },
  logout() {
    wx.removeStorageSync('token'); wx.removeStorageSync('role')
    getApp().globalData.token = ''
    this.setData({ loggedIn: false })
  }
})
