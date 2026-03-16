<!-- web/src/views/PrintGroup.vue -->
<template>
  <div class="page">
    <div class="section-title">📸 编组相片</div>
    <div class="card" style="max-width:480px;margin:0 auto;">
      <div v-if="!group">
        <p style="margin-bottom:12px;color:var(--muted)">输入相片编号（6位数字）</p>
        <input class="input" v-model="code" placeholder="例如：123456" maxlength="6" style="margin-bottom:12px"/>
        <button class="btn btn-primary" style="width:100%" @click="lookup">🔍 查找相片</button>
        <p v-if="error" style="color:#e74c3c;margin-top:8px;font-size:14px">{{ error }}</p>
      </div>
      <div v-else>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span style="font-weight:700;font-size:17px">{{ group.title }}</span>
          <span :class="['badge', group.is_paid?'badge-online':'badge-offline']">{{ group.is_paid?'已付款':'未付款' }}</span>
        </div>
        <div class="photo-grid">
          <img v-for="(url,i) in displayPhotos" :key="i" :src="url" class="photo-thumb" />
        </div>
        <div v-if="!group.is_paid" style="margin-top:16px">
          <p style="color:var(--muted);font-size:14px;margin-bottom:10px">付款后可下载高清原图</p>
          <button class="btn btn-primary" style="width:100%" @click="pay">💳 立即付款（模拟）</button>
        </div>
        <div v-else style="margin-top:16px;display:flex;gap:10px">
          <button class="btn btn-green" style="flex:1" @click="download">⬇️ 下载原图</button>
          <button class="btn btn-ghost" style="flex:1" @click="reset">返回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../api'

const code = ref(''), group = ref(null), error = ref('')

const displayPhotos = computed(() =>
  group.value?.is_paid ? (group.value.images || []) : (group.value?.thumbnails || [])
)

async function lookup() {
  error.value = ''
  try {
    const { data } = await api.get(`/api/groups/by-code/${code.value}`)
    group.value = data
  } catch { error.value = '未找到该编号，请确认后重试' }
}

async function pay() {
  await api.post(`/api/groups/${group.value.id}/pay`)
  const { data } = await api.get(`/api/groups/${group.value.id}`)
  group.value = data
}

async function download() {
  const { data } = await api.get(`/api/groups/${group.value.id}/download`)
  alert('原图链接：\n' + data.originals.join('\n'))
}

function reset() { group.value = null; code.value = '' }
</script>

<style scoped>
.photo-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.photo-thumb { width:100%; aspect-ratio:1; object-fit:cover; border-radius:10px; }
</style>
