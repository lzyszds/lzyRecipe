import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public', 'covers');

const CATEGORY_EMOJI = {
  川菜: '🌶️', 粤菜: '🥘', 湘菜: '🔥', 鲁菜: '🥢', 西餐: '🍽️',
  甜点: '🍰', 饮品: '🥤', 家常菜: '🏠', 海鲜: '🦐', 早餐: '🍳',
  汤: '🍲', 肉类: '🥩', 蔬菜: '🥬', 主食: '🍜', 调料: '🧂',
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function getDishStyle(name, category) {
  if (name.includes('番茄') && name.includes('蛋')) {
    return { emoji: '🍅🥚', c1: '#e74c3c', c2: '#f39c12' };
  }
  if (name.includes('番茄')) return { emoji: '🍅', c1: '#e74c3c', c2: '#c0392b' };
  if (name.includes('蛋') || name.includes('炒蛋')) {
    return { emoji: '🥚', c1: '#f1c40f', c2: '#e67e22' };
  }
  if (name.includes('鱼') || name.includes('鲈') || name.includes('蟹') || name.includes('虾') || name.includes('海鲜')) {
    return { emoji: '🐟', c1: '#3498db', c2: '#2980b9' };
  }
  if (name.includes('肉') || name.includes('鸡') || name.includes('鸭') || name.includes('牛') || name.includes('猪')) {
    return { emoji: '🥩', c1: '#a0522d', c2: '#8b4513' };
  }
  if (name.includes('面') || name.includes('饭') || name.includes('粥')) {
    return { emoji: '🍚', c1: '#d4a574', c2: '#b8956a' };
  }
  if (name.includes('汤')) return { emoji: '🍲', c1: '#e8b86d', c2: '#d4a056' };
  if (name.includes('蛋糕') || name.includes('甜') || category === '甜点') {
    return { emoji: '🍰', c1: '#fd79a8', c2: '#e84393' };
  }
  if (name.includes('茶') || name.includes('奶茶') || category === '饮品') {
    return { emoji: '🥤', c1: '#74b9ff', c2: '#0984e3' };
  }
  if (name.includes('豆腐')) return { emoji: '🧈', c1: '#ffeaa7', c2: '#fdcb6e' };
  if (category === '蔬菜' || name.includes('菜')) {
    return { emoji: '🥬', c1: '#55efc4', c2: '#00b894' };
  }

  const hue = hashString(name) % 360;
  const emoji = CATEGORY_EMOJI[category] || '🍳';
  return { emoji, c1: `hsl(${hue}, 45%, 45%)`, c2: `hsl(${(hue + 40) % 360}, 50%, 30%)` };
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
  <circle cx="640" cy="120" r="160" fill="rgba(255,255,255,0.08)"/>
  <text x="400" y="240" text-anchor="middle" font-size="80">${emoji}</text>
  <text x="400" y="360" text-anchor="middle" fill="#fff" font-size="42" font-weight="bold" font-family="Noto Sans SC, sans-serif">${escapeXml(displayName)}</text>
  <text x="400" y="400" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-size="22" font-family="Noto Sans SC, sans-serif">${escapeXml(category)}</text>
  <text x="400" y="520" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="16" font-family="Noto Sans SC, sans-serif">珍藏阁 · 菜谱</text>
</svg>`;
}

const recipesTs = readFileSync(join(root, 'src', 'data', 'recipes.ts'), 'utf8');
const recipeRegex = /id: '([^']+)',\s*\n\s*name: '([^']+)',\s*\n\s*category: '([^']+)'/g;

mkdirSync(outDir, { recursive: true });

let match;
let count = 0;
const ids = new Set();

while ((match = recipeRegex.exec(recipesTs)) !== null) {
  const [, id, name, category] = match;
  if (ids.has(id)) continue;
  ids.add(id);
  writeFileSync(join(outDir, `${id}.svg`), buildSvg(name, category), 'utf8');
  count++;
}

console.log(`Generated ${count} cover SVGs in public/covers/`);

const updated = recipesTs.replace(
  /(id: '([^']+)',[\s\S]*?coverImage: ')[^']+(')/g,
  (full, prefix, id, suffix) => {
    if (!ids.has(id)) return full;
    return `${prefix}/covers/${id}.svg${suffix}`;
  }
);
writeFileSync(join(root, 'src', 'data', 'recipes.ts'), updated, 'utf8');
console.log('Updated recipes.ts coverImage paths');
