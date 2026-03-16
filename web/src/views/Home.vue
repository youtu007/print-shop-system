<!-- web/src/views/Home.vue -->
<template>
  <div class="home">
    <div class="hero">
      <div class="hero-emoji">🖨️</div>
      <h1>打印小站</h1>
      <p>快速打印 · 相片分享 · 本地配送</p>
    </div>
    <div class="page">
      <div class="feature-grid">
        <router-link v-for="f in features" :key="f.to" :to="f.to" class="feature-card card">
          <div class="feature-icon">{{ f.icon }}</div>
          <div class="feature-title">{{ f.title }}</div>
          <div class="feature-desc">{{ f.desc }}</div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
const features = [
  { icon:'📄', title:'自助打印', desc:'上传文件，选规格，立即打印', to:'/print/self' },
  { icon:'📸', title:'编组相片', desc:'输入编号，付款后下载打印', to:'/print/group' },
  { icon:'🖨️', title:'打印机状态', desc:'查看附近打印机实时状态', to:'/printers' },
  { icon:'🛍️', title:'商城', desc:'相册、相纸，本地配送到家', to:'/shop' },
]
</script>

<style scoped>
.hero { background: linear-gradient(135deg,#ff6b6b22,#ffd93d22); text-align:center; padding:60px 20px; }
.hero-emoji { font-size:64px; margin-bottom:12px; }
.hero h1 { font-size:36px; font-weight:900; color:var(--primary); }
.hero p { color:var(--muted); margin-top:8px; font-size:17px; }
.feature-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-top:32px; }
.feature-card { text-decoration:none; color:var(--text); cursor:pointer; transition:transform .2s,box-shadow .2s; }
.feature-card:hover { transform:translateY(-4px); box-shadow:0 8px 24px rgba(0,0,0,.12); }
.feature-icon { font-size:40px; margin-bottom:12px; }
.feature-title { font-size:18px; font-weight:700; margin-bottom:6px; }
.feature-desc { color:var(--muted); font-size:14px; }
</style>
