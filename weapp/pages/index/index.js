Page({
  onLoad() {},
  goPage(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }) }
})
