<!-- web/src/views/admin/AdminGroups.vue -->
<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="section-title" style="margin-bottom:0">📸 相片编组</div>
      <router-link to="/admin" class="btn btn-ghost" style="font-size:13px">← 返回</router-link>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="section-title" style="font-size:15px">上传新编组</div>
      <input type="file" accept="image/*" multiple @change="onFiles" class="input" style="margin-bottom:10px"/>
      <input class="input" v-model="title" placeholder="编组名称" style="margin-bottom:10px"/>
      <button class="btn btn-primary" @click="upload" :disabled="!files.length">📤 上传</button>
      <div v-if="newGroup" style="margin-top:12px;padding:12px;background:#fff3e0;border-radius:10px;font-size:14px">
        ✅ 上传成功！访问码：<strong style="font-size:20px;color:var(--primary)">{{ newGroup.code }}</strong>
      </div>
    </div>
    <div class="grid-2">
      <div v-for="g in groups" :key="g.id" class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:700">{{ g.title }}</span>
          <span :class="['badge',g.is_paid?'badge-online':'badge-offline']">{{ g.is_paid?'已付款':'未付款' }}</span>
        </div>
        <div style="font-size:13px;color:var(--muted)">访问码：{{ g.code }}</div>
        <div style="font-size:13px;color:var(--muted)">{{ g.photos?.length || 0 }} 张照片</div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
          <img v-for="(p,i) in (g.photos||[]).slice(0,4)" :key="i" :src="p.thumbnail" style="width:48px;height:48px;object-fit:cover;border-radius:6px"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const groups = ref([]), files = ref([]), title = ref(''), newGroup = ref(null)

onMounted(async () => {
  const { data } = await api.get('/api/groups')
  groups.value = data
})

function onFiles(e) { files.value = Array.from(e.target.files) }

async function upload() {
  const fd = new FormData()
  files.value.forEach(f => fd.append('photos', f))
  fd.append('title', title.value || '未命名编组')
  const { data } = await api.post('/api/groups', fd)
  newGroup.value = data
  const { data: list } = await api.get('/api/groups')
  groups.value = list
  files.value = []; title.value = ''
}
</script>
