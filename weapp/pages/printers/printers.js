const api = require('../../utils/api')
Page({
  data: { printers: [], loading: true },
  async onLoad() {
    try {
      const data = await api.get('/api/printers/public', false)
      data.forEach(p => {
        const pct = p.paper_remaining / 500 * 100;
        p.paperLevel = pct > 30 ? 'high' : pct > 10 ? 'mid' : 'low';
      });
      this.setData({ printers: data, loading: false })
    } catch {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },
  onPullDownRefresh() {
    api.get('/api/printers/public', false).then(data => {
      data.forEach(p => {
        const pct = p.paper_remaining / 500 * 100;
        p.paperLevel = pct > 30 ? 'high' : pct > 10 ? 'mid' : 'low';
      });
      this.setData({ printers: data })
      wx.stopPullDownRefresh()
    }).catch(() => wx.stopPullDownRefresh())
  }
})
