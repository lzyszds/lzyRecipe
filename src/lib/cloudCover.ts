import { isTauri } from './tauri';
import { useSettingsStore, isCloudCoverConfigured } from '../store/settingsStore';

export async function generateCloudCover(
  recipeName: string,
  category?: string
): Promise<string | null> {
  const settings = useSettingsStore.getState();
  if (!isCloudCoverConfigured(settings)) return null;

  const name = recipeName.trim();
  const cat = category ?? '家常菜';

  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    try {
      if (settings.coverProvider === 'baidu') {
        return await invoke<string>('generate_cover_baidu', {
          recipeName: name,
          category: cat,
          apiKey: settings.baiduApiKey.trim(),
          secretKey: settings.baiduSecretKey.trim(),
        });
      }
      if (settings.coverProvider === 'bing') {
        return await invoke<string>('search_cover_bing', {
          recipeName: name,
          apiKey: settings.bingApiKey.trim(),
          endpoint: settings.bingEndpoint.trim(),
        });
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  // 浏览器模式：尝试直连（百度 token 可能受 CORS 限制，建议用 Tauri）
  if (settings.coverProvider === 'bing') {
    return searchBingInBrowser(name, settings.bingApiKey.trim(), settings.bingEndpoint.trim());
  }

  throw new Error('百度文心生图请在桌面应用（npm run tauri:dev）中使用，或改用微软 Bing 图片搜索');
}

async function searchBingInBrowser(
  recipeName: string,
  apiKey: string,
  endpoint: string
): Promise<string> {
  const url = new URL(endpoint);
  url.searchParams.set('q', `${recipeName} 中餐 美食`);
  url.searchParams.set('mkt', 'zh-CN');
  url.searchParams.set('count', '1');
  url.searchParams.set('safeSearch', 'Strict');

  const res = await fetch(url.toString(), {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
  });

  if (!res.ok) {
    throw new Error(`Bing 图片搜索失败 (${res.status})，请检查密钥与端点`);
  }

  const data = (await res.json()) as {
    value?: Array<{ contentUrl?: string; thumbnailUrl?: string }>;
  };

  const img = data.value?.[0]?.contentUrl ?? data.value?.[0]?.thumbnailUrl;
  if (!img) throw new Error('Bing 未找到相关图片');

  return img;
}
