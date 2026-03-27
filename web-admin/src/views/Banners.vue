<template>
  <div class="banners-page">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">轮播图管理</h1>
        <p class="page-sub">管理首页轮播图</p>
      </div>
      <button class="btn-primary" @click="openModal()">+ 添加轮播图</button>
    </div>

    <!-- 轮播图列表 -->
    <div class="card">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="banners.length === 0" class="empty-tip">暂无轮播图，点击上方按钮添加</div>
      <div v-else class="banner-grid">
        <div v-for="banner in banners" :key="banner.id" class="banner-card">
          <div class="banner-image">
            <img :src="banner.image_url" alt="" />
          </div>
          <div class="banner-info">
            <span class="banner-sort">排序: {{ banner.sort }}</span>
            <span v-if="banner.link" class="banner-link">链接: {{ banner.link }}</span>
          </div>
          <div class="banner-actions">
            <button class="btn-ghost" @click="openModal(banner)">编辑</button>
            <button class="btn-danger" @click="deleteBanner(banner.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-title">{{ editingBanner ? '编辑轮播图' : '添加轮播图' }}</div>
        <form @submit.prevent="submitBanner" class="modal-form">
          <!-- 图片上传区域 -->
          <div class="field">
            <label class="field-label">轮播图图片</label>
            <div class="upload-area" @click="selectImage" @dragover.prevent @drop.prevent="handleDrop">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleFileSelect"
              />
              <div v-if="uploading" class="upload-loading">上传中...</div>
              <div v-else-if="form.image_url" class="upload-preview">
                <img :src="form.image_url" alt="预览" />
                <div class="upload-tip">点击或拖拽更换图片</div>
              </div>
              <div v-else class="upload-placeholder">
                <div class="upload-icon">🖼️</div>
                <div class="upload-text">点击或拖拽上传图片</div>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="field-label">跳转链接（可选）</label>
            <input v-model="form.link" class="input" placeholder="点击轮播图跳转的页面URL" />
          </div>
          <div class="field">
            <label class="field-label">排序值</label>
            <input v-model.number="form.sort" type="number" class="input" placeholder="数字越小越靠前" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="showModal = false">取消</button>
            <button type="submit" class="btn-primary" :disabled="submitting || !form.image_url">
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
const banners = ref([])
const showModal = ref(false)
const editingBanner = ref(null)
const submitting = ref(false)
const uploading = ref(false)
const fileInput = ref(null)
const form = ref({
  image_url: '',
  link: '',
  sort: 0
})

const loadBanners = async () => {
  try {
    banners.value = await api.get('/shop/banners')
  } catch (err) {
    console.error('Failed to load banners:', err)
  } finally {
    loading.value = false
  }
}

const openModal = (banner = null) => {
  editingBanner.value = banner
  if (banner) {
    form.value = {
      image_url: banner.image_url,
      link: banner.link || '',
      sort: banner.sort || 0
    }
  } else {
    form.value = {
      image_url: '',
      link: '',
      sort: banners.value.length
    }
  }
  showModal.value = true
}

const selectImage = () => fileInput.value?.click()

const handleFileSelect = async (e) => {
  const file = e.target.files[0]
  if (file) await uploadImage(file)
}

const handleDrop = async (e) => {
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    await uploadImage(file)
  }
}

const uploadImage = async (file) => {
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('image', file)
    const res = await api.upload('/shop/banners/upload', formData)
    form.value.image_url = res.image_url
  } catch (err) {
    alert(err?.error || '上传失败')
  } finally {
    uploading.value = false
  }
}

const submitBanner = async () => {
  if (!form.value.image_url) {
    alert('请上传轮播图图片')
    return
  }
  submitting.value = true
  try {
    await api.post('/shop/banners', form.value)
    await loadBanners()
    showModal.value = false
  } catch (err) {
    alert(err?.error || '操作失败')
  } finally {
    submitting.value = false
  }
}

const deleteBanner = async (id) => {
  if (!confirm('确定要删除这个轮播图吗？')) return
  try {
    await api.delete(`/shop/banners/${id}`)
    await loadBanners()
  } catch (err) {
    alert(err?.error || '删除失败')
  }
}

onMounted(loadBanners)
</script>

<style scoped>
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.banner-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.banner-card {
  background: var(--color-bg-input);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.banner-image {
  height: 160px;
  background: var(--color-border);
}

.banner-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-info {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.banner-sort {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.banner-link {
  font-size: var(--font-xs);
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-actions {
  padding: 0 var(--space-md) var(--space-md);
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

.field {
  margin-bottom: var(--space-lg);
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-xl);
}

/* 上传区域 */
.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.upload-icon {
  font-size: 48px;
}

.upload-text {
  color: var(--color-text-secondary);
}

.upload-preview {
  width: 100%;
}

.upload-preview img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.upload-tip {
  font-size: var(--font-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-sm);
}

.upload-loading {
  color: var(--color-primary);
  font-weight: 600;
}

.loading {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-tertiary);
}
</style>
