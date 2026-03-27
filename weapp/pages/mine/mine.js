const api = require("../../utils/api");
Page({
  data: {
    isLoggedIn: false,
    userPhone: '',
    userName: '',
    counts: { packing: 0, shipping: 0, delivered: 0 },
    cartCount: 0
  },
  onShow() {
    const phone = wx.getStorageSync('user_phone') || '';
    const name = wx.getStorageSync('user_name') || '';
    const masked = phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
    this.setData({ isLoggedIn: !!phone, userPhone: masked, userName: name });
    if (phone) {
      this.loadCounts();
      this.loadCart();
    }
  },
  async loadCounts() {
    const phone = wx.getStorageSync('user_phone') || '';
    const ids = wx.getStorageSync('my_orders') || [];
    if (!phone && !ids.length) return this.setData({ counts: { packing: 0, shipping: 0, delivered: 0 } });
    try {
      let orders = [];
      const seen = new Set();
      // 按手机号查
      if (phone) {
        const r = await api.get(`/api/shop/orders/by-phone?phone=${encodeURIComponent(phone)}`, false).catch(() => []);
        (r || []).forEach(o => { if (!seen.has(o.id)) { seen.add(o.id); orders.push(o); } });
      }
      // 按ID补充
      if (ids.length) {
        const extra = ids.filter(id => !seen.has(id));
        if (extra.length) {
          const r2 = await api.get(`/api/shop/orders/batch?ids=${extra.join(',')}`, false).catch(() => []);
          (r2 || []).forEach(o => { if (!seen.has(o.id)) { seen.add(o.id); orders.push(o); } });
        }
      }
      const e = { packing: 0, shipping: 0, delivered: 0 };
      orders.filter(o => o.is_paid).forEach(o => {
        if (o.delivery_status in e) e[o.delivery_status]++;
      });
      // 已收货：减去已读数量
      this._totalDelivered = e.delivered;
      const readDelivered = wx.getStorageSync('read_delivered_count') || 0;
      const newDelivered = e.delivered - readDelivered;
      e.delivered = newDelivered > 0 ? newDelivered : 0;
      this.setData({ counts: e });
      // tabBar 红点提醒
      const pending = e.packing + e.shipping;
      if (pending > 0) {
        wx.setTabBarBadge({ index: 2, text: String(pending) });
      } else {
        wx.removeTabBarBadge({ index: 2 });
      }
    } catch {}
  },
  loadCart() {
    const t = (getApp().globalData.cart || []).reduce((t, a) => t + a.qty, 0);
    this.setData({ cartCount: t });
  },
  goLogin() {
    wx.navigateTo({ url: '/pages/user-login/user-login' });
  },
  doLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定退出登录？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('user_phone');
          wx.removeStorageSync('user_name');
          this.setData({ isLoggedIn: false, userPhone: '', userName: '', counts: { packing: 0, shipping: 0, delivered: 0 }, cartCount: 0 });
        }
      }
    });
  },
  goOrders(t) {
    const a = t.currentTarget.dataset.status;
    const e = { ...this.data.counts };
    if (a === 'delivered') {
      // 标记已收货订单为已读
      const total = this._totalDelivered || 0;
      wx.setStorageSync('read_delivered_count', total);
      e.delivered = 0;
    } else if (a === 'shipping') e.shipping = 0;
    else if (a === 'packing') e.packing = 0;
    this.setData({ counts: e });
    wx.navigateTo({ url: `/pages/order-list/order-list?status=${a}` });
  },
  goAllOrders() {
    wx.navigateTo({ url: '/pages/order-list/order-list' });
  },
  goCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },
  goAddressBook() {
    wx.navigateTo({ url: '/pages/address-book/address-book' });
  },
  goAdminLogin() {
    wx.navigateTo({ url: '/pages/admin-login/admin-login' });
  }
});
