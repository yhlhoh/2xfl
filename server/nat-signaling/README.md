# NAT 类型检测信令服务器

WebSocket 信令服务器，用于配合前端检测 NAT 类型。

## 安装

```bash
cd server/nat-signaling
npm install
```

## 运行

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

默认端口：`8080`

可通过环境变量修改：
```bash
PORT=3000 npm start
```

## 前端配置

在 `.env` 中配置信令服务器地址：

```
PUBLIC_NAT_SIGNALING_URL=ws://localhost:8080
```

## 消息协议

### 客户端 → 服务端

1. **SDP Offer**
```json
{
  "user-agent": "...",
  "sdp": "v=0\r\no=- ..."
}
```

2. **ICE 候选者**
```json
{
  "ice-candidate": "candidate:... typ srflx ..."
}
```

3. **心跳**
```json
{
  "type": "ping"
}
```

### 服务端 → 客户端

1. **SDP Answer**
```json
{
  "sdp": "v=0\r\no=- ..."
}
```

2. **ICE 候选者**
```json
{
  "ice-candidate": "candidate:..."
}
```

3. **NAT 检测结果**
```json
{
  "nat_type": "Full Cone",
  "public_ip": "1.2.3.4"
}
```

4. **错误**
```json
{
  "error": "错误信息"
}
```

## NAT 类型说明

| 类型 | 说明 | P2P 兼容性 |
|------|------|-----------|
| Full Cone | 完全锥形 | 最好 |
| Restricted Cone | 受限锥形 | 好 |
| Port Restricted Cone | 端口受限锥形 | 中等 |
| Symmetric | 对称型 | 差 |
| Blocked | 被阻止 | 无 |

## 部署

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

### PM2

```bash
npm install -g pm2
pm2 start index.js --name nat-signaling
```
