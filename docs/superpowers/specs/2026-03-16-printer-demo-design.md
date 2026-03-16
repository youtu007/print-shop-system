# 打印机 Demo 设计文档

日期：2026-03-16

## 背景与目标

为客户/投资人演示的打印服务平台 demo，需要界面好看、流程完整、能演示完整业务。双端覆盖：Web 网页 + 微信小程序。

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 后端 | Express.js + SQLite（better-sqlite3） |
| Web 前端 | Vue 3 + Vite |
| 小程序 | 微信小程序（weapp） |
| 文件存储 | 本地 uploads/ 目录，Express 静态托管 |
| 支付 | 模拟支付（点击即标记已付款） |
| 配送地址 | 客户填写姓名+手机号+地址文字 |

## 整体架构

```
┌─────────────────────────────────────────────┐
│              客户端 / 前端                    │
│  ┌─────────────────┐  ┌───────────────────┐ │
│  │  Vue 3 Web 网页  │  │  微信小程序 weapp  │ │
│  └────────┬────────┘  └────────┬──────────┘ │
└───────────┼─────────────────────┼───────────┘
            │    HTTP REST API    │
┌───────────▼─────────────────────▼───────────┐
│              Express.js 后端                 │
│  打印机管理 | 相册编组 | 商城配送 | 排版     │
│  ┌──────────────────────────────────────┐   │
│  │         SQLite 数据库                │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

Web 打包后由 Express 直接托管，部署只需一个 Node 进程。

## 数据库结构

### admins（管理员）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| username | TEXT | 登录名 |
| password_hash | TEXT | 密码哈希 |
| role | TEXT | 'super' \| 'printer_op' \| 'shop_op' |
| created_at | INTEGER | 时间戳 |

### admin_printer_access（权限映射）
| 字段 | 类型 | 说明 |
|------|------|------|
| admin_id | TEXT FK | 管理员ID |
| printer_id | TEXT FK | 打印机ID |

### printers（打印机）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| name | TEXT | 打印机名称 |
| location | TEXT | 位置 |
| status | TEXT | 'online' \| 'offline' \| 'busy' |
| paper_remaining | INTEGER | 剩余纸张数 |
| last_heartbeat | INTEGER | 最后心跳时间戳 |

### photo_groups（相册编组）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| title | TEXT | 标题 |
| code | TEXT | 6位随机访问码 |
| uploaded_by | TEXT FK | 上传的管理员ID |
| is_paid | INTEGER | 0/1 |
| created_at | INTEGER | 时间戳 |
| photos | TEXT | JSON数组（缩略图+原图路径） |

### print_jobs（打印任务）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| type | TEXT | 'self_service' \| 'group' |
| printer_id | TEXT FK | 目标打印机 |
| group_id | TEXT FK | 关联编组（可空） |
| submitted_by | TEXT | 提交人标识（手机号或会话token，可空） |
| spec | TEXT | JSON（规格：1寸/2寸/3寸/5寸/6寸/A4，数量，方向） |
| layout_preview_url | TEXT | 排版预览图路径 |
| status | TEXT | 'pending' \| 'printing' \| 'done' |
| created_at | INTEGER | 时间戳 |

### shop_products（商品）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| name | TEXT | 商品名 |
| description | TEXT | 描述 |
| price | REAL | 价格 |
| image_url | TEXT | 商品图片 |

### shop_orders（商城订单）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| customer_name | TEXT | 姓名 |
| phone | TEXT | 手机号 |
| address | TEXT | 地址 |
| items | TEXT | JSON（商品+数量） |
| total_price | REAL | 总价 |
| is_paid | INTEGER | 0/1（下单即自动置为1，模拟支付完成） |
| delivery_status | TEXT | 'packing' \| 'shipping' \| 'delivered' |
| created_at | INTEGER | 时间戳 |

## 权限体系

| 角色 | 可访问模块 |
|------|-----------|
| super | 全部模块 + 账号管理（bypass admin_printer_access，无需映射表） |
| printer_op | 被分配的打印机（查 admin_printer_access）+ 相片编组上传 |
| shop_op | 商城订单 + 配送管理 |

`super` 角色在中间件中直接跳过 `admin_printer_access` 查询，可操作所有打印机。

## 后端 API

### 认证
- `POST /api/auth/login` — 登录，返回 JWT token
- `POST /api/auth/logout`

### 打印机
- `GET  /api/printers` — 列表（按权限过滤）
- `GET  /api/printers/:id` — 详情（含纸张余量）
- `PUT  /api/printers/:id` — 更新状态/纸张余量

### 打印机管理
- `POST /api/printers` — 创建打印机（仅super）
- `DELETE /api/printers/:id` — 删除打印机（仅super）

### 相册编组
- `POST /api/groups` — 管理员上传图片创建编组
- `GET  /api/groups` — 管理员查看编组列表
- `GET  /api/groups/by-code/:code` — 客户通过6位码查找编组（公开，未付款返回缩略图）
- `GET  /api/groups/:id` — 客户查看编组详情（未付款返回缩略图）
- `POST /api/groups/:id/pay` — 模拟支付（一次性解锁，后续打印无需再付）
- `GET  /api/groups/:id/download` — 付款后获取原图链接

### 打印
- `POST /api/print/self-service` — 自助打印提交
- `POST /api/print/layout` — 自动排版预览（multipart：`images[]` 图片文件 + `size` 规格 + `count` 数量，返回排版预览图 URL）
- `POST /api/print/id-photo` — 证件照处理（multipart：`image` 图片文件 + `size` 规格，返回裁剪排版后预览图 URL）
- `GET  /api/print/jobs/:id` — 客户查询打印任务状态

### 商城
- `GET  /api/shop/products` — 商品列表
- `POST /api/shop/products` — 新增商品（super 或 shop_op）
- `PUT  /api/shop/products/:id` — 编辑商品（super 或 shop_op）
- `DELETE /api/shop/products/:id` — 删除商品（super 或 shop_op）
- `POST /api/shop/orders` — 客户下单（下单即视为模拟支付完成，状态自动进入 packing）
- `GET  /api/shop/orders` — 管理员查看订单列表
- `GET  /api/shop/orders/:id` — 客户查看单个订单状态（公开）
- `PUT  /api/shop/orders/:id` — 管理员更新配送状态

### 管理员后台
- `GET  /api/admin/dashboard` — 汇总看板（在线打印机数、今日打印任务数、待处理订单数、编组总数）
- `GET  /api/admin/admins` — 查看管理员列表（仅super）
- `POST /api/admin/admins` — 创建子管理员（仅super）
- `PUT  /api/admin/admins/:id/access` — 分配打印机权限（仅super）

## 前端页面

### Web 端（Vue 3）

**客户端页面**
- `/` — 首页（品牌 banner + 功能入口）
- `/printers` — 打印机状态列表
- `/print/self` — 自助打印（上传→选规格→排版预览→提交）
- `/print/group` — 编组打印（输入编号→缩略图预览→付款→下载/打印）
- `/shop` — 商城（商品列表→下单→填写地址）
- `/shop/orders/:id` — 订单状态（配货中/配送中/已送达）

**管理端页面**
- `/admin/login` — 登录
- `/admin/dashboard` — 汇总看板
- `/admin/printers` — 打印机管理（状态+纸张余量）
- `/admin/groups` — 相册编组管理
- `/admin/orders` — 商城订单管理
- `/admin/accounts` — 账号权限管理（仅super）

### 小程序端（weapp）
- `pages/index` — 首页
- `pages/printers` — 打印机状态
- `pages/print` — 自助打印 + 编组打印（Tab切换）
- `pages/shop` — 商城
- `pages/order` — 订单状态
- `pages/admin` — 管理员入口

## 功能模块说明

### 支持的打印规格
统一规格列表：`1寸` `2寸` `3寸` `5寸` `6寸` `A4`

### 支付说明
- 相册编组：`is_paid` 为一次性解锁标记，付款后该编组可无限次打印和下载，无需重复付款。
- 商城订单：下单时即自动将 `is_paid` 置为 1（模拟支付），状态直接进入 `packing`。

### 认证说明
- 使用 JWT token，有效期 24 小时
- `POST /api/auth/logout` 为客户端登出，服务端不维护 token 黑名单，客户端清除 token 即可

### CORS 配置
开发环境下 Express 开启 CORS，允许 Vue dev server（默认 `localhost:5173`）跨域请求。生产环境由 Express 直接托管打包后的 Vue 静态文件，无跨域问题。

### 打印机心跳
演示环境中打印机状态由管理员手动更新（通过 `PUT /api/printers/:id`），`last_heartbeat` 在每次状态更新时刷新。无需后台自动心跳进程。

### 商品库存
Demo 阶段所有商品默认永远有货，`shop_products` 不设 `stock` 字段，简化演示流程。

### 自动排版
客户选择照片规格（见上方统一规格列表）和数量后，后端使用 sharp 库将多张照片自动排列在一张打印纸（A4 或 6寸）上，生成排版预览图返回给客户确认后再提交打印。

### 证件照功能
客户上传照片，选择证件照规格（1寸/2寸），后端裁剪为标准尺寸，自动排版为 8张/版或16张/版，通过 `POST /api/print/id-photo` 接口返回预览图。

### photos JSON 格式
`photo_groups.photos` 字段存储格式：
```json
[
  { "thumbnail": "uploads/thumb_abc123.jpg", "original": "uploads/orig_abc123.jpg" }
]
```

### 小程序管理员页面
`pages/admin` 仅提供登录入口和简化的管理功能（查看被分配的打印机状态、查看商城订单），完整管理功能引导至 Web 管理后台。

### 配送状态流转
```
packing（配货中）→ shipping（配送中）→ delivered（已送达）
```
管理员在后台手动更新，客户端轮询或刷新查看状态变化，配合进度条动画展示。

## UI 风格

- **配色**：奶白底 `#FFFBF5`，主色珊瑚粉 `#FF6B6B`，辅色薄荷绿 `#6BCB77`，点缀鹅黄 `#FFD93D`
- **圆角**：卡片 `16px`，按钮 `12px`
- **字体**：系统默认中文字体，标题加粗，行间距宽松
- **图标**：线条风卡通图标，每个功能模块配插画
- **动效**：轻微弹跳过渡，配送状态进度条颜色渐变

## 目录结构

```
121605打印机demo/
├── server/
│   ├── index.js          入口
│   ├── db.js             SQLite 初始化
│   ├── routes/
│   │   ├── auth.js
│   │   ├── printers.js
│   │   ├── groups.js
│   │   ├── print.js
│   │   ├── shop.js
│   │   └── admin.js
│   └── middleware/
│       └── auth.js       JWT 验证中间件
├── web/                  Vue 3 + Vite 项目
│   ├── src/
│   │   ├── views/
│   │   ├── components/
│   │   ├── stores/       Pinia 状态管理
│   │   └── api/          API 请求封装
│   └── vite.config.js
├── weapp/                微信小程序
│   └── pages/
├── uploads/              上传文件
├── data.db               SQLite 数据库文件
└── package.json
```
