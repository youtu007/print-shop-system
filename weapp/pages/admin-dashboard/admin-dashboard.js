const app = getApp()

function request(method, path, data, showLoad = true) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('admin_token')
    if (showLoad) wx.showLoading({ title: '加载中', mask: true })
    wx.request({
      url: app.globalData.apiBase + path,
      method,
      data,
      timeout: 8000,
      header: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      success: res => {
        if (showLoad) wx.hideLoading()
        if (res.statusCode === 401) {
          wx.removeStorageSync('admin_token')
          wx.removeStorageSync('admin_role')
          wx.removeStorageSync('admin_username')
          wx.redirectTo({ url: '/pages/admin-login/admin-login' })
          reject(res.data)
        } else if (res.statusCode >= 400) {
          reject(res.data)
        } else {
          resolve(res.data)
        }
      },
      fail: () => {
        if (showLoad) wx.hideLoading()
        wx.showToast({ title: '网络异常', icon: 'none' })
        reject({ error: 'network error' })
      }
    })
  })
}

Page({
  data: {
    username: '',
    role: '',
    roleLabel: '',
    stats: {},
    menus: [],
    loading: true
  },

  onLoad() {
    const token = wx.getStorageSync('admin_token')
    if (!token) return wx.redirectTo({ url: '/pages/admin-login/admin-login' })

    const role = wx.getStorageSync('admin_role')
    const username = wx.getStorageSync('admin_username')

    const roleLabels = {
      super: '超级管理员',
      printer_op: '打印操作员',
      shop_op: '商城管理员',
      delivery_op: '配送管理员'
    }

    this.setData({
      role,
      username,
      roleLabel: roleLabels[role] || role
    })

    this.buildMenus(role)
    this.loadDashboard()
  },

  buildMenus(role) {
    const all = [
      { key: 'printers', title: '打印机状态', icon: 'icon-print', color: 'info', roles: ['super', 'printer_op'] },
      { key: 'groups', title: '照片编组', icon: 'icon-photo', color: '', roles: ['super', 'printer_op'] },
      { key: 'shop', title: '商城管理', icon: 'icon-shop', color: 'success', roles: ['super', 'shop_op'] },
      { key: 'delivery', title: '配送管理', icon: 'icon-truck', color: 'warning', roles: ['super', 'delivery_op'] },
      { key: 'accounts', title: '账号管理', icon: 'icon-user', color: 'error', roles: ['super'] },
    ]
    const menus = all.filter(m => m.roles.includes(role))
    this.setData({ menus })
  },

  async loadDashboard() {
    try {
      const stats = await request('GET', '/api/admin/dashboard')
      this.setData({ stats, loading: false })
    } catch {
      this.setData({ loading: false })
    }
  },

  goPage(e) {
    const key = e.currentTarget.dataset.key
    const urlMap = {
      printers: '/pages/admin-printers/admin-printers',
      groups: '/pages/admin-groups/admin-groups',
      shop: '/pages/admin-shop/admin-shop',
      delivery: '/pages/admin-delivery/admin-delivery',
      accounts: '/pages/admin-accounts/admin-accounts'
    }
    wx.navigateTo({ url: urlMap[key] })
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('admin_token')
          wx.removeStorageSync('admin_role')
          wx.removeStorageSync('admin_username')
          wx.switchTab({ url: '/pages/mine/mine' })
        }
      }
    })
  }
})
