const api = require('../../utils/api')
Page({
  data: { printers: [], loading: true },
  async onLoad() {
    try {
      const data = await api.get('/api/printers/public', false)
      this.setData({ printers: data, loading: false })
    } catch {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },
  onPullDownRefresh() {
    api.get('/api/printers/public', false).then(data => {
      this.setData({ printers: data })
      wx.stopPullDownRefresh()
    }).catch(() => wx.stopPullDownRefresh())
  }
})
