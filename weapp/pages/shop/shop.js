const api = require('../../utils/api')
Page({
  data: { products: [], orderId: '', loading: true, showActionSheet: false, selectedProduct: null },
  async onLoad() {
    try {
      const data = await api.get('/api/shop/products', false)
      this.setData({ products: data, loading: false })
    } catch {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },
  tapAdd(e) {
    this.setData({ selectedProduct: e.currentTarget.dataset.product, showActionSheet: true })
  },
  closeSheet() {
    this.setData({ showActionSheet: false, selectedProduct: null })
  },
  addToCart() {
    const p = this.data.selectedProduct
    const cart = getApp().globalData.cart || []
    const idx = cart.findIndex(i => i.id === p.id)
    if (idx >= 0) {
      cart[idx].qty += 1
    } else {
      cart.push({ ...p, qty: 1 })
    }
    getApp().globalData.cart = cart
    this.setData({ showActionSheet: false, selectedProduct: null })
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },
  doOrderNow() {
    const p = this.data.selectedProduct
    getApp().globalData.pendingItems = [{ ...p, qty: 1 }]
    getApp().globalData.pendingOrder = null
    this.setData({ showActionSheet: false, selectedProduct: null })
    wx.navigateTo({ url: '/pages/order-place/order-place' })
  },
  viewOrder() { wx.navigateTo({ url: `/pages/order/order?id=${this.data.orderId}` }) }
})
