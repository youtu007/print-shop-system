<template>
  <div class="shop-page">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">商品管理</h1>
        <p class="page-sub">管理商城商品</p>
      </div>
      <button class="btn-primary" @click="openModal()">+ 添加商品</button>
    </div>

    <!-- 商品列表 -->
    <div class="card">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="products.length === 0" class="empty-tip">暂无商品</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>商品名称</th>
            <th>价格</th>
            <th>库存</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id">
            <td>
              <div class="product-info">
                <div class="product-name">{{ product.name }}</div>
                <div class="product-desc text-sm text-secondary">{{ product.description }}</div>
              </div>
            </td>
            <td>¥{{ product.price }}</td>
            <td>{{ product.stock }}</td>
            <td>
              <span class="badge" :class="product.active ? 'badge-success' : 'badge-error'">
                {{ product.active ? '上架' : '下架' }}
              </span>
            </td>
            <td>
              <div class="action-btns">
                <button class="btn-ghost" @click="openModal(product)">编辑</button>
                <button
                  class="btn-ghost"
                  @click="toggleActive(product)"
                >
                  {{ product.active ? '下架' : '上架' }}
                </button>
                <button class="btn-danger" @click="deleteProduct(product.id)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-title">{{ editingProduct ? '编辑商品' : '添加商品' }}</div>
        <form @submit.prevent="submitProduct" class="modal-form">
          <div class="field">
            <label class="field-label">商品名称</label>
            <input v-model="form.name" class="input" required />
          </div>
          <div class="field">
            <label class="field-label">描述</label>
            <textarea v-model="form.description" class="input textarea" rows="3"></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label">价格 (元)</label>
              <input v-model.number="form.price" type="number" step="0.01" class="input" required />
            </div>
            <div class="field">
              <label class="field-label">库存</label>
              <input v-model.number="form.stock" type="number" class="input" required />
            </div>
          </div>
          <div class="field">
            <label class="checkbox-label">
              <input v-model="form.active" type="checkbox" />
              上架状态
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="showModal = false">取消</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const loading = ref(true)
const products = ref([])
const showModal = ref(false)
const editingProduct = ref(null)
const submitting = ref(false)
const form = ref({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  active: true
})

const loadProducts = async () => {
  try {
    products.value = await api.get('/shop/products')
  } catch (err) {
    console.error('Failed to load products:', err)
  } finally {
    loading.value = false
  }
}

const openModal = (product = null) => {
  editingProduct.value = product
  if (product) {
    form.value = { ...product }
  } else {
    form.value = {
      name: '',
      description: '',
      price: 0,
      stock: 0,
      active: true
    }
  }
  showModal.value = true
}

const submitProduct = async () => {
  submitting.value = true
  try {
    if (editingProduct.value) {
      await api.put(`/shop/products/${editingProduct.value.id}`, form.value)
    } else {
      await api.post('/shop/products', form.value)
    }
    await loadProducts()
    showModal.value = false
  } catch (err) {
    alert(err?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

const toggleActive = async (product) => {
  try {
    await api.put(`/shop/products/${product.id}`, { active: !product.active })
    await loadProducts()
  } catch (err) {
    alert(err?.error || '操作失败')
  }
}

const deleteProduct = async (id) => {
  if (!confirm('确定要删除这个商品吗？')) return
  try {
    await api.delete(`/shop/products/${id}`)
    await loadProducts()
  } catch (err) {
    alert(err?.error || '删除失败')
  }
}

onMounted(loadProducts)
</script>

<style scoped>
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.product-info {
  display: flex;
  flex-direction: column;
}

.product-name {
  font-weight: 600;
}

.product-desc {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-btns {
  display: flex;
  gap: var(--space-sm);
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  width: 100%;
  max-width: 500px;
  box-shadow: var(--shadow-lg);
}

.modal-title {
  font-size: var(--font-lg);
  font-weight: 700;
  margin-bottom: var(--space-xl);
}

.field-row {
  display: flex;
  gap: var(--space-lg);
}

.field-row .field {
  flex: 1;
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  font-size: var(--font-base);
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-xl);
}

.loading {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-tertiary);
}
</style>
