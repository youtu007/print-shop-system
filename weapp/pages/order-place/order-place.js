const api = require("../../utils/api");
Page({
  data: { items: [], totalQty: 0, totalPrice: "0.00", form: { name: "", phone: "", address: "" } },
  onLoad() {
    const t = getApp().globalData;
    let e = t.pendingItems || (t.pendingOrder ? [{ ...t.pendingOrder }] : null);
    if (!e || !e.length) return void wx.navigateBack();
    e = e.map(t => ({ ...t, subtotal: (t.price * t.qty).toFixed(2) }));
    const a = e.reduce((t, e) => t + e.qty, 0);
    const o = e.reduce((t, e) => t + e.price * e.qty, 0).toFixed(2);
    const addresses = wx.getStorageSync('address_book') || [];
    const def = addresses.find(a => a.isDefault) || addresses[0];
    const phone = wx.getStorageSync('user_phone') || '';
    const name = wx.getStorageSync('user_name') || '';
    const form = def
      ? { name: def.name, phone: def.phone, address: def.address }
      : { name, phone, address: '' };
    this.setData({ items: e, totalQty: a, totalPrice: o, form });
  },
  goAddressBook() {
    wx.navigateTo({ url: '/pages/address-book/address-book?select=1' });
  },
  onInput(t) {
    const e = { ...this.data.form };
    e[t.currentTarget.dataset.field] = t.detail.value;
    this.setData({ form: e });
  },
  async placeOrder() {
    const { name, phone, address } = this.data.form;
    if (!name || !phone || !address) {
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return;
    }
    const _app = getApp();
    let openid = _app.globalData.openid;
    if (!openid && _app.globalData.openidReady) openid = await _app.globalData.openidReady;
    if (!openid) {
      wx.showToast({ title: "登录状态异常，请重启小程序", icon: "none" });
      return;
    }
    const totalAmount = parseFloat(this.data.totalPrice);
    wx.showLoading({ title: "下单中...", mask: true });
    try {
      const order = await api.post("/api/shop/orders", {
        customer_name: name, phone, address,
        items: this.data.items.map(t => ({ id: t.id, name: t.name, qty: t.qty, price: t.price, file_info: t.file_info || null })),
        total_price: totalAmount
      });
      // 下单成功立刻保存订单ID，不等支付，防止支付失败后订单消失
      const _saved = wx.getStorageSync("my_orders") || [];
      _saved.unshift(order.id);
      wx.setStorageSync("my_orders", _saved.slice(0, 50));
      // tabBar 红点提醒
      try { wx.setTabBarBadge({ index: 2, text: '新' }); } catch(e) {}
      // 保存下单手机号，用于"我的订单"按手机号查询
      const _phones = wx.getStorageSync("order_phones") || [];
      if (phone && !_phones.includes(phone)) _phones.unshift(phone);
      wx.setStorageSync("order_phones", _phones.slice(0, 5));
      const prepayRes = await api.post("/api/payment/prepay", {
        openid, order_id: order.id, order_type: "shop",
        description: "商城订单", total_amount: totalAmount
      });
      wx.hideLoading();
      await this._requestPayment(prepayRes);
      // 支付成功
      const app = getApp();
      const itemIds = new Set(this.data.items.map(t => t.id));
      app.globalData.cart = (app.globalData.cart || []).filter(t => !itemIds.has(t.id));
      app.globalData.pendingItems = null;
      app.globalData.pendingOrder = null;
      wx.showToast({ title: "支付成功", icon: "success" });
      setTimeout(() => { wx.redirectTo({ url: `/pages/order/order?id=${order.id}` }); }, 800);
    } catch (err) {
      wx.hideLoading();
      if (err && err.errMsg && err.errMsg.includes("cancel")) {
        wx.showToast({ title: "已取消支付", icon: "none" });
      } else {
        wx.showToast({ title: (err && (err.error || err.errMsg)) || "操作失败，请重试", icon: "none", duration: 4000 });
      }
    }
  },
  _requestPayment(p) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: p.timeStamp, nonceStr: p.nonceStr,
        package: p.package, signType: p.signType || "RSA",
        paySign: p.paySign, success: resolve, fail: reject
      });
    });
  }
});
