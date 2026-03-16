const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    tab: 'self',

    // --- 编组相片 ---
    code: '', group: null, groupError: '',

    // --- 自助打印 ---
    selfStep: 1,           // 1选类型 2选文件/照片 3选规格 4预览/确认 5完成
    printType: '',         // 'photo' | 'doc'
    colorMode: 'color',    // 'color' | 'bw'

    // 照片
    photos: [],
    sizes: ['1寸', '2寸', '3寸', '5寸', '6寸', 'A4'],
    sizeIndex: 4,

    // 文件
    docFile: null,         // { name, size, path, tempFilePath }

    // 通用
    count: 1,
    printers: [],
    printerIndex: 0,
    previewUrl: '',
    uploading: false,
    jobId: '',
    jobStatus: '',
    selfError: ''
  },

  onLoad(options) {
    if (options.tab) this.setData({ tab: options.tab })
  },

  onShow() { this.loadPrinters() },

  async loadPrinters() {
    try {
      const list = await api.get('/api/printers/public', false)
      this.setData({ printers: (list || []).filter(p => p.status !== 'offline') })
    } catch (e) {}
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab, group: null, groupError: '' })
  },

  // ===== 编组相片 =====
  onCodeInput(e) { this.setData({ code: e.detail.value }) },

  async lookup() {
    const code = this.data.code
    if (!code) return
    if (code.length !== 6) {
      this.setData({ groupError: '请输入完整的6位编组编号' })
      return
    }
    this.setData({ groupError: '' })
    try {
      const data = await api.get(`/api/groups/by-code/${code}`)
      this.setData({ group: data, groupError: '' })
    } catch {
      this.setData({ groupError: '未找到该编组编号，请确认后重试' })
    }
  },

  async pay() {
    await api.post(`/api/groups/${this.data.group.id}/pay`, {})
    const data = await api.get(`/api/groups/${this.data.group.id}`)
    this.setData({ group: data })
    wx.showToast({ title: '付款成功', icon: 'success' })
  },

  async download() {
    const data = await api.get(`/api/groups/${this.data.group.id}/download`)
    wx.showModal({ title: '原图链接', content: (data.originals || []).join('\n'), showCancel: false })
  },

  backToSearch() {
    this.setData({ group: null, code: '', groupError: '' })
  },

  // ===== 自助打印 =====

  // Step 1: 选类型
  selectType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ printType: type, selfStep: 2, selfError: '' })
  },

  toggleColor(e) {
    this.setData({ colorMode: e.currentTarget.dataset.mode })
  },

  // Step 2: 选照片 / 选文件
  choosePhotos() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ photos: res.tempFiles, selfStep: 3, selfError: '' })
      }
    })
  },

  chooseDoc() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
      success: (res) => {
        const f = res.tempFiles[0]
        this.setData({
          docFile: { name: f.name, size: f.size, tempFilePath: f.path },
          selfStep: 3,
          selfError: ''
        })
      },
      fail: () => {
        wx.showToast({ title: '请从聊天记录中选择文件', icon: 'none', duration: 2500 })
      }
    })
  },

  // Step 3: 选规格
  onSizeChange(e) { this.setData({ sizeIndex: Number(e.detail.value) }) },
  onCountInput(e) {
    const v = parseInt(e.detail.value)
    this.setData({ count: isNaN(v) || v < 1 ? 1 : v > 99 ? 99 : v })
  },
  onPrinterChange(e) { this.setData({ printerIndex: Number(e.detail.value) }) },

  goToPreview() {
    if (this.data.printType === 'photo') {
      this.getPreview()
    } else {
      // 文件打印跳过排版，直接确认
      this.setData({ selfStep: 4 })
    }
  },

  getPreview() {
    const { photos, sizes, sizeIndex } = this.data
    if (!photos.length) return
    this.setData({ uploading: true, selfError: '' })

    wx.uploadFile({
      url: app.globalData.apiBase + '/api/print/layout',
      filePath: photos[0].tempFilePath,
      name: 'images',
      formData: { size: sizes[sizeIndex] },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.preview_url) {
            this.setData({
              previewUrl: app.globalData.apiBase + data.preview_url,
              selfStep: 4,
              uploading: false
            })
          } else {
            this.setData({ selfError: data.error || '排版生成失败', uploading: false })
          }
        } catch {
          this.setData({ selfError: '服务器返回异常', uploading: false })
        }
      },
      fail: () => {
        this.setData({ selfError: '上传失败，请检查网络连接', uploading: false })
      }
    })
  },

  // Step 4: 提交
  async submitJob() {
    const { printers, printerIndex, sizes, sizeIndex, count, previewUrl, printType, colorMode, docFile } = this.data
    if (!printers.length) {
      wx.showToast({ title: '暂无可用打印机', icon: 'none' })
      return
    }
    const printer = printers[printerIndex]
    const spec = {
      type: printType,
      size: sizes[sizeIndex],
      count,
      ...(printType === 'doc' ? { colorMode, fileName: docFile?.name } : {})
    }
    try {
      const res = await api.post('/api/print/self-service', {
        printer_id: printer.id,
        spec,
        layout_preview_url: previewUrl || null,
        submitted_by: wx.getStorageSync('phone') || 'weapp-user'
      })
      this.setData({ jobId: res.id, jobStatus: res.status, selfStep: 5 })
      this._pollJob(res.id)
    } catch {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    }
  },

  _pollJob(id) {
    const poll = () => {
      api.get(`/api/print/jobs/${id}`, false).then(data => {
        this.setData({ jobStatus: data.status })
        if (data.status === 'pending' || data.status === 'printing') {
          setTimeout(poll, 3000)
        }
      }).catch(() => {})
    }
    setTimeout(poll, 3000)
  },

  resetSelf() {
    this.setData({
      selfStep: 1, printType: '', colorMode: 'color',
      photos: [], docFile: null, previewUrl: '',
      jobId: '', jobStatus: '', selfError: '',
      sizeIndex: 4, count: 1
    })
  },

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }
})
