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
    tab: 0,
    products: [],
    orders: [],
    banners: [],
    loading: true,
    showForm: false,
    form: { name: '', description: '', price: 0, stock: 0, active: true },
    editingId: ''
  },

  onLoad() {
    const token = wx.getStorageSync('admin_token')
    if (!token) return wx.redirectTo({ url: '/pages/admin-login/admin-login' })
    this.loadData()
  },

  onShow() {
    if (!this.data.loading) this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const [products, orders, banners] = await Promise.all([
        request('GET', '/api/shop/products'),
        request('GET', '/api/shop/orders').catch(() => []),
        request('GET', '/api/shop/banners').catch(() => [])
      ])
      this.setData({ products, orders, banners, loading: false })
    } catch {
      this.setData({ loading: false })
    }
  },

  switchTab(e) {
    this.setData({ tab: parseInt(e.currentTarget.dataset.tab) })
  },

  // 轮播图管理
  addBanner() {
    wx.showModal({
      title: '添加轮播图',
      content: '请输入图片URL',
      editable: true,
      placeholderText: 'https://example.com/banner.jpg',
      success: async (res) => {
        if (!res.confirm || !res.content) return
        try {
          await request('POST', '/api/shop/banners', { image_url: res.content, sort: this.data.banners.length + 1 })
          this.loadData()
          wx.showToast({ title: '添加成功', icon: 'success' })
        } catch {
          wx.showToast({ title: '添加失败', icon: 'none' })
        }
      }
    })
  },

  async deleteBanner(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除此轮播图？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request('DELETE', '/api/shop/banners/' + id)
          this.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        } catch {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  toggleForm() {
    this.setData({
      showForm: !this.data.showForm,
      form: { name: '', description: '', price: 0, stock: 0, active: true },
      editingId: ''
    })
  },

  editProduct(e) {
    const product = this.data.products[e.currentTarget.dataset.idx]
    this.setData({
      showForm: true,
      form: { ...product },
      editingId: product.id
    })
  },

  onInputName(e) { this.setData({ 'form.name': e.detail.value }) },
  onInputDesc(e) { this.setData({ 'form.description': e.detail.value }) },
  onInputPrice(e) { this.setData({ 'form.price': parseFloat(e.detail.value) }) },
  onInputStock(e) { this.setData({ 'form.stock': parseInt(e.detail.value) }) },
  onToggleActive(e) { this.setData({ 'form.active': e.detail.value }) },

  async saveProduct() {
    const { form, editingId } = this.data
    if (!form.name || !form.price) return wx.showToast({ title: '请填写完整', icon: 'none' })

    try {
      if (editingId) {
        await request('PUT', `/api/shop/products/${editingId}`, form)
      } else {
        await request('POST', '/api/shop/products', form)
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.setData({ showForm: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: (err && err.error) || '保存失败', icon: 'none' })
    }
  },

  async deleteProduct(e) {
    const product = this.data.products[e.currentTarget.dataset.idx]
    wx.showModal({
      title: '确认删除',
      content: `确定删除「${product.name}」？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request('DELETE', `/api/shop/products/${product.id}`)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadData()
        } catch {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  async toggleActive(e) {
    const product = this.data.products[e.currentTarget.dataset.idx]
    try {
      await request('PUT', `/api/shop/products/${product.id}`, { active: !product.active })
      this.loadData()
    } catch {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  updateOrderStatus(e) {
    const order = this.data.orders[e.currentTarget.dataset.idx]
    const nextMap = { packing: 'shipping', shipping: 'delivered' }
    const nextStatus = nextMap[order.delivery_status]
    if (!nextStatus) return

    const labelMap = { shipping: '发货', delivered: '确认送达' }
    wx.showModal({
      title: '确认操作',
      content: `确定将订单标记为「${labelMap[nextStatus]}」？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request('PUT', `/api/shop/orders/${order.id}`, { delivery_status: nextStatus })
          wx.showToast({ title: '已更新', icon: 'success' })
          this.loadData()
        } catch {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }
})
