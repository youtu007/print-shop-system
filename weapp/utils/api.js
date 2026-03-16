const app = getApp()

function request(method, path, data, showLoad = true) {
  return new Promise((resolve, reject) => {
    const token = app.globalData.token || wx.getStorageSync('token')
    if (showLoad) wx.showLoading({ title: '加载中', mask: true })
    wx.request({
      url: app.globalData.apiBase + path,
      method,
      data,
      timeout: 8000,
      header: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      success: res => {
        if (showLoad) wx.hideLoading()
        if (res.statusCode >= 400) {
          reject(res.data)
        } else {
          resolve(res.data)
        }
      },
      fail: (err) => {
        if (showLoad) wx.hideLoading()
        wx.showToast({ title: '网络异常，请重试', icon: 'none', duration: 2000 })
        reject(err)
      }
    })
  })
}

module.exports = {
  get:  (path, showLoad)       => request('GET',    path, undefined, showLoad),
  post: (path, data, showLoad) => request('POST',   path, data,      showLoad),
  put:  (path, data, showLoad) => request('PUT',    path, data,      showLoad),
}
