Page({
  data: { items: [], allChecked: true, selectedCount: 0, totalPrice: '0.00' },

  onShow() {
    const raw = getApp().globalData.cart || []
    const items = raw.map(i => ({
      ...i,
      checked: true,
      subtotal: (i.price * i.qty).toFixed(2)
    }))
    this.setData({ items })
    this._recalc(items)
  },

  _recalc(items) {
    const selected = items.filter(i => i.checked)
    const total = selected.reduce((s, i) => s + i.price * i.qty, 0)
    const allChecked = items.length > 0 && items.every(i => i.checked)
    this.setData({
      allChecked,
      selectedCount: selected.reduce((s, i) => s + i.qty, 0),
      totalPrice: total.toFixed(2)
    })
  },

  _syncGlobal(items) {
    getApp().globalData.cart = items.map(({ checked, subtotal, ...rest }) => rest)
  },

  toggleCheck(e) {
    const idx = e.currentTarget.dataset.index
    const items = this.data.items
    items[idx].checked = !items[idx].checked
    this.setData({ items })
    this._recalc(items)
  },

  toggleAll() {
    const next = !this.data.allChecked
    const items = this.data.items.map(i => ({ ...i, checked: next }))
    this.setData({ items })
    this._recalc(items)
  },

  increase(e) {
    const idx = e.currentTarget.dataset.index
    const items = this.data.items
    items[idx].qty++
    items[idx].subtotal = (items[idx].price * items[idx].qty).toFixed(2)
    this.setData({ items })
    this._recalc(items)
    this._syncGlobal(items)
  },

  decrease(e) {
    const idx = e.currentTarget.dataset.index
    const items = this.data.items
    if (items[idx].qty <= 1) return
    items[idx].qty--
    items[idx].subtotal = (items[idx].price * items[idx].qty).toFixed(2)
    this.setData({ items })
    this._recalc(items)
    this._syncGlobal(items)
  },

  deleteItem(e) {
    const idx = e.currentTarget.dataset.index
    const items = this.data.items
    items.splice(idx, 1)
    this.setData({ items })
    this._recalc(items)
    this._syncGlobal(items)
  },

  goCheckout() {
    const selected = this.data.items.filter(i => i.checked)
    if (!selected.length) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    getApp().globalData.pendingItems = selected.map(({ checked, subtotal, ...rest }) => rest)
    wx.navigateTo({ url: '/pages/order-place/order-place' })
  },

  goShop() {
    wx.switchTab({ url: '/pages/shop/shop' })
  }
})
