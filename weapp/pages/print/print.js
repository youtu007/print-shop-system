const api = require('../../utils/api')
Page({
  data: { tab: 'group', code: '', group: null, error: '' },
  onLoad(options) { if (options.tab) this.setData({ tab: options.tab }) },
  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab, group: null, error: '' }) },
  onCodeInput(e) { this.setData({ code: e.detail.value }) },
  async lookup() {
    try {
      const data = await api.get(`/api/groups/by-code/${this.data.code}`)
      this.setData({ group: data, error: '' })
    } catch { this.setData({ error: '未找到该编号' }) }
  },
  async pay() {
    await api.post(`/api/groups/${this.data.group.id}/pay`, {})
    const data = await api.get(`/api/groups/${this.data.group.id}`)
    this.setData({ group: data })
    wx.showToast({ title: '付款成功', icon: 'success' })
  },
  async download() {
    const data = await api.get(`/api/groups/${this.data.group.id}/download`)
    wx.showModal({ title: '下载链接', content: data.originals.join('\n'), showCancel: false })
  }
})
