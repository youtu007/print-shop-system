const api = require("../../utils/api");
Page({
  data: {
    products: [], orderId: "", loading: true, errMsg: "",
    showActionSheet: false, selectedProduct: null,
    fileInfo: null, uploading: false, computedPrice: null, editPageCount: 0
  },
  async onLoad() {
    try {
      const t = await api.get("/api/shop/products", false);
      this.setData({ products: t, loading: false, errMsg: "" });
    } catch(e) {
      const msg = (e && e.errMsg) || (e && e.message) || "请求失败";
      this.setData({ loading: false, errMsg: msg });
      wx.showToast({ title: msg, icon: "none", duration: 3000 });
    }
  },
  onPullDownRefresh() {
    this.setData({ loading: true, errMsg: "" });
    this.onLoad().finally(() => wx.stopPullDownRefresh());
  },
  tapAdd(t) {
    if (!wx.getStorageSync('user_phone')) {
      wx.navigateTo({ url: '/pages/user-login/user-login' });
      return;
    }
    const idx = t.currentTarget.dataset.idx;
    const product = this.data.products[idx];
    this.setData({
      selectedProduct: product, showActionSheet: true,
      fileInfo: null, uploading: false, computedPrice: null, editPageCount: 0
    });
  },
  closeSheet() {
    this.setData({ showActionSheet: false, selectedProduct: null, fileInfo: null, uploading: false, computedPrice: null });
  },
  chooseFile() {
    const that = this;
    const product = this.data.selectedProduct;
    if (product.file_type === 'photo') {
      wx.chooseMedia({
        count: 9, mediaType: ['image'], sourceType: ['album', 'camera'],
        success(res) { that._uploadFile(res.tempFiles[0].tempFilePath); }
      });
    } else {
      wx.chooseMessageFile({
        count: 1, type: 'file',
        extension: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
        success(res) { that._uploadFile(res.tempFiles[0].path); }
      });
    }
  },
  _uploadFile(filePath) {
    this.setData({ uploading: true });
    const product = this.data.selectedProduct;
    api.uploadFile('/api/shop/upload-file', filePath, 'file').then(result => {
      if (product.file_type === 'photo') {
        // 照片按版计价，不乘页数
        this.setData({ uploading: false, fileInfo: result, editPageCount: 1, computedPrice: product.price.toFixed(2) });
      } else {
        const price = (result.page_count * product.price).toFixed(2);
        this.setData({ uploading: false, fileInfo: result, editPageCount: result.page_count, computedPrice: price });
      }
    }).catch(() => {
      this.setData({ uploading: false });
      wx.showToast({ title: '上传失败，请重试', icon: 'none' });
    });
  },
  onPageCountInput(e) {
    const count = parseInt(e.detail.value) || 1;
    const price = (count * this.data.selectedProduct.price).toFixed(2);
    this.setData({ editPageCount: count, computedPrice: price });
  },
  addToCart() {
    const product = this.data.selectedProduct;
    if (product.need_file && !this.data.fileInfo) {
      wx.showToast({ title: '请先上传文件', icon: 'none' });
      return;
    }
    const cart = getApp().globalData.cart || [];
    const item = { ...product, qty: 1 };
    if (product.need_file && this.data.fileInfo) {
      item.file_info = { ...this.data.fileInfo, page_count: this.data.editPageCount, computed_price: parseFloat(this.data.computedPrice) };
      if (product.file_type === 'photo') {
        item.price = product.price; // 照片按版计价
      } else if (product.price_unit === 'per_page') {
        item.price = parseFloat(this.data.computedPrice); // 文档按张数计价
      }
      item._cart_key = product.id + '_' + Date.now();
      cart.push(item);
    } else {
      const idx = cart.findIndex(e => e.id === product.id && !e.file_info);
      idx >= 0 ? cart[idx].qty += 1 : cart.push(item);
    }
    getApp().globalData.cart = cart;
    this.setData({ showActionSheet: false, selectedProduct: null, fileInfo: null });
    wx.showToast({ title: "已加入购物车", icon: "success" });
  },
  doOrderNow() {
    const product = this.data.selectedProduct;
    if (product.need_file && !this.data.fileInfo) {
      wx.showToast({ title: '请先上传文件', icon: 'none' });
      return;
    }
    const item = { ...product, qty: 1 };
    if (product.need_file && this.data.fileInfo) {
      item.file_info = { ...this.data.fileInfo, page_count: this.data.editPageCount, computed_price: parseFloat(this.data.computedPrice) };
      if (product.file_type === 'photo') { item.price = product.price; } else if (product.price_unit === 'per_page') { item.price = parseFloat(this.data.computedPrice); }
    }
    getApp().globalData.pendingItems = [item];
    getApp().globalData.pendingOrder = null;
    this.setData({ showActionSheet: false, selectedProduct: null, fileInfo: null });
    wx.navigateTo({ url: "/pages/order-place/order-place" });
  },
  viewOrder() { wx.navigateTo({ url: `/pages/order/order?id=${this.data.orderId}` }); }
});
