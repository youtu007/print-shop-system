# 部署到微信云托管

## 方式一：本地开发测试

1. 安装 MySQL：
```bash
brew install mysql
brew services start mysql
```

2. 创建数据库：
```bash
mysql -u root -p
CREATE DATABASE printer_demo;
```

3. 修改 .env 中的数据库配置：
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=printer_demo
```

4. 启动服务：
```bash
npm install
npm run dev
```

---

## 方式二：部署到微信云托管

### 步骤 1：注册腾讯云
- 访问 https://cloud.tencent.com
- 注册账号并完成实名认证

### 步骤 2：开通云托管
- 进入微信开发者工具
- 点击云托管 → 开通服务
- 选择按量付费（默认有免费额度）

### 步骤 3：部署
在项目根目录执行：
```bash
# 安装腾讯云 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署
tcb service deploy -e 你的环境ID
```

或者直接在微信开发者工具中：
- 右键点击 cloudbase.yml
- 点击"上传并部署：云端安装依赖"

### 步骤 4：配置环境变量
在云托管控制台设置：
- `DB_HOST` - MySQL 主机地址
- `DB_PORT` - MySQL 端口
- `DB_USER` - MySQL 用户名
- `DB_PASSWORD` - MySQL 密码
- `DB_NAME` - 数据库名
- `JWT_SECRET` - JWT 密钥

### 步骤 5：获取域名
- 云托管会自动分配域名
- 在小程序 app.js 中将 apiBase 改为该域名

---

## 费用说明
- 云托管免费额度：约 100万次 API 调用/月
- MySQL 免费额度：1GB 存储
- 超出免费额度后：约 0-20元/月
