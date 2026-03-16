const api = require('../../utils/api')
Page({
  data: { printers: [] },
  async onLoad() {
    try {
      const data = await api.get('/api/printers/public')
      this.setData({ printers: data })
    } catch { wx.showToast({ title:'加载失败', icon:'none' }) }
  }
})
