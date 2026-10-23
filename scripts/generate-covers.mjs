/**
 * 为内置菜谱生成莫兰迪风格 SVG 占位封面，并回写 recipes.ts 的 coverImage 路径。
 * 运行：npm run covers
 *
 * 真实照片用 npm run covers:photos 下载；两份图片目录的关系见 scripts/covers-common.mjs。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import {
  recipesTsPath,
  serverCoversDir,
  parseRecipes,
  rewriteCoverImages,
  syncBundleCovers,
  localCoverExists,
} from './covers-common.mjs';

const outDir = serverCoversDir;

const CATEGORY_EMOJI = {
  川菜: '🌶️', 粤菜: '🥘', 湘菜: '🔥', 鲁菜: '🥢', 西餐: '🍽️',
  甜点: '🍰', 饮品: '🥤', 家常菜: '🏠', 海鲜: '🦐', 早餐: '🍳',
  汤: '🍲', 肉类: '🥩', 蔬菜: '🥬', 主食: '🍜', 调料: '🧂',
};

// 柔和莫兰迪配色，与鼠尾草绿主题保持一致
const MORANDI = {
  tomato: { c1: '#EFDCD4', c2: '#DEBFB3' },
  egg: { c1: '#F3EBD9', c2: '#E3D2AE' },
  seafood: { c1: '#DCE7EA', c2: '#C1D3D8' },
  meat: { c1: '#ECDCD2', c2: '#D8BCAA' },
  staple: { c1: '#EEE5D8', c2: '#DCCBB1' },
  soup: { c1: '#EAE4D6', c2: '#D6C9AE' },
  dessert: { c1: '#F0DFE2', c2: '#DEBEC4' },
  drink: { c1: '#DDE7E7', c2: '#C2D4D4' },
  tofu: { c1: '#F1EEDC', c2: '#E0D9B8' },
  veggie: { c1: '#E3ECE6', c2: '#C8DBD0' },
  default: { c1: '#E8ECEC', c2: '#D2DADA' },
};

function getDishStyle(name, category) {
  if (name.includes('番茄') && name.includes('蛋')) {
    return { emoji: '🍅🥚', ...MORANDI.tomato };
  }
  if (name.includes('番茄')) return { emoji: '🍅', ...MORANDI.tomato };
  if (name.includes('蛋') || name.includes('炒蛋')) {
    return { emoji: '🥚', ...MORANDI.egg };
  }
  if (name.includes('鱼') || name.includes('鲈') || name.includes('蟹') || name.includes('虾') || name.includes('海鲜')) {
    return { emoji: '🐟', ...MORANDI.seafood };
  }
  if (name.includes('肉') || name.includes('鸡') || name.includes('鸭') || name.includes('牛') || name.includes('猪')) {
    return { emoji: '🥩', ...MORANDI.meat };
  }
  if (name.includes('面') || name.includes('饭') || name.includes('粥')) {
    return { emoji: '🍚', ...MORANDI.staple };
  }
  if (name.includes('汤')) return { emoji: '🍲', ...MORANDI.soup };
  if (name.includes('蛋糕') || name.includes('甜') || category === '甜点') {
    return { emoji: '🍰', ...MORANDI.dessert };
  }
  if (name.includes('茶') || name.includes('奶茶') || category === '饮品') {
    return { emoji: '🥤', ...MORANDI.drink };
  }
  if (name.includes('豆腐')) return { emoji: '🧈', ...MORANDI.tofu };
  if (category === '蔬菜' || name.includes('菜')) {
    return { emoji: '🥬', ...MORANDI.veggie };
  }

  const emoji = CATEGORY_EMOJI[category] || '🍳';
  return { emoji, ...MORANDI.default };
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildSvg(name, category) {
  const { emoji, c1, c2 } = getDishStyle(name, category);
  const displayName = name.length > 8 ? `${name.slice(0, 8)}…` : name;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <circle cx="640" cy="120" r="160" fill="rgba(255,255,255,0.28)"/>
  <text x="400" y="240" text-anchor="middle" font-size="80">${emoji}</text>
  <text x="400" y="360" text-anchor="middle" fill="#5d6b63" font-size="42" font-weight="bold" font-family="Noto Sans SC, sans-serif">${escapeXml(displayName)}</text>
  <text x="400" y="400" text-anchor="middle" fill="rgba(93,107,99,0.6)" font-size="22" font-family="Noto Sans SC, sans-serif">${escapeXml(category)}</text>
  <text x="400" y="520" text-anchor="middle" fill="rgba(93,107,99,0.35)" font-size="16" font-family="Noto Sans SC, sans-serif">萌厨食光</text>
</svg>`;
}

const recipesTs = readFileSync(recipesTsPath, 'utf8');
const recipes = parseRecipes(recipesTs);

mkdirSync(outDir, { recursive: true });

const ids = new Set();
let count = 0;

for (const { id, name, category } of recipes) {
  if (ids.has(id)) continue;
  ids.add(id);
  writeFileSync(join(outDir, `${id}.svg`), buildSvg(name, category), 'utf8');
  count++;
}

console.log(`Generated ${count} cover SVGs in public/covers/`);

const updated = rewriteCoverImages(recipesTs, ({ id, current }) => {
  // 已有可用封面一律保留：内嵌 base64、http 外链、以及指向真实存在的本地资源
  if (current.startsWith('data:') || current.startsWith('http')) return null;
  if (localCoverExists(current)) return null;
  // 封面缺失时退回本菜谱专属图：优先真实照片，其次占位 SVG
  if (existsSync(join(outDir, `${id}.jpg`))) return `/covers/${id}.jpg`;
  return `/covers/${id}.svg`;
});
writeFileSync(recipesTsPath, updated, 'utf8');
console.log('Updated recipes.ts coverImage paths');

const sync = syncBundleCovers();
console.log(`Synced bundle covers: ${sync.copied} copied, ${sync.mapped} mapped`);
