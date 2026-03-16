<!-- web/src/App.vue -->
<template>
  <nav class="nav">
    <router-link to="/" class="nav-brand">🖨️ 打印小站</router-link>
    <div class="nav-links">
      <router-link to="/printers">打印机</router-link>
      <router-link to="/print/self">自助打印</router-link>
      <router-link to="/print/group">编组相片</router-link>
      <router-link to="/shop">商城</router-link>
      <router-link to="/admin">管理后台</router-link>
    </div>
  </nav>
  <router-view />
</template>

<style scoped>
.nav { display:flex; align-items:center; justify-content:space-between; padding:0 24px;
  height:56px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.06); position:sticky; top:0; z-index:100; }
.nav-brand { font-size:18px; font-weight:800; color:var(--primary); text-decoration:none; }
.nav-links { display:flex; gap:24px; }
.nav-links a { text-decoration:none; color:var(--text); font-weight:500; font-size:15px; }
.nav-links a.router-link-active { color:var(--primary); }
</style>
