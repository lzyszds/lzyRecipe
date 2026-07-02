import { getLocalCoverPath } from './coverRegistry';
import { generateCloudCover } from './cloudCover';
import { isCloudCoverConfigured, useSettingsStore } from '../store/settingsStore';
import { isTauri } from './tauri';

const CATEGORY_EMOJI: Record<string, string> = {
  川菜: '🌶️',
  粤菜: '🥘',
  湘菜: '🔥',
  鲁菜: '🥢',
  西餐: '🍽️',
  甜点: '🍰',
  饮品: '🥤',
  家常菜: '🏠',
  海鲜: '🦐',
  早餐: '🍳',
  汤: '🍲',
  肉类: '🥩',
  蔬菜: '🥬',
  主食: '🍜',
  调料: '🧂',
};

export type CoverGenerateProgress = (message: string) => void;

export function hashStringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function getDishStyle(name: string, category?: string) {
  if (name.includes('番茄') && name.includes('蛋')) {
    return { emoji: '🍅🥚', c1: '#e74c3c', c2: '#f39c12' };
  }
  if (name.includes('番茄')) return { emoji: '🍅', c1: '#e74c3c', c2: '#c0392b' };
  if (name.includes('蛋') || name.includes('炒蛋')) {
    return { emoji: '🥚', c1: '#f1c40f', c2: '#e67e22' };
  }
  if (/鱼|鲈|蟹|虾|鳝|海参|生蚝/.test(name)) {
    return { emoji: '🐟', c1: '#3498db', c2: '#2980b9' };
  }
  if (/肉|鸡|鸭|牛|猪|兔|翅/.test(name)) {
    return { emoji: '🥩', c1: '#a0522d', c2: '#8b4513' };
  }
  if (/面|饭|粥|炒饭/.test(name)) {
    return { emoji: '🍚', c1: '#d4a574', c2: '#b8956a' };
  }
  if (name.includes('汤')) return { emoji: '🍲', c1: '#e8b86d', c2: '#d4a056' };
  if (/蛋糕|甜/.test(name) || category === '甜点') {
    return { emoji: '🍰', c1: '#fd79a8', c2: '#e84393' };
  }
  if (/茶|奶茶|Mojito|B52/.test(name) || category === '饮品') {
    return { emoji: '🥤', c1: '#74b9ff', c2: '#0984e3' };
  }
  if (name.includes('豆腐')) return { emoji: '🧈', c1: '#ffeaa7', c2: '#fdcb6e' };
  if (category === '蔬菜' || name.includes('菜')) {
    return { emoji: '🥬', c1: '#55efc4', c2: '#00b894' };
  }

  const hue = hashStringToSeed(name) % 360;
  return {
    emoji: CATEGORY_EMOJI[category ?? ''] ?? '🍳',
    c1: `hsl(${hue}, 45%, 45%)`,
    c2: `hsl(${(hue + 40) % 360}, 50%, 30%)`,
  };
}

/** 本地 Canvas 封面（按菜名关键词配色，离线可用） */
export function generateCanvasCover(recipeName: string, category?: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建封面');

  const { emoji, c1, c2 } = getDishStyle(recipeName.trim(), category);
  const gradient = ctx.createLinearGradient(0, 0, 800, 600);
  gradient.addColorStop(0, c1);
  gradient.addColorStop(1, c2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 600);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(640, 120, 160, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '80px serif';
  ctx.textAlign = 'center';
  ctx.fillText(emoji, 400, 260);

  const name = recipeName.trim();
  const displayName = name.length > 10 ? `${name.slice(0, 10)}…` : name;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px "Noto Sans SC", sans-serif';
  ctx.fillText(displayName, 400, 360);

  if (category) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '22px "Noto Sans SC", sans-serif';
    ctx.fillText(category, 400, 400);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '16px "Noto Sans SC", sans-serif';
  ctx.fillText('珍藏阁 · 菜谱', 400, 520);

  return canvas.toDataURL('image/jpeg', 0.85);
}

export function isDefaultCoverImage(url: string): boolean {
  if (!url) return true;
  if (url.includes('unsplash.com')) return true;
  return false;
}

const displayCoverCache = new Map<string, string>();

async function searchBaiduImages(recipeName: string): Promise<string> {
  if (!isTauri()) {
    throw new Error('百度图片搜索需在桌面应用中使用，请运行 npm run tauri:dev');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('search_cover_baidu_images', { recipeName: recipeName.trim() });
}

function isBundledPhotoPath(path: string): boolean {
  return /\.(jpg|jpeg|webp|png)$/i.test(path);
}

/** 将 public/covers 下的本地图片读为 data URL，便于保存到菜谱 */
async function loadCoverPathAsDataUrl(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`无法加载本地封面 (${res.status})`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('读取封面失败'));
    };
    reader.onerror = () => reject(new Error('读取封面失败'));
    reader.readAsDataURL(blob);
  });
}

/** 从本地选择图片文件，转为 data URL */
export async function pickCoverFromFile(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile } = await import('@tauri-apps/plugin-fs');

    const selected = await open({
      multiple: false,
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
    });
    if (!selected || typeof selected !== 'string') return null;

    const bytes = await readFile(selected);
    const ext = selected.split('.').pop()?.toLowerCase() ?? 'jpeg';
    const mime =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${mime};base64,${btoa(binary)}`;
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export async function getRecipeDisplayCover(
  recipeName: string,
  storedCover: string
): Promise<string> {
  const name = recipeName.trim();

  if (storedCover && !isDefaultCoverImage(storedCover)) {
    return storedCover;
  }

  if (displayCoverCache.has(name)) {
    return displayCoverCache.get(name)!;
  }

  const local = getLocalCoverPath(name);
  if (local) {
    displayCoverCache.set(name, local);
    return local;
  }

  return storedCover;
}

export async function generateCoverImageDataUrl(
  recipeName: string,
  category?: string,
  onProgress?: CoverGenerateProgress
): Promise<string> {
  const settings = useSettingsStore.getState();
  const name = recipeName.trim();
  let searchError = '';

  // 1. 内置菜谱已下载的真实封面（covers:photos 产物，优先使用）
  const local = getLocalCoverPath(name);
  if (local && isBundledPhotoPath(local)) {
    onProgress?.('正在加载内置封面…');
    try {
      return await loadCoverPathAsDataUrl(local);
    } catch (err) {
      searchError =
        err instanceof Error ? err.message : '加载内置封面失败';
    }
  }

  // 2. 可选高级云服务（文心 / Bing），失败则继续尝试百度图片搜索
  if (isCloudCoverConfigured(settings)) {
    const providerLabel =
      settings.coverProvider === 'baidu' ? '百度文心' : '微软 Bing';
    onProgress?.(`正在通过${providerLabel}生成封面…`);
    try {
      const cloud = await generateCloudCover(name, category);
      if (cloud) return cloud;
    } catch (err) {
      searchError =
        err instanceof Error ? err.message : '云服务生成失败';
      onProgress?.('云服务失败，正在搜索百度图片…');
    }
  }

  // 3. 百度图片搜索（免 API Key，Tauri 桌面端 / Android 应用）
  if (isTauri()) {
    onProgress?.('正在搜索百度图片…');
    try {
      return await searchBaiduImages(name);
    } catch (err) {
      searchError =
        err instanceof Error ? err.message : '百度图片搜索失败';
    }
  }

  // 4. 内置 SVG 封面
  if (local && local.endsWith('.svg')) {
    onProgress?.('正在匹配内置封面…');
    return local;
  }

  // 5. Canvas 降级
  if (!isTauri()) {
    throw new Error(
      searchError ||
        '浏览器模式无法搜索图片，请运行 npm run tauri:dev，或使用「选择图片」'
    );
  }

  if (searchError) {
    throw new Error(`${searchError}。请使用「选择图片」手动上传`);
  }

  onProgress?.('正在生成本地封面…');
  return generateCanvasCover(name, category);
}

export function getDefaultCoverPlaceholder(): string {
  return '';
}

export async function generateCoverImageDataUrlWithRetry(
  recipeName: string,
  category?: string,
  onProgress?: CoverGenerateProgress
): Promise<string> {
  return generateCoverImageDataUrl(recipeName, category, onProgress);
}
