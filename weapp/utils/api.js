const app = getApp()

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const token = app.globalData.token || wx.getStorageSync('token')
    wx.request({
      url: app.globalData.apiBase + path,
      method,
      data,
      header: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      success: res => resolve(res.data),
      fail: reject
    })
  })
}

module.exports = {
  get: (path) => request('GET', path),
  post: (path, data) => request('POST', path, data),
  put: (path, data) => request('PUT', path, data),
}
