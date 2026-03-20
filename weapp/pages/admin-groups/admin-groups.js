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

function uploadFile(path, filePath) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('admin_token')
    wx.uploadFile({
      url: app.globalData.apiBase + path,
      filePath,
      name: 'file',
      header: { Authorization: token ? `Bearer ${token}` : '' },
      success: res => {
        if (res.statusCode >= 400) {
          reject(JSON.parse(res.data))
        } else {
          resolve(JSON.parse(res.data))
        }
      },
      fail: reject
    })
  })
}

Page({
  data: {
    groups: [],
    loading: true,
    title: '',
    tempFiles: [],
    uploading: false,
    uploadProgress: '',
    lastCode: ''
  },

  onLoad() {
    const token = wx.getStorageSync('admin_token')
    if (!token) return wx.redirectTo({ url: '/pages/admin-login/admin-login' })
    this.loadGroups()
  },

  onPullDownRefresh() {
    this.loadGroups().then(() => wx.stopPullDownRefresh())
  },

  async loadGroups() {
    try {
      const groups = await request('GET', '/api/groups')
      // photos 是对象数组 [{ thumbnail, original }]，需要拼接完整 URL
      const groupsWithUrls = groups.map(g => {
        const d = new Date(g.created_at)
        return {
          ...g,
          photos: (g.photos || []).map(p => ({
            ...p,
            thumbnail: app.globalData.apiBase + p.thumbnail,
            original: app.globalData.apiBase + p.original
          })),
          created_at: `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
        }
      })
      this.setData({ groups: groupsWithUrls, loading: false })
    } catch {
      this.setData({ loading: false })
    }
  },

  onInputTitle(e) { this.setData({ title: e.detail.value }) },

  choosePhotos() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles.map(f => ({
          path: f.tempFilePath,
          size: f.size
        }))
        this.setData({ tempFiles: [...this.data.tempFiles, ...files].slice(0, 20) })
      }
    })
  },

  removeTemp(e) {
    const idx = e.currentTarget.dataset.idx
    const tempFiles = [...this.data.tempFiles]
    tempFiles.splice(idx, 1)
    this.setData({ tempFiles })
  },

  async doUpload() {
    const { tempFiles, title } = this.data
    if (!tempFiles.length) return wx.showToast({ title: '请先选择照片', icon: 'none' })

    this.setData({ uploading: true, uploadProgress: '0/' + tempFiles.length })

    try {
      const urls = []
      for (let i = 0; i < tempFiles.length; i++) {
        this.setData({ uploadProgress: (i + 1) + '/' + tempFiles.length })
        const res = await uploadFile('/api/groups/upload-temp', tempFiles[i].path)
        urls.push(res.url)
      }

      const result = await request('POST', '/api/groups/create-from-urls', {
        title: title || '照片编组',
        urls
      })

      this.setData({
        uploading: false,
        tempFiles: [],
        title: '',
        lastCode: result.code
      })
      wx.showToast({ title: '上传成功', icon: 'success' })
      this.loadGroups()
    } catch (err) {
      this.setData({ uploading: false })
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.lastCode,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  dismissCode() { this.setData({ lastCode: '' }) },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset
    // urls 是对象数组，需要提取 original 字段
    const urlList = urls.map(u => u.original)
    wx.previewImage({ current: url, urls: urlList })
  }
})
