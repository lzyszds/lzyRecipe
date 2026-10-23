/**
 * 从百度图片搜索下载内置菜谱真实封面，保存到 public/covers/{id}.jpg
 * 运行：npm run covers:photos（需联网，国内百度）
 *
 * 下载完成后会自动同步一份到 mobile/assets/covers/（App 本地兜底），
 * 并重建 mobile/src/lib/coverAssets.ts 的 require 映射。目录关系见 scripts/covers-common.mjs。
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

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

function parseBaiduUrls(body) {
  const urls = [];
  for (const key of ['middleURL', 'thumbURL', 'hoverURL']) {
    const needle = `"${key}":"`;
    let from = 0;
    while (true) {
      const idx = body.indexOf(needle, from);
      if (idx === -1) break;
      const start = idx + needle.length;
      const end = body.indexOf('"', start);
      if (end === -1) break;
      const url = body
        .slice(start, end)
        .replace(/\\\//g, '/')
        .replace(/\\u002F/g, '/')
        .replace(/\\u0026/g, '&');
      const lower = url.toLowerCase();
      if (
        url.startsWith('http') &&
        !lower.includes('logo') &&
        !lower.includes('icon') &&
        !urls.includes(url)
      ) {
        urls.push(url);
      }
      from = start + 1;
    }
  }
  return urls;
}

async function searchBaiduImage(name) {
  const query = `${name} 美食 菜品`;
  const url = new URL('https://image.baidu.com/search/acjson');
  url.searchParams.set('tn', 'resultjson_com');
  url.searchParams.set('word', query);
  url.searchParams.set('queryWord', query);
  url.searchParams.set('pn', '0');
  url.searchParams.set('rn', '15');
  url.searchParams.set('ie', 'utf-8');
  url.searchParams.set('oe', 'utf-8');
  url.searchParams.set('istype', '2');
  url.searchParams.set('face', '0');

  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Referer: 'https://image.baidu.com/',
    },
  });
  const text = await res.text();
  return parseBaiduUrls(text);
}

async function downloadImage(imgUrl) {
  const res = await fetch(imgUrl, {
    headers: { 'User-Agent': UA, Referer: 'https://image.baidu.com/' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2048) throw new Error('too small');
  return buf;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const recipesTs = readFileSync(recipesTsPath, 'utf8');
const recipes = parseRecipes(recipesTs);

mkdirSync(outDir, { recursive: true });

let ok = 0;
let skip = 0;
let fail = 0;

for (const { id, name } of recipes) {
  const outPath = join(outDir, `${id}.jpg`);
  if (existsSync(outPath)) {
    console.log(`skip ${name} (${id}) — already exists`);
    skip++;
    continue;
  }

  try {
    const urls = await searchBaiduImage(name);
    if (!urls.length) {
      console.warn(`fail ${name} — no URLs`);
      fail++;
      continue;
    }

    let saved = false;
    for (const url of urls.slice(0, 6)) {
      try {
        const buf = await downloadImage(url);
        writeFileSync(outPath, buf);
        console.log(`ok   ${name} → ${id}.jpg (${(buf.length / 1024).toFixed(0)} KB)`);
        ok++;
        saved = true;
        break;
      } catch {
        /* try next */
      }
    }
    if (!saved) {
      console.warn(`fail ${name} — download failed`);
      fail++;
    }
  } catch (e) {
    console.warn(`fail ${name} — ${e.message}`);
    fail++;
  }

  await sleep(800);
}

const updated = rewriteCoverImages(recipesTs, ({ id, current }) => {
  const jpg = join(outDir, `${id}.jpg`);
  if (!existsSync(jpg)) return null;
  // 只替换指向本地占位图的路径；不覆盖内嵌 base64 与 http 外链
  if (!current.startsWith('/covers/')) return null;
  if (localCoverExists(current) && /\.(jpe?g|png|webp)$/.test(current)) return null;
  return `/covers/${id}.jpg`;
});
writeFileSync(recipesTsPath, updated, 'utf8');

console.log(`\nDone: ${ok} downloaded, ${skip} skipped, ${fail} failed`);
console.log('Updated recipes.ts coverImage paths where JPG exists');

const sync = syncBundleCovers();
console.log(`Synced bundle covers: ${sync.copied} copied, ${sync.mapped} mapped`);
