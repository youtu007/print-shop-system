const api = require('../../utils/api')

const STATUS_LABEL = {
  unpaid:   '待付款',
  packing:  '待发货',
  shipping: '待收货',
  delivered: '已完成'
}
const STATUS_CLS = {
  packing: 'packing', shipping: 'shipping', delivered: 'delivered', unpaid: 'unpaid'
}

Page({
  data: { orders: [], loading: true, filter: '' },

  async onLoad(options) {
    const filter = options.status || ''
    this.setData({ filter })
    await this.loadOrders(filter)
  },

  async loadOrders(filter) {
    const saved = wx.getStorageSync('my_orders') || []
    if (!saved.length) { this.setData({ loading: false }); return }
    // 批量获取订单，一次请求
    let orders = []
    try {
      orders = await api.get(`/api/shop/orders/batch?ids=${saved.join(',')}`, false)
    } catch {
      orders = []
    }
    if (!orders) orders = []
    if (filter === 'unpaid')  orders = orders.filter(o => !o.is_paid)
    else if (filter === 'packing')  orders = orders.filter(o => o.is_paid && o.delivery_status === 'packing')
    else if (filter === 'shipping') orders = orders.filter(o => o.delivery_status === 'shipping')
    else if (filter === 'delivered') orders = orders.filter(o => o.delivery_status === 'delivered')

    this.setData({
      loading: false,
      orders: orders.map(o => {
        const key = !o.is_paid ? 'unpaid' : o.delivery_status
        const d = new Date(o.created_at)
        return {
          ...o,
          shortId: o.id.slice(-6).toUpperCase(),
          statusText: STATUS_LABEL[key] || key,
          statusCls: STATUS_CLS[key] || '',
          timeStr: `${d.getMonth() + 1}月${d.getDate()}日`
        }
      })
    })
  },

  async confirmReceive(e) {
    const id = e.currentTarget.dataset.id
    wx.showLoading({ title: '确认中...' })
    try {
      await api.post(`/api/shop/orders/${id}/confirm`)
      wx.showToast({ title: '已确认收货', icon: 'success' })
      // 刷新列表
      await this.loadOrders(this.data.filter)
      // 刷新我的页面角标
      const pages = getCurrentPages()
      const minePage = pages.find(p => p.route.includes('mine/mine'))
      if (minePage) {
        minePage.loadCounts()
      }
    } catch (err) {
      wx.showToast({ title: err.error || '操作失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  }
})
