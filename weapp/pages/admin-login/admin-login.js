const app = getApp()

function request(method, path, data, showLoad = true) {
  return new Promise((resolve, reject) => {
    if (showLoad) wx.showLoading({ title: '加载中', mask: true })
    wx.request({
      url: app.globalData.apiBase + path,
      method,
      data,
      timeout: 8000,
      header: { 'Content-Type': 'application/json' },
      success: res => {
        if (showLoad) wx.hideLoading()
        if (res.statusCode >= 400) {
          reject(res.data)
        } else {
          resolve(res.data)
        }
      },
      fail: () => {
        if (showLoad) wx.hideLoading()
        reject({ error: 'network error' })
      }
    })
  })
}

Page({
  data: {
    username: '',
    password: '',
    loading: false,
    error: ''
  },

  onInputUsername(e) {
    this.setData({ username: e.detail.value })
  },

  onInputPassword(e) {
    this.setData({ password: e.detail.value })
  },

  async doLogin() {
    if (!this.data.username || !this.data.password) {
      this.setData({ error: '请输入账号和密码' })
      return
    }

    this.setData({ loading: true, error: '' })

    try {
      const res = await request('POST', '/api/auth/login', {
        username: this.data.username,
        password: this.data.password
      })

      wx.setStorageSync('admin_token', res.token)
      wx.setStorageSync('admin_role', res.role)
      wx.setStorageSync('admin_username', res.username)

      wx.redirectTo({ url: '/pages/admin-dashboard/admin-dashboard' })
    } catch (err) {
      this.setData({ error: (err && err.error) || '登录失败，请检查账号密码' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
