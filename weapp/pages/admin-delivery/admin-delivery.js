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
        reject({ error: 'network error' })
      }
    })
  })
}

Page({
  data: {
    tab: 'packing',
    tabs: [
      { key: 'packing', label: '待发货' },
      { key: 'shipping', label: '配送中' },
      { key: 'delivered', label: '已送达' }
    ],
    orders: [],
    filteredOrders: [],
    loading: true
  },

  onLoad() {
    const token = wx.getStorageSync('admin_token')
    if (!token) return wx.redirectTo({ url: '/pages/admin-login/admin-login' })
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => wx.stopPullDownRefresh())
  },

  async loadOrders() {
    try {
      const orders = await request('GET', '/api/shop/orders')
      this.setData({ orders, loading: false })
      this.filterOrders()
    } catch {
      this.setData({ loading: false })
    }
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
    this.filterOrders()
  },

  filterOrders() {
    const filtered = this.data.orders.filter(o => o.delivery_status === this.data.tab)
    this.setData({ filteredOrders: filtered })
  },

  doAction(e) {
    const order = this.data.filteredOrders[e.currentTarget.dataset.idx]
    const nextMap = { packing: 'shipping', shipping: 'delivered' }
    const nextStatus = nextMap[order.delivery_status]
    if (!nextStatus) return

    const labelMap = { shipping: '确认发货', delivered: '确认送达' }
    wx.showModal({
      title: labelMap[nextStatus],
      content: `订单 ${order.customer_name} 将标记为「${nextStatus === 'shipping' ? '配送中' : '已送达'}」`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request('PUT', `/api/shop/orders/${order.id}`, { delivery_status: nextStatus })
          wx.showToast({ title: '已更新', icon: 'success' })
          this.loadOrders()
        } catch {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }
})
