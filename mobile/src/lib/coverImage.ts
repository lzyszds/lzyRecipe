import { chatWithAi } from './ai';
import { useSettingsStore, isAiConfigured } from '../store/settingsStore';

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/**
 * 百度图片搜索：提取真实美食菜品照片
 */
export async function searchBaiduImages(
  query: string,
  page = 0,
  count = 16
): Promise<string[]> {
  try {
    const cleanWord = query.trim() || '家常菜 美食';
    const finalWord = cleanWord.includes('美食') ? cleanWord : `${cleanWord} 美食`;
    const url = `https://m.baidu.com/sf/vsearch/image/search/wisejson?word=${encodeURIComponent(
      finalWord
    )}&pn=${page * count}&rn=${count}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        Accept: 'application/json, text/plain, */*',
      },
    });

    if (!res.ok) {
      throw new Error(`百度搜图响应异常 (HTTP ${res.status})`);
    }

    const data = await res.json();
    const list: any[] = data?.searchResult?.data || [];
    const urls: string[] = [];

    for (const item of list) {
      const candidate = item.large_url || item.mid_url || item.obj_url || item.thumburl;
      if (
        candidate &&
        typeof candidate === 'string' &&
        candidate.startsWith('http') &&
        !urls.includes(candidate)
      ) {
        urls.push(candidate);
      }
    }

    return urls;
  } catch (err: any) {
    console.warn('[searchBaiduImages] error:', err?.message);
    return [];
  }
}

/**
 * AI 智能生成菜品封面图：
 * 1. 若配置了 AI，先利用大模型精炼出摄影级提示词（光影、盘饰、色泽）；
 * 2. 结合高画质生图通道生成逼真的美食大片
 */
export async function generateAiFoodImage(
  recipeName: string,
  category?: string
): Promise<{ imageUrl: string; prompt: string }> {
  let promptText = `Delicious gourmet ${recipeName}, ${category || 'chinese cuisine'}, restaurant plating, professional food photography, 8k resolution, soft natural lighting, shallow depth of field, appetizing details`;

  const aiConfig = useSettingsStore.getState().ai;
  if (isAiConfigured(aiConfig)) {
    try {
      const reply = await chatWithAi(
        aiConfig,
        [
          {
            role: 'system',
            content:
              'You are an expert food photographer. Given a dish name, write a concise, vivid English image prompt (under 40 words) describing lighting, plating, steam, ingredients, and realistic appetizing food photography. Output only the prompt in plain text without quotation marks.',
          },
          {
            role: 'user',
            content: `Dish name: ${recipeName}${category ? ` (${category})` : ''}`,
          },
        ],
        { temperature: 0.7 }
      );
      if (reply.trim().length > 10) {
        promptText = reply.trim();
      }
    } catch (e) {
      console.warn('[generateAiFoodImage] AI prompt expansion skipped:', e);
    }
  }

  const seed = Math.floor(Math.random() * 100000);
  const encodedPrompt = encodeURIComponent(promptText);
  // 高清 4:3 比例美食摄影
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&seed=${seed}&nologo=true&model=flux`;

  return { imageUrl, prompt: promptText };
}

/**
 * 将网络图片（如百度或AI生图）安全解析为封面地址
 */
export async function persistImageToServer(remoteUrl: string): Promise<string> {
  return remoteUrl.trim();
}
