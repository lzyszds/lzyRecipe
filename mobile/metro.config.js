const { getDefaultConfig } = require('expo/metro-config');
const { URL } = require('url');
const config = getDefaultConfig(__dirname);

// 为 Web 开发端提供零跨域反向代理 (解决浏览器端测试 NVIDIA/OpenAI/搜图等 CORS 报错)
const originalEnhanceMiddleware = config.server.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const enhanced = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(metroMiddleware, server)
      : metroMiddleware;

    return async (req, res, next) => {
      // 捕获 /__proxy 请求
      if (req.url && req.url.startsWith('/__proxy')) {
        // 处理 CORS 预检请求 (OPTIONS)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Max-Age', '86400');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        try {
          const parsed = new URL(req.url, 'http://localhost:8081');
          const targetUrl = parsed.searchParams.get('url');

          if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing "url" query parameter' }));
            return;
          }

          // 读取请求体（如果是 POST/PUT 等）
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const bodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

          // 构造转发头
          const forwardHeaders = { ...req.headers };
          delete forwardHeaders.host;
          delete forwardHeaders.origin;
          delete forwardHeaders.referer;
          delete forwardHeaders['content-length'];
          delete forwardHeaders['connection'];
          delete forwardHeaders['sec-fetch-mode'];
          delete forwardHeaders['sec-fetch-site'];
          delete forwardHeaders['sec-fetch-dest'];
          delete forwardHeaders['sec-ch-ua'];
          delete forwardHeaders['sec-ch-ua-mobile'];
          delete forwardHeaders['sec-ch-ua-platform'];

          // Node 18+ 原生 fetch
          const remoteRes = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: (req.method !== 'GET' && req.method !== 'HEAD') ? bodyBuffer : undefined,
          });

          const resData = await remoteRes.arrayBuffer();

          const contentType = remoteRes.headers.get('content-type') || 'application/json';
          res.writeHead(remoteRes.status, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Content-Type': contentType,
          });
          res.end(Buffer.from(resData));
          return;
        } catch (err) {
          console.error('[Metro Proxy Error]:', err);
          res.writeHead(502, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ error: 'Proxy request failed: ' + (err.message || String(err)) }));
          return;
        }
      }

      return enhanced(req, res, next);
    };
  },
};

module.exports = config;
