const api = require('../../utils/api');
Page({
  data: { loading: false, agreed: false },
  toggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },
  goAgreement() {
    wx.navigateTo({ url: '/pages/agreement/agreement' });
  },
  goPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },
  onTapDisabled() {
    wx.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });
  },
  async onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '已取消授权', icon: 'none' });
      return;
    }
    const code = e.detail.code;
    if (!code) {
      wx.showToast({ title: '授权失败，请重试', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await api.post('/api/payment/user-phone', { code }, false);
      wx.setStorageSync('user_phone', res.phone);
      this.setData({ loading: false });
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/mine/mine' });
        }
      }, 800);
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  }
});
