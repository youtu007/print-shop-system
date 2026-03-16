# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个打印店演示系统，包含三个子项目：
- **server/** — Express + SQLite 后端 API
- **web/** — Vue 3 管理/顾客前端
- **weapp/** — 微信小程序客户端

## 常用命令

### 后端开发
```bash
npm install          # 安装根目录依赖
npm run dev          # 启动开发服务器（nodemon，监听文件变化）
npm start            # 启动生产服务器
# 服务运行在 http://localhost:3000
```

### Web 前端开发
```bash
cd web
npm install
npm run dev          # 启动 Vite 开发服务器（http://localhost:5173）
npm run build        # 构建到 web/dist/（生产模式由 Express 静态托管）
```

### 微信小程序
- 用微信开发者工具打开 `weapp/` 目录
- API 地址在 `weapp/app.js` 的 `globalData.apiBase` 中硬编码为 `http://localhost:3000`

### 演示账号
- 用户名：`admin`，密码：`admin123`
- 首次启动时自动创建种子数据（3 台打印机、25+ 商品）

## 架构概览

### 后端（server/）

**路由与职责：**
- `routes/auth.js` — 登录/登出，返回 JWT
- `routes/printers.js` — 打印机 CRUD 与状态管理
- `routes/groups.js` — 照片分组上传与付款
- `routes/print.js` — 打印任务提交与布局预览
- `routes/shop.js` — 商品与订单管理
- `routes/admin.js` — 管理员账号与权限管理

**认证：**
- JWT（密钥硬编码为 `'printer-demo-secret'`）
- 角色：`super`（全权）、`printer_op`（仅限已授权打印机）、`shop_op`（商城管理）
- `printer_op` 通过 `admin_printer_access` 关联表限制可访问的打印机

**数据库（SQLite via better-sqlite3）：**
- `db.js` 自动建表并插入种子数据
- 主要表：`admins`、`admin_printer_access`、`printers`、`photo_groups`、`print_jobs`、`shop_products`、`shop_orders`
- `photo_groups.photos` 和 `shop_orders.items` 以 JSON 字符串存储

**文件处理：**
- Multer 处理文件上传，保存到 `uploads/`
- Sharp 生成布局预览图（自动排版）和证件照网格（4×2）

### Web 前端（web/src/）

- **路由**（`router/index.js`）：`/admin/*` 路由需要认证，其余为公开路由
- **状态管理**（`stores/auth.js`）：Pinia 管理 token 与角色
- **API 客户端**（`api/index.js`）：Axios 拦截器自动注入 `Authorization: Bearer` 头
- Vite 将 `/api/*` 和 `/uploads/*` 代理到 `http://localhost:3000`

### 微信小程序（weapp/）

- **全局状态**（`app.js` 的 `globalData`）：`apiBase`、`token`、`cart`、`pendingOrder`
- **API 封装**（`utils/api.js`）：Promise 包装 `wx.request`，自动注入 token 与 loading 提示
- **TabBar**：打印 / 商城 / 我的

## 核心业务流程

**自助打印：** 上传文件 → POST `/api/print/layout`（Sharp 生成预览）→ POST `/api/print/self-service`（创建任务）→ 轮询 GET `/api/print/jobs/:id`

**照片分组：** 管理员上传 → 生成 6 位取件码 → 顾客凭码查看 → 付款后可下载原图

**商城订单：** 浏览商品 → 提交订单（POST `/api/shop/orders`）→ 顾客轮询状态 → 管理员更新配送状态（packing → shipping → delivered）
