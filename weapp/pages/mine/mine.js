const api = require('../../utils/api')

Page({
  data: {
    counts: { unpaid: 0, packing: 0, shipping: 0 },
    cartCount: 0
  },

  onShow() {
    this.loadCounts()
    this.loadCart()
  },

  async loadCounts() {
    const saved = wx.getStorageSync('my_orders') || []
    if (!saved.length) return
    const results = await Promise.all(
      saved.map(id => api.get(`/api/shop/orders/${id}`, false).catch(() => null))
    )
    const counts = { unpaid: 0, packing: 0, shipping: 0 }
    results.filter(Boolean).forEach(o => {
      if (!o.is_paid) counts.unpaid++
      else if (o.delivery_status === 'packing') counts.packing++
      else if (o.delivery_status === 'shipping') counts.shipping++
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
    wx.navigateTo({ url: `/pages/order-list/order-list?status=${status}` })
  },

  goAllOrders() {
    wx.navigateTo({ url: '/pages/order-list/order-list' })
  },

  goCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  }
})
