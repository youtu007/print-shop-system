const api = require('../../utils/api')
Page({
  data: { order: null },
  async onLoad(options) {
    const data = await api.get(`/api/shop/orders/${options.id}`)
    this.setData({ order: data })
  }
})
