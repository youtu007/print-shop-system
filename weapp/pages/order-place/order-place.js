const api = require('../../utils/api')

Page({
  data: {
    items: [],
    totalQty: 0,
    totalPrice: '0.00',
    form: { name: '', phone: '', address: '' },
    showPayPopup: false,
    pendingOrderId: ''
  },

  onLoad() {
    // support both single-product (pendingOrder) and multi-item (pendingItems) entry
    const app = getApp().globalData
    let items = app.pendingItems || (app.pendingOrder ? [{ ...app.pendingOrder }] : null)
    if (!items || !items.length) { wx.navigateBack(); return }

    items = items.map(i => ({ ...i, subtotal: (i.price * i.qty).toFixed(2) }))
    const totalQty = items.reduce((s, i) => s + i.qty, 0)
    const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)
    this.setData({ items, totalQty, totalPrice })
  },

  onInput(e) {
    const form = { ...this.data.form }
    form[e.currentTarget.dataset.field] = e.detail.value
    this.setData({ form })
  },

  async placeOrder() {
    const { name, phone, address } = this.data.form
    if (!name || !phone || !address) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    const total = parseFloat(this.data.totalPrice)
    try {
      // Create order (unpaid)
      const data = await api.post('/api/shop/orders', {
        customer_name: name, phone, address,
        items: this.data.items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        total_price: total
      })
      // Show payment popup
      this.setData({ pendingOrderId: data.id, showPayPopup: true })
    } catch {
      wx.showToast({ title: '下单失败', icon: 'none' })
    }
  },

  closePayPopup() {
    this.setData({ showPayPopup: false })
  },

  async confirmPay() {
    const orderId = this.data.pendingOrderId
    try {
      await api.post(`/api/shop/orders/${orderId}/pay`, {})

      // Save order to local storage
      const saved = wx.getStorageSync('my_orders') || []
      saved.unshift(orderId)
      wx.setStorageSync('my_orders', saved.slice(0, 20))

      // Clear cart
      const orderedIds = new Set(this.data.items.map(i => i.id))
      const app = getApp().globalData
      app.cart = (app.cart || []).filter(i => !orderedIds.has(i.id))
      app.pendingItems = null
      app.pendingOrder = null

      this.setData({ showPayPopup: false })
      wx.showToast({ title: '支付成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/order/order?id=${orderId}` })
      }, 800)
    } catch {
      wx.showToast({ title: '支付失败', icon: 'none' })
    }
  }
})
