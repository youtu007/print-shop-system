FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制源码
COPY server ./server

# uploads 目录（Sharp 生成的临时预览图）
RUN mkdir -p uploads

# 云托管默认端口 80
ENV PORT=80
EXPOSE 80

# 启动
CMD ["node", "server/index.js"]
