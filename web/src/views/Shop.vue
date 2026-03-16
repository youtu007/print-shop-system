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
          <button class="btn btn-primary" style="padding:6px 14px;font-size:13px" @click="addCart(p)">加入购物车</button>
        </div>
      </div>
    </div>

    <div v-if="cart.length" class="card">
      <div class="section-title">🛒 购物车</div>
      <div v-for="item in cart" :key="item.id" class="cart-row">
        <span>{{ item.name }}</span>
        <span>x{{ item.qty }}</span>
        <span>¥{{ (item.price * item.qty).toFixed(1) }}</span>
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" @click="removeCart(item)">移除</button>
      </div>
      <div style="border-top:1px solid #eee;padding-top:12px;margin-top:12px;font-weight:700">
        合计：¥{{ total.toFixed(1) }}
      </div>

      <div v-if="!showForm">
        <button class="btn btn-primary" style="width:100%;margin-top:12px" @click="showForm=true">去结算</button>
      </div>
      <div v-else style="margin-top:16px;display:flex;flex-direction:column;gap:10px">
        <input class="input" v-model="form.name" placeholder="姓名" />
        <input class="input" v-model="form.phone" placeholder="手机号" />
        <input class="input" v-model="form.address" placeholder="配送地址" />
        <button class="btn btn-green" @click="placeOrder">💳 模拟付款下单</button>
      </div>
    </div>

    <div v-if="orderId" style="margin-top:12px;padding:16px;background:#e8f9ec;border-radius:12px">
      ✅ 下单成功！<router-link :to="'/shop/orders/'+orderId" style="color:var(--primary);font-weight:700">查看订单状态 →</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const products = ref([]), cart = ref([]), showForm = ref(false), orderId = ref('')
const form = ref({ name:'', phone:'', address:'' })

const total = computed(() => cart.value.reduce((s,i) => s + i.price * i.qty, 0))

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

function addCart(p) {
  const existing = cart.value.find(i => i.id === p.id)
  if (existing) existing.qty++
  else cart.value.push({ ...p, qty: 1 })
}

function removeCart(item) { cart.value = cart.value.filter(i => i.id !== item.id) }

async function placeOrder() {
  const { data } = await api.post('/api/shop/orders', {
    customer_name: form.value.name,
    phone: form.value.phone,
    address: form.value.address,
    items: cart.value.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
    total_price: total.value
  })
  orderId.value = data.id
  cart.value = []
  showForm.value = false
}
</script>

<style scoped>
.product-card { display:flex; flex-direction:column; gap:8px; }
.product-img { font-size:40px; }
.product-name { font-weight:700; font-size:16px; }
.product-desc { color:var(--muted); font-size:13px; flex:1; }
.product-bottom { display:flex; justify-content:space-between; align-items:center; }
.product-price { font-size:18px; font-weight:800; color:var(--primary); }
.cart-row { display:flex; gap:12px; align-items:center; padding:8px 0; border-bottom:1px solid #f5f5f5; }
.cart-row span:first-child { flex:1; }
</style>
