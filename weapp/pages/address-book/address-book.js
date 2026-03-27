Page({
  data: {
    addresses: [],
    selectMode: false,
    showForm: false,
    form: { name: '', phone: '', address: '', isDefault: false },
    editingId: ''
  },
  onLoad(options) {
    this.setData({ selectMode: options.select === '1' });
  },
  onShow() {
    this.loadAddresses();
  },
  loadAddresses() {
    const addresses = wx.getStorageSync('address_book') || [];
    this.setData({ addresses });
  },
  openAdd() {
    this.setData({ showForm: true, form: { name: '', phone: '', address: '', isDefault: false }, editingId: '' });
  },
  openEdit(e) {
    const addr = this.data.addresses[e.currentTarget.dataset.idx];
    this.setData({ showForm: true, form: { ...addr }, editingId: addr.id });
  },
  closeForm() {
    this.setData({ showForm: false });
  },
  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },
  toggleDefault(e) {
    this.setData({ 'form.isDefault': e.detail.value });
  },
  saveAddress() {
    const { form, editingId } = this.data;
    if (!form.name || !/^1\d{10}$/.test(form.phone) || !form.address) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    let addresses = wx.getStorageSync('address_book') || [];
    if (form.isDefault) {
      addresses = addresses.map(a => ({ ...a, isDefault: false }));
    }
    if (editingId) {
      const idx = addresses.findIndex(a => a.id === editingId);
      if (idx >= 0) addresses[idx] = { ...form, id: editingId };
    } else {
      // 第一条地址自动设为默认
      if (addresses.length === 0) form.isDefault = true;
      addresses.push({ ...form, id: Date.now().toString() });
    }
    wx.setStorageSync('address_book', addresses);
    this.setData({ showForm: false, addresses });
    wx.showToast({ title: '保存成功', icon: 'success' });
  },
  deleteAddress(e) {
    const idx = e.currentTarget.dataset.idx;
    wx.showModal({
      title: '确认删除',
      content: '确定删除该地址？',
      success: res => {
        if (res.confirm) {
          const addresses = [...this.data.addresses];
          addresses.splice(idx, 1);
          wx.setStorageSync('address_book', addresses);
          this.setData({ addresses });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },
  setDefault(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    const addresses = this.data.addresses.map((a, i) => ({ ...a, isDefault: i === idx }));
    wx.setStorageSync('address_book', addresses);
    this.setData({ addresses });
  },
  selectAddress(e) {
    if (!this.data.selectMode) return;
    const addr = this.data.addresses[e.currentTarget.dataset.idx];
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev && prev.setData) {
      prev.setData({ form: { name: addr.name, phone: addr.phone, address: addr.address } });
    }
    wx.navigateBack();
  }
});
