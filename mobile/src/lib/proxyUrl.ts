import { Platform } from 'react-native';

/**
 * 跨域代理包装器：
 * 1. 在 iOS / Android 原生端，原生网络栈不受浏览器 CORS 限制，直接请求原地址；
 * 2. 在 Web 端（浏览器调试），若请求第三方无 CORS 头的 API（如 NVIDIA NIM、OpenAI 或外链图片），
 *    自动通过本地 Metro 服务器反向代理中转，彻底消除 CORS 报错。
 */
export function wrapCorsProxy(targetUrl: string): string {
  // 原生设备端（iOS / Android）原生网络栈不受浏览器同源策略限制，直接请求真实地址
  if (Platform.OS !== 'web') {
    return targetUrl;
  }

  if (!targetUrl || typeof targetUrl !== 'string') {
    return targetUrl;
  }

  // 如果在 Web 浏览器环境
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;

    // 如果已经是本源请求或相对路径，无需代理
    if (targetUrl.startsWith(origin) || targetUrl.startsWith('/')) {
      return targetUrl;
    }

    // 针对任意外部跨域目标，均通过 Metro 反向代理中转
    return `${origin}/__proxy?url=${encodeURIComponent(targetUrl)}`;
  }

  return targetUrl;
}
