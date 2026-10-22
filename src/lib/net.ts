import { isTauri } from './tauri';

export interface NetRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  /** 文本或二进制（二进制会转成 base64 传给原生层） */
  body?: string | Uint8Array;
  timeoutMs?: number;
  /** 仅浏览器模式用于取消请求 */
  signal?: AbortSignal;
}

export interface NetResponse {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  /** 原始字节，文本类内容由调用方自行解码 */
  body: Uint8Array;
  text(): string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * 统一网络请求：
 * - 桌面/安卓端走 Rust 的 http_request，没有 CORS 限制（AI、同步等第三方接口都需要）
 * - 浏览器预览没有原生层，退化为直接 fetch，跨域接口可能被浏览器拦截
 */
export async function request(req: NetRequest): Promise<NetResponse> {
  let status: number;
  let headers: Record<string, string> = {};
  let body: Uint8Array;

  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke<{
      status: number;
      headers: [string, string][];
      body_base64: string;
    }>('http_request', {
      request: {
        url: req.url,
        method: req.method ?? 'GET',
        headers: req.headers ? Object.entries(req.headers) : null,
        body: req.body ? (typeof req.body === 'string' ? req.body : bytesToBase64(req.body)) : null,
        body_base64: typeof req.body === 'string' || !req.body ? false : true,
        timeout_secs: req.timeoutMs ? Math.ceil(req.timeoutMs / 1000) : 60,
      },
    });
    status = res.status;
    headers = Object.fromEntries(res.headers);
    body = base64ToBytes(res.body_base64);
  } else {
    const controller = new AbortController();
    const timer = req.timeoutMs ? window.setTimeout(() => controller.abort(), req.timeoutMs) : undefined;
    try {
      const res = await fetch(req.url, {
        method: req.method ?? 'GET',
        headers: req.headers,
        body: req.body as BodyInit | undefined,
        signal: req.signal ?? controller.signal,
      });
      status = res.status;
      res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      body = new Uint8Array(await res.arrayBuffer());
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  return {
    status,
    ok: status >= 200 && status < 300,
    headers,
    body,
    text: () => new TextDecoder().decode(body),
  };
}

/** 发送 JSON 并解析 JSON 响应，非 2xx 时抛出服务端返回的错误信息 */
export async function requestJson<T>(
  url: string,
  options: Omit<NetRequest, 'url'> & { json?: unknown } = {}
): Promise<T> {
  const { json, headers, ...rest } = options;
  const res = await request({
    url,
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = res.text();
  if (!res.ok) {
    let message = text || `请求失败（HTTP ${res.status}）`;
    try {
      const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
      const err = parsed.error ?? parsed.message;
      if (typeof err === 'string') message = err;
      else if (err && typeof err === 'object' && 'message' in err) {
        message = String((err as { message: unknown }).message);
      }
    } catch {
      // 非 JSON 错误体，直接用原文
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : null) as T;
}
