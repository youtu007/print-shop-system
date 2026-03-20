<template>
  <div class="groups-page">
    <div class="page-header">
      <h1 class="page-title">照片分组管理</h1>
      <p class="page-sub">上传照片生成取件码</p>
    </div>

    <!-- 上传区域 -->
    <div class="card mb-lg">
      <h3 class="section-subtitle">上传照片</h3>
      <div class="upload-area" @click="selectFiles" @dragover.prevent @drop.prevent="handleDrop">
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="image/*"
          style="display: none"
          @change="handleFileSelect"
        />
        <div class="upload-icon">📷</div>
        <div class="upload-text">点击或拖拽上传照片</div>
        <div class="upload-hint">支持 JPG、PNG 格式，最多30张</div>
      </div>

      <div v-if="selectedFiles.length > 0" class="selected-files">
        <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
          <span class="file-name">{{ file.name }}</span>
          <button class="btn-remove" @click="removeFile(index)">×</button>
        </div>
      </div>

      <button
        class="btn-primary w-full mt-lg"
        :disabled="uploading || selectedFiles.length === 0"
        @click="uploadGroup"
      >
        {{ uploading ? '上传中...' : '上传并生成取件码' }}
      </button>

      <!-- 上传成功显示取件码 -->
      <div v-if="generatedCode" class="code-result">
        <div class="code-label">取件码已生成：</div>
        <div class="code-value">{{ generatedCode }}</div>
      </div>
    </div>

    <!-- 分组列表 -->
    <div class="card">
      <h3 class="section-subtitle">分组列表</h3>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="groups.length === 0" class="empty-tip">暂无分组数据</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>取件码</th>
            <th>照片数</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="group in groups" :key="group.id">
            <td>
              <span class="code-highlight">{{ group.code }}</span>
            </td>
            <td>{{ (group.photos || []).length }} 张</td>
            <td>
              <span class="badge" :class="group.is_paid ? 'badge-success' : 'badge-warning'">
                {{ group.is_paid ? '已付款' : '待付款' }}
              </span>
            </td>
            <td>{{ formatTime(group.created_at) }}</td>
            <td>
              <button class="btn-ghost" @click="viewGroup(group)">查看</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 查看分组弹窗 -->
    <div v-if="viewingGroup" class="modal-mask" @click.self="viewingGroup = null">
      <div class="modal modal-lg">
        <div class="modal-title">分组详情 - 取件码 {{ viewingGroup.code }}</div>
        <div class="photos-grid">
          <div v-for="(photo, index) in viewingPhotos" :key="index" class="photo-item">
            <img :src="photoUrl(photo)" alt="" />
          </div>
        </div>
        <button class="btn-ghost w-full mt-lg" @click="viewingGroup = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const loading = ref(true)
const uploading = ref(false)
const groups = ref([])
const selectedFiles = ref([])
const fileInput = ref(null)
const viewingGroup = ref(null)
const viewingPhotos = ref([])
const generatedCode = ref('')

const selectFiles = () => fileInput.value?.click()

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  selectedFiles.value = [...selectedFiles.value, ...files]
}

const handleDrop = (e) => {
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  selectedFiles.value = [...selectedFiles.value, ...files]
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const uploadGroup = async () => {
  if (selectedFiles.value.length === 0) return

  uploading.value = true
  generatedCode.value = ''
  try {
    const formData = new FormData()
    selectedFiles.value.forEach(file => formData.append('photos', file))

    const res = await api.upload('/api/groups', formData)

    selectedFiles.value = []
    generatedCode.value = res.code
    await loadGroups()
  } catch (err) {
    alert((err && err.error) || '上传失败')
  } finally {
    uploading.value = false
  }
}

const loadGroups = async () => {
  try {
    groups.value = await api.get('/groups')
  } catch (err) {
    console.error('Failed to load groups:', err)
  } finally {
    loading.value = false
  }
}

const viewGroup = (group) => {
  viewingGroup.value = group
  viewingPhotos.value = group.photos || []
}

const photoUrl = (photo) => {
  // photo 结构是 { thumbnail: '/uploads/xxx', original: '/uploads/xxx' }
  return photo.thumbnail || photo
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(loadGroups)
</script>

<style scoped>
.section-subtitle {
  font-size: var(--font-md);
  font-weight: 600;
  margin-bottom: var(--space-lg);
}

.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
}

.upload-text {
  font-size: var(--font-base);
  color: var(--color-text-primary);
  margin-bottom: var(--space-xs);
}

.upload-hint {
  font-size: var(--font-sm);
  color: var(--color-text-tertiary);
}

.selected-files {
  margin-top: var(--space-lg);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--color-bg-input);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
}

.file-name {
  font-size: var(--font-sm);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-remove {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 0 4px;
}

.btn-remove:hover {
  color: var(--color-error);
}

.code-highlight {
  font-family: monospace;
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--color-primary);
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
  padding: var(--space-xl);
}

.modal {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-lg {
  max-width: 700px;
}

.modal-title {
  font-size: var(--font-lg);
  font-weight: 700;
  margin-bottom: var(--space-lg);
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--space-md);
}

.photo-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.loading {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-tertiary);
}

.code-result {
  margin-top: var(--space-lg);
  padding: var(--space-lg);
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
  text-align: center;
}

.code-label {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.code-value {
  font-family: monospace;
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 4px;
}
</style>
