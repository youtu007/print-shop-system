const app = getApp();

function request(method, path, data, showLoading = true) {
  return new Promise((resolve, reject) => {
    const token = app.globalData.token || wx.getStorageSync("token");
    if (showLoading) wx.showLoading({ title: "加载中", mask: true });
    wx.request({
      url: app.globalData.apiBase + path,
      method: method,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      data: data,
      success(res) {
        if (showLoading) wx.hideLoading();
        if (res.statusCode === 401) {
          wx.removeStorageSync("token");
          app.globalData.token = "";
          wx.showToast({ title: "请重新登录", icon: "none", duration: 2000 });
          reject(res.data);
        } else if (res.statusCode >= 400) {
          reject(res.data);
        } else {
          resolve(res.data);
        }
      },
      fail(err) {
        if (showLoading) wx.hideLoading();
        if (showLoading) wx.showToast({ title: "网络异常，请重试", icon: "none", duration: 2000 });
        reject(err);
      }
    });
  });
}

function uploadFile(path, filePath, name = "file") {
  return new Promise((resolve, reject) => {
    const token = app.globalData.token || wx.getStorageSync("token");
    wx.showLoading({ title: "上传中", mask: true });
    wx.uploadFile({
      url: app.globalData.apiBase + path,
      filePath: filePath,
      name: name,
      header: { "Authorization": token ? `Bearer ${token}` : "" },
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 401) {
          wx.removeStorageSync("token");
          app.globalData.token = "";
          wx.showToast({ title: "请重新登录", icon: "none", duration: 2000 });
          reject({ error: "unauthorized" });
        } else if (res.statusCode >= 400) {
          reject(JSON.parse(res.data));
        } else {
          resolve(JSON.parse(res.data));
        }
      },
      fail(err) {
        wx.hideLoading();
        wx.showToast({ title: "上传失败", icon: "none" });
        reject(err);
      }
    });
  });
}

module.exports = {
  get: (path, showLoading) => request("GET", path, undefined, showLoading),
  post: (path, data, showLoading) => request("POST", path, data, showLoading),
  put: (path, data, showLoading) => request("PUT", path, data, showLoading),
  delete: (path, showLoading) => request("DELETE", path, undefined, showLoading),
  uploadFile: uploadFile
};
