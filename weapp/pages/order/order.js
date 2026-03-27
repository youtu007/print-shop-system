const api = require("../../utils/api");
Page({
  data: { order: null, loading: true, error: "" },
  async onLoad(a) {
    if (!a.id) {
      this.setData({ loading: false, error: "订单ID缺失" });
      return;
    }
    try {
      const i = await api.get(`/api/shop/orders/${a.id}`);
      this.setData({ order: i, loading: false });
    } catch (e) {
      this.setData({ loading: false, error: (e && e.error) || "加载订单失败" });
    }
  }
});