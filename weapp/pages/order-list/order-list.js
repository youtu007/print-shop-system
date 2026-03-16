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
    const results = await Promise.all(
      saved.map(id => api.get(`/api/shop/orders/${id}`, false).catch(() => null))
    )
    let orders = results.filter(Boolean)
    if (filter === 'unpaid')  orders = orders.filter(o => !o.is_paid)
    else if (filter === 'packing')  orders = orders.filter(o => o.is_paid && o.delivery_status === 'packing')
    else if (filter === 'shipping') orders = orders.filter(o => o.delivery_status === 'shipping')

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
  }
})
