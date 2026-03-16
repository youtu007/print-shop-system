# 打印小站 Demo

## 快速启动

### 后端
```bash
npm install
npm start        # http://localhost:3000
```

### Web 前端（开发模式）
```bash
cd web
npm install
npm run dev      # http://localhost:5173
```

### 微信小程序
用微信开发者工具打开 `weapp/` 目录。

## 演示账号
- 用户名：`admin`  密码：`admin123`

## 功能
1. 打印机状态（在线/离线/忙碌 + 纸张余量）
2. 相片编组（上传→6位访问码→付款→下载）
3. 自助打印（上传照片→自动排版预览→提交打印）
4. 证件照排版（1寸/2寸，8格自动排版）
5. 商城 + 本地配送状态（配货中/配送中/已送达）
6. 管理员权限体系（超级/打印机/商城管理员）

## 项目结构
```
server/      Express 后端 + SQLite
web/         Vue 3 前端
weapp/       微信小程序
uploads/     上传文件
data.db      SQLite 数据库（自动生成）
```
