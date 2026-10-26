import { chatWithAi } from './ai';
import { useSettingsStore, isAiConfigured } from '../store/settingsStore';
import { wrapCorsProxy } from './proxyUrl';
import type { Recipe } from '../types';

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

    const res = await fetch(wrapCorsProxy(url), {
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
  category?: string,
  options?: { expandPrompt?: boolean }
): Promise<{ imageUrl: string; prompt: string }> {
  let promptText = `Delicious gourmet ${recipeName}, ${category || 'chinese cuisine'}, restaurant plating, professional food photography, 8k resolution, soft natural lighting, shallow depth of field, appetizing details`;

  const aiConfig = useSettingsStore.getState().ai;
  if (options?.expandPrompt !== false && isAiConfigured(aiConfig)) {
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

export interface CoverFillProgress {
  done: number;
  total: number;
  name?: string;
}

export interface BrokenCoverProgress {
  done: number;
  total: number;
  name?: string;
}

/** base64 或非 http 的非法封面直接判失效（不发起网络请求） */
function isCoverStructurallyBroken(coverImage?: string): boolean {
  const v = String(coverImage || '').trim();
  return v.length > 0 && !v.startsWith('http://') && !v.startsWith('https://');
}

/** 单个封面 URL 存活检测：HEAD 优先，服务器不支持时退化 GET Range */
async function isCoverUrlAlive(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 501) {
      const g = await fetch(url, { headers: { Range: 'bytes=0-64' } });
      return g.ok;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 检测失效封面（base64 / 死链），返回失效菜谱列表：
 * - base64 等非法值直接判失效；
 * - http 链接并发 HEAD 测活（超时视为失效）。
 */
export async function findBrokenCoverRecipes(
  recipes: Recipe[],
  onProgress?: (p: BrokenCoverProgress) => void,
  options?: { concurrency?: number; timeoutMs?: number }
): Promise<Recipe[]> {
  const withCover = recipes.filter((r) => String(r.coverImage || '').trim().length > 0);
  const total = withCover.length;
  if (total === 0) return [];

  const broken: Recipe[] = [];
  let cursor = 0;
  let done = 0;
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 6, 10));
  const timeoutMs = options?.timeoutMs ?? 8000;

  const worker = async () => {
    while (cursor < withCover.length) {
      const recipe = withCover[cursor];
      cursor += 1;
      const url = recipe.coverImage.trim();
      let alive = true;
      if (isCoverStructurallyBroken(url)) {
        alive = false;
      } else {
        try {
          alive = await Promise.race([
            isCoverUrlAlive(url),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
          ]);
        } catch {
          alive = false;
        }
      }
      if (!alive) broken.push(recipe);
      done += 1;
      onProgress?.({ done, total, name: recipe.name });
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, withCover.length) }, worker));
  return broken;
}

/**
 * 为单道菜谱寻找可用封面：优先百度美食实拍图，失败时用 AI 生图兜底
 */
async function findCoverForRecipe(recipe: Recipe): Promise<string | null> {
  const queries = [
    recipe.name,
    `${recipe.name} ${recipe.category || ''}`.trim(),
  ].filter((q, idx, arr) => q && arr.indexOf(q) === idx);

  for (const query of queries) {
    const urls = await searchBaiduImages(query, 0, 8);
    if (urls.length > 0) {
      return persistImageToServer(urls[0]);
    }
  }

  try {
    const { imageUrl } = await generateAiFoodImage(recipe.name, recipe.category, {
      expandPrompt: false,
    });
    return imageUrl;
  } catch {
    return null;
  }
}

/**
 * 批量补全菜谱封面：
 * 1. 仅处理 coverImage 为空的菜谱；
 * 2. 并发数受限，避免第三方接口限流；
 * 3. 返回补全后的完整列表，失败项原样保留。
 */
export async function fillMissingCovers(
  recipes: Recipe[],
  onProgress?: (progress: CoverFillProgress) => void,
  options?: { concurrency?: number }
): Promise<Recipe[]> {
  const missing = recipes.filter((r) => !String(r.coverImage || '').trim());
  const total = missing.length;
  if (total === 0) return recipes;

  const covers = new Map<string, string>();
  let cursor = 0;
  let done = 0;
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 3, 5));

  const worker = async () => {
    while (cursor < missing.length) {
      const recipe = missing[cursor];
      cursor += 1;
      try {
        const url = await findCoverForRecipe(recipe);
        if (url) covers.set(recipe.id, url);
      } catch (err: any) {
        console.warn('[fillMissingCovers] failed:', recipe.name, err?.message);
      }
      done += 1;
      onProgress?.({ done, total, name: recipe.name });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker())
  );

  return recipes.map((recipe) =>
    covers.has(recipe.id) ? { ...recipe, coverImage: covers.get(recipe.id)! } : recipe
  );
}

export function countMissingCovers(recipes: Recipe[]): number {
  return recipes.filter((r) => !String(r.coverImage || '').trim()).length;
}
