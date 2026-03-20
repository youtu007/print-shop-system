const api = require('../../utils/api')

Page({
  data: {
    counts: { packing: 0, shipping: 0, delivered: 0 },
    cartCount: 0
  },

  onShow() {
    this.loadCounts()
    this.loadCart()
  },

  async loadCounts() {
    const saved = wx.getStorageSync('my_orders') || []
    if (!saved.length) {
      this.setData({ counts: { packing: 0, shipping: 0, delivered: 0 } })
      return
    }
    const results = await Promise.all(
      saved.map(id => api.get(`/api/shop/orders/${id}`, false).catch(() => null))
    )
    const counts = { packing: 0, shipping: 0, delivered: 0 }
    results.filter(Boolean).forEach(o => {
      if (o.delivery_status === 'packing') counts.packing++
      else if (o.delivery_status === 'shipping') counts.shipping++
      else if (o.delivery_status === 'delivered') counts.delivered++
    })
    this.setData({ counts })
  },

  loadCart() {
    const cart = getApp().globalData.cart || []
    const cartCount = cart.reduce((s, i) => s + i.qty, 0)
    this.setData({ cartCount })
  },

  goOrders(e) {
    const status = e.currentTarget.dataset.status
    // 查看完后气泡消失
    const counts = { ...this.data.counts }
    if (status === 'delivered') {
      counts.delivered = 0
    } else if (status === 'shipping') {
      counts.shipping = 0
    } else if (status === 'packing') {
      counts.packing = 0
    }
    this.setData({ counts })
    wx.navigateTo({ url: `/pages/order-list/order-list?status=${status}` })
  },

  goAllOrders() {
    wx.navigateTo({ url: '/pages/order-list/order-list' })
  },

  goCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  },

  goAdminLogin() {
    wx.navigateTo({ url: '/pages/admin-login/admin-login' })
  }
})
