const ENV_ID = 'prod-6g39sp0y80fc48c9';
const SERVICE = 'express-q5dl';

App({
  globalData: {
    apiBase: "https://api.weiwu.space",
    token: "",
    cart: [],
    pendingOrder: null,
    pendingItems: null,
    openid: ""
  },
  onLaunch() {
    wx.cloud.init({ env: ENV_ID });
    // 先读缓存，消除首次进入支付时 openid 为空的问题
    const cached = wx.getStorageSync('__openid');
    if (cached) this.globalData.openid = cached;
    this.loginForOpenid();
  },
  loginForOpenid() {
    const e = this;
    // 暴露 Promise，支付流程可 await 等待 openid 就绪
    e.globalData.openidReady = new Promise((resolve) => {
      wx.login({
        success(o) {
          if (!o.code) { resolve(e.globalData.openid || ''); return; }
          wx.request({
            url: e.globalData.apiBase + '/api/payment/login',
            method: 'POST',
            header: { 'Content-Type': 'application/json' },
            data: { code: o.code },
            success(res) {
              if (res.statusCode === 200 && res.data.openid) {
                e.globalData.openid = res.data.openid;
                wx.setStorageSync('__openid', res.data.openid);
                resolve(res.data.openid);
              } else {
                resolve(e.globalData.openid || '');
              }
            },
            fail() { resolve(e.globalData.openid || ''); }
          });
        },
        fail() { resolve(e.globalData.openid || ''); }
      });
    });
  }
});
