/**
 * 菜谱封面脚本的公共路径与工具。
 *
 * 仓库结构（bun workspace 根 = 仓库根）：
 *   mobile/                        Expo 工程（app.json / src / assets）
 *   mobile/src/data/recipes.ts     内置菜谱数据（脚本的读写对象）
 *   mobile/assets/covers/          打包进 App 的本地兜底封面（由 coverAssets.ts 用 require 映射）
 *   public/covers/                 同步服务器的静态托管源（需上传到 sync 服务器 /data/covers/）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const repoRoot = join(__dirname, '..');
export const appDir = join(repoRoot, 'mobile');
export const recipesTsPath = join(appDir, 'src', 'data', 'recipes.ts');
export const serverCoversDir = join(repoRoot, 'public', 'covers');
export const bundleCoversDir = join(appDir, 'assets', 'covers');
export const coverAssetsPath = join(appDir, 'src', 'lib', 'coverAssets.ts');

/** 从 recipes.ts 解析出 { id, name, category } */
export function parseRecipes(recipesTs) {
  const recipeRegex = /id: '([^']+)',\s*\n\s*name: '([^']+)',\s*\n\s*category: '([^']+)'/g;
  const recipes = [];
  let match;
  while ((match = recipeRegex.exec(recipesTs)) !== null) {
    recipes.push({ id: match[1], name: match[2], category: match[3] });
  }
  return recipes;
}

/**
 * 重写 recipes.ts 里每条菜谱的 coverImage。
 * @param {string} recipesTs
 * @param {(recipe: {id: string, current: string}) => string | null} resolve 返回新的 coverImage 路径，返回 null 表示不改
 */
export function rewriteCoverImages(recipesTs, resolve) {
  const ids = new Set(parseRecipes(recipesTs).map((r) => r.id));
  return recipesTs.replace(
    /(id: '([^']+)',[\s\S]*?coverImage: ')([^']*)(')/g,
    (full, prefix, id, current, suffix) => {
      if (!ids.has(id)) return full;
      const next = resolve({ id, current });
      return next ? `${prefix}${next}${suffix}` : full;
    }
  );
}

/**
 * 把服务器源目录里的真实照片（.jpg）同步到 App 打包目录，并重建 coverAssets.ts 的 require 映射。
 * 只处理 jpg —— React Native 的 Metro 不能直接 require .svg。
 * 映射取「服务器源目录 ∪ 打包目录」的并集，避免误删已有的本地兜底。
 */
export function syncBundleCovers() {
  if (!existsSync(serverCoversDir)) return { copied: 0, mapped: 0 };

  mkdirSync(bundleCoversDir, { recursive: true });
  const serverJpgs = readdirSync(serverCoversDir).filter((f) => /\.jpe?g$/i.test(f));
  const bundleJpgs = existsSync(bundleCoversDir)
    ? readdirSync(bundleCoversDir).filter((f) => /\.jpe?g$/i.test(f))
    : [];

  let copied = 0;
  for (const file of serverJpgs) {
    const src = join(serverCoversDir, file);
    const dest = join(bundleCoversDir, file);
    if (!existsSync(dest) || readFileSync(dest).length !== readFileSync(src).length) {
      copyFileSync(src, dest);
      copied++;
    }
  }

  const allJpgs = Array.from(new Set([...serverJpgs, ...bundleJpgs])).sort();

  const entries = allJpgs
    .map((file) => `  "/covers/${file}": require("@/assets/covers/${file}"),`)
    .join('\n');

  writeFileSync(
    coverAssetsPath,
    `// 本地封面兜底映射：由 scripts/covers-common.mjs 自动生成，请勿手改。\n` +
      `// 图片源目录 public/covers/，需同步到同步服务器 /data/covers/ 才能在线访问。\n` +
      `export const LOCAL_COVERS: Record<string, any> = {\n${entries}\n};\n\n` +
      `export function getLocalCoverSource(path: string) {\n` +
      `  return LOCAL_COVERS[path] || null;\n` +
      `}\n`,
    'utf8'
  );

  return { copied, mapped: allJpgs.length };
}

/** 判断 coverImage 指向的本地资源是否真实存在 */
export function localCoverExists(coverImage) {
  if (!coverImage || !coverImage.startsWith('/covers/')) return false;
  return existsSync(join(serverCoversDir, coverImage.replace(/^\/covers\//, '')));
}
