# 萌厨食光（lzyRecipe）服务器图片上传与静态托管扩展配置

本指南配合您的 `unified-cloud-sync`（Fastify 服务）与 Nginx，为手机端和桌面端提供高性能自建图片云存储服务。

---

## 1. Fastify 服务端代码实现

在 `server.js` 中增加图片上传接口（支持从手机端拍照或相册直传），并配置静态文件映射：

```js
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { join, extname } from 'node:path';

// 封面图片存储目录（根据您的服务器实际路径调整，例如 /data/covers）
const COVERS_DIR = process.env.COVERS_DIR || join(__dirname, 'public/covers');
if (!existsSync(COVERS_DIR)) {
  mkdirSync(COVERS_DIR, { recursive: true });
}

// 1. 注册文件上传插件（限制最大 10MB）
await app.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// 2. 注册静态资源直接访问：通过 https://sync.lzyszds.cn/covers/xxx.jpg 读取
await app.register(fastifyStatic, {
  root: COVERS_DIR,
  prefix: '/covers/',
  maxAge: '30d',
  immutable: true,
});

// 3. 上传接口：POST /upload
app.post('/upload', async (req, reply) => {
  // 可选鉴权：如果需要必须携带 Bearer Token
  // const hash = tokenHashOf(extractBearer(req.headers.authorization));
  // if (!hash) return unauthorized(reply, 'missing or invalid token');

  const data = await req.file();
  if (!data) {
    return reply.code(400).send({ ok: false, error: '未接收到上传的图片文件' });
  }

  // 校验图片后缀
  const rawExt = extname(data.filename || '').toLowerCase();
  const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(rawExt) ? rawExt : '.jpg';
  
  // 生成全局防重唯一文件名
  const filename = `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const savePath = join(COVERS_DIR, filename);

  try {
    await pipeline(data.file, createWriteStream(savePath));
    const host = req.headers.host || 'sync.lzyszds.cn';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const imageUrl = `${proto}://${host}/covers/${filename}`;

    return reply.send({
      ok: true,
      filename,
      url: imageUrl,
    });
  } catch (err) {
    req.log.error({ err }, 'save file failed');
    return reply.code(500).send({ ok: false, error: '图片保存失败' });
  }
});
```

---

## 2. Nginx 反代静态加速配置（推荐）

如果您前端有 Nginx 作为入口，直接让 Nginx 负责 `/covers/` 的静态文件发送，不经过 Node.js，速度更快且节省服务器内存：

```nginx
server {
    server_name sync.lzyszds.cn;

    # 1. 优先由 Nginx 直接向客户端返回图片文件，并设置 30 天强缓存
    location /covers/ {
        alias /data/covers/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
    }

    # 2. 上传接口以及同步接口转发给 Node/Fastify (端口 8788)
    location / {
        proxy_pass http://127.0.0.1:8788;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 支持 10MB 图片上传不报 413
        client_max_body_size 15m;
    }
}
```

---

## 3. 将工程里现有的 133 道菜谱图片上传至服务器

您只需将本地 `lzyRecipe/public/covers/` 下的全部图片复制到服务器的 `/data/covers/` 目录：

```bash
# 在本地 Mac 终端执行 rsync 一键传输所有封面
rsync -avzP public/covers/ root@your-server-ip:/data/covers/
```

传输完成后，手机端与 Web 端即可直接在线读取所有菜谱的高清封面，并自动缓存在手机磁盘中！
