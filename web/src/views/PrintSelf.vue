<!-- web/src/views/PrintSelf.vue -->
<template>
  <div class="page">
    <div class="section-title">📄 自助打印</div>
    <div class="card" style="max-width:560px;margin:0 auto">
      <div style="margin-bottom:16px">
        <label style="font-weight:600;display:block;margin-bottom:6px">选择照片</label>
        <input type="file" accept="image/*" multiple @change="onFiles" class="input" />
      </div>
      <div style="margin-bottom:16px">
        <label style="font-weight:600;display:block;margin-bottom:6px">打印规格</label>
        <select v-model="size" class="input">
          <option v-for="s in sizes" :key="s">{{ s }}</option>
        </select>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-weight:600;display:block;margin-bottom:6px">选择打印机</label>
        <select v-model="printerId" class="input">
          <option v-for="p in printers" :key="p.id" :value="p.id">{{ p.name }} - {{ p.location }} ({{ p.status }})</option>
        </select>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:12px" @click="preview" :disabled="!files.length">
        🖼️ 生成排版预览
      </button>
      <div v-if="previewUrl" style="margin-bottom:16px">
        <img :src="previewUrl" style="width:100%;border-radius:12px;border:2px solid #eee" />
      </div>
      <div v-if="previewUrl">
        <input class="input" v-model="phone" placeholder="手机号（用于查询进度）" style="margin-bottom:10px"/>
        <button class="btn btn-green" style="width:100%" @click="submit">🖨️ 提交打印</button>
      </div>
      <div v-if="jobId" style="margin-top:12px;padding:12px;background:#e8f9ec;border-radius:10px;font-size:14px">
        ✅ 提交成功！任务ID：<strong>{{ jobId }}</strong>
        <button class="btn btn-ghost" style="margin-top:8px;width:100%;font-size:13px" @click="checkJob">🔄 查看打印进度</button>
        <div v-if="jobStatus" style="margin-top:6px;color:var(--muted)">状态：{{ jobStatusLabel[jobStatus] }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const sizes = ['1寸','2寸','3寸','5寸','6寸','A4']
const size = ref('6寸'), files = ref([]), printers = ref([])
const printerId = ref(''), previewUrl = ref(''), phone = ref(''), jobId = ref(''), jobStatus = ref('')
const jobStatusLabel = { pending:'等待中', printing:'打印中', done:'已完成' }

async function checkJob() {
  const { data } = await api.get(`/api/print/jobs/${jobId.value}`)
  jobStatus.value = data.status
}

onMounted(async () => {
  try {
    const { data } = await api.get('/api/printers/public')
    printers.value = data.filter(p => p.status !== 'offline')
    if (printers.value.length) printerId.value = printers.value[0].id
  } catch {}
})

function onFiles(e) { files.value = Array.from(e.target.files) }

async function preview() {
  const fd = new FormData()
  files.value.forEach(f => fd.append('images', f))
  fd.append('size', size.value)
  const { data } = await api.post('/api/print/layout', fd)
  previewUrl.value = data.preview_url
}

async function submit() {
  const { data } = await api.post('/api/print/self-service', {
    printer_id: printerId.value,
    spec: { size: size.value, count: files.value.length },
    layout_preview_url: previewUrl.value,
    submitted_by: phone.value || null
  })
  jobId.value = data.id
}
</script>
