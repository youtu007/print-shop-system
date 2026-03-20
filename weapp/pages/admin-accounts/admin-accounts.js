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
    admins: [],
    printers: [],
    loading: true,
    showForm: false,
    formUsername: '',
    formPassword: '',
    formRole: 'printer_op',
    roles: [
      { value: 'printer_op', label: '打印操作员' },
      { value: 'shop_op', label: '商城管理员' },
      { value: 'delivery_op', label: '配送管理员' }
    ],
    roleIndex: 0,
    showAccessPopup: false,
    accessAdminId: '',
    accessAdminName: '',
    accessChecked: []
  },

  onLoad() {
    const token = wx.getStorageSync('admin_token')
    if (!token) return wx.redirectTo({ url: '/pages/admin-login/admin-login' })
    if (wx.getStorageSync('admin_role') !== 'super') {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      return wx.navigateBack()
    }
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const [admins, printers] = await Promise.all([
        request('GET', '/api/admin/admins'),
        request('GET', '/api/printers')
      ])
      this.setData({ admins, printers, loading: false })
    } catch {
      this.setData({ loading: false })
    }
  },

  toggleForm() {
    this.setData({ showForm: !this.data.showForm, formUsername: '', formPassword: '', roleIndex: 0, formRole: 'printer_op' })
  },

  onInputUsername(e) { this.setData({ formUsername: e.detail.value }) },
  onInputPassword(e) { this.setData({ formPassword: e.detail.value }) },

  onRoleChange(e) {
    const idx = e.detail.value
    this.setData({ roleIndex: idx, formRole: this.data.roles[idx].value })
  },

  async createAdmin() {
    const { formUsername, formPassword, formRole } = this.data
    if (!formUsername || !formPassword) return wx.showToast({ title: '请填写完整', icon: 'none' })
    try {
      await request('POST', '/api/admin/admins', { username: formUsername, password: formPassword, role: formRole })
      wx.showToast({ title: '创建成功', icon: 'success' })
      this.setData({ showForm: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: (err && err.error) || '创建失败', icon: 'none' })
    }
  },

  deleteAdmin(e) {
    const admin = this.data.admins[e.currentTarget.dataset.idx]
    wx.showModal({
      title: '确认删除',
      content: `确定删除管理员「${admin.username}」？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request('DELETE', `/api/admin/admins/${admin.id}`)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadData()
        } catch (err) {
          wx.showToast({ title: (err && err.error) || '删除失败', icon: 'none' })
        }
      }
    })
  },

  async showAccess(e) {
    const admin = this.data.admins[e.currentTarget.dataset.idx]
    try {
      const accessIds = await request('GET', `/api/admin/admins/${admin.id}/access`)
      this.setData({
        showAccessPopup: true,
        accessAdminId: admin.id,
        accessAdminName: admin.username,
        accessChecked: accessIds || []
      })
    } catch {
      wx.showToast({ title: '获取权限失败', icon: 'none' })
    }
  },

  closeAccessPopup() { this.setData({ showAccessPopup: false }) },

  togglePrinterAccess(e) {
    const pid = e.currentTarget.dataset.pid
    let checked = [...this.data.accessChecked]
    const idx = checked.indexOf(pid)
    if (idx >= 0) checked.splice(idx, 1)
    else checked.push(pid)
    this.setData({ accessChecked: checked })
  },

  async saveAccess() {
    try {
      await request('PUT', `/api/admin/admins/${this.data.accessAdminId}/access`, { printer_ids: this.data.accessChecked })
      wx.showToast({ title: '权限已保存', icon: 'success' })
      this.setData({ showAccessPopup: false })
    } catch {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
})
