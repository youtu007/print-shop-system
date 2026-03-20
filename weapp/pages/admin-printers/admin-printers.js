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
    printers: [],
    loading: true,
    role: ''
  },

  onLoad() {
    const token = wx.getStorageSync('admin_token')
    if (!token) return wx.redirectTo({ url: '/pages/admin-login/admin-login' })
    this.setData({ role: wx.getStorageSync('admin_role') })
    this.loadPrinters()
  },

  onPullDownRefresh() {
    this.loadPrinters().then(() => wx.stopPullDownRefresh())
  },

  async loadPrinters() {
    try {
      const list = await request('GET', '/api/printers')
      this.setData({ printers: list, loading: false })
    } catch {
      this.setData({ loading: false })
    }
  },

  addPrinter() {
    const that = this
    wx.showModal({
      title: '添加打印机',
      content: '请输入打印机名称',
      editable: true,
      placeholderText: '例如：打印机-D',
      success(res) {
        if (!res.confirm || !res.content || !res.content.trim()) return
        const name = res.content.trim()
        wx.showModal({
          title: '设置位置',
          content: '请输入打印机位置',
          editable: true,
          placeholderText: '例如：四楼办公室',
          success: async (res2) => {
            if (!res2.confirm || !res2.content || !res2.content.trim()) return
            const location = res2.content.trim()
            try {
              await request('POST', '/api/printers', { name, location })
              that.loadPrinters()
              wx.showToast({ title: '添加成功', icon: 'success' })
            } catch {
              wx.showToast({ title: '添加失败', icon: 'none' })
            }
          }
        })
      }
    })
  },

  deletePrinter(e) {
    const idx = e.currentTarget.dataset.idx
    const printer = this.data.printers[idx]
    wx.showModal({
      title: '删除打印机',
      content: `确定删除「${printer.name}」吗？`,
      confirmColor: '#EF4444',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request('DELETE', `/api/printers/${printer.id}`)
          this.loadPrinters()
          wx.showToast({ title: '已删除', icon: 'success' })
        } catch {
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  },

  toggleStatus(e) {
    const idx = e.currentTarget.dataset.idx
    const printer = this.data.printers[idx]
    const nextStatus = printer.status === 'online' ? 'offline' : 'online'
    wx.showModal({
      title: '切换状态',
      content: `将 ${printer.name} 设为 ${nextStatus === 'online' ? '在线' : '离线'}？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request('PUT', `/api/printers/${printer.id}`, { status: nextStatus })
          this.loadPrinters()
          wx.showToast({ title: '已更新', icon: 'success' })
        } catch {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  updatePaper(e) {
    const idx = e.currentTarget.dataset.idx
    const printer = this.data.printers[idx]
    wx.showModal({
      title: '更新纸量',
      content: `当前 ${printer.name} 剩余 ${printer.paper_remaining}%`,
      editable: true,
      placeholderText: '输入新的纸张百分比',
      success: async (res) => {
        if (!res.confirm || !res.content) return
        const paper = parseInt(res.content)
        if (isNaN(paper) || paper < 0 || paper > 100) return wx.showToast({ title: '请输入0-100的数字', icon: 'none' })
        try {
          await request('PUT', `/api/printers/${printer.id}`, { paper_remaining: paper })
          this.loadPrinters()
          wx.showToast({ title: '已更新', icon: 'success' })
        } catch {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }
})
