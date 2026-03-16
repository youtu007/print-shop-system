<!-- web/src/views/Shop.vue -->
<template>
  <div class="page">
    <div class="section-title">🛍️ 商城</div>
    <div class="grid-2" style="margin-bottom:32px">
      <div v-for="p in products" :key="p.id" class="card product-card">
        <div class="product-img">{{ productEmoji(p.name) }}</div>
        <div class="product-name">{{ p.name }}</div>
        <div class="product-desc">{{ p.description }}</div>
        <div class="product-bottom">
          <span class="product-price">¥{{ p.price.toFixed(1) }}</span>
          <button class="btn btn-primary" style="padding:6px 14px;font-size:13px" @click="buyNow(p)">立即购买</button>
        </div>
      </div>
    </div>

    <div v-if="orderId" style="margin-top:12px;padding:16px;background:#e8f9ec;border-radius:12px">
      ✅ 下单成功！<router-link :to="'/shop/orders/'+orderId" style="color:var(--primary);font-weight:700">查看订单状态 →</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const products = ref([]), orderId = ref('')

onMounted(async () => {
  const { data } = await api.get('/api/shop/products')
  products.value = data
})

function productEmoji(name) {
  if (name.includes('证件')) return '🪪'
  if (name.includes('相册')) return '📚'
  if (name.includes('A4')) return '📄'
  return '🖼️'
}

function buyNow(p) {
  // 跳转到下单页面，携带商品信息
  window.location.hash = `/shop/order-place?productId=${p.id}`
}
</script>

<style scoped>
.product-card { display:flex; flex-direction:column; gap:8px; }
.product-img { font-size:40px; }
.product-name { font-weight:700; font-size:16px; }
.product-desc { color:var(--muted); font-size:13px; flex:1; }
.product-bottom { display:flex; justify-content:space-between; align-items:center; }
.product-price { font-size:18px; font-weight:800; color:var(--primary); }
</style>
