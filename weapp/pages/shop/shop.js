const api = require('../../utils/api')
Page({
  data: { products: [], cart: [], showForm: false, form: { name:'', phone:'', address:'' }, orderId: '' },
  async onLoad() {
    const data = await api.get('/api/shop/products')
    this.setData({ products: data })
  },
  addCart(e) {
    const p = e.currentTarget.dataset.product
    const cart = this.data.cart
    const idx = cart.findIndex(i => i.id === p.id)
    if (idx >= 0) cart[idx].qty++
    else cart.push({ ...p, qty: 1 })
    this.setData({ cart })
  },
  checkout() { this.setData({ showForm: true }) },
  onInput(e) {
    const form = { ...this.data.form }
    form[e.currentTarget.dataset.field] = e.detail.value
    this.setData({ form })
  },
  async placeOrder() {
    const { name, phone, address } = this.data.form
    const total = this.data.cart.reduce((s,i) => s + i.price * i.qty, 0)
    const data = await api.post('/api/shop/orders', {
      customer_name: name, phone, address,
      items: this.data.cart.map(i => ({ id:i.id, name:i.name, qty:i.qty, price:i.price })),
      total_price: total
    })
    this.setData({ orderId: data.id, cart: [], showForm: false })
    wx.showToast({ title: '下单成功', icon: 'success' })
  },
  viewOrder() { wx.navigateTo({ url: `/pages/order/order?id=${this.data.orderId}` }) }
})
