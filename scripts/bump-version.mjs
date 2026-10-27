#!/usr/bin/env node
/**
 * 版本号自动升级脚本
 *
 * 用法：
 *   node scripts/bump-version.mjs                # auto:按 git 提交记录自动判断 patch/minor/major
 *   node scripts/bump-version.mjs patch          # 手动指定：修复类 +0.0.1
 *   node scripts/bump-version.mjs minor          # 手动指定：新功能 +0.1.0
 *   node scripts/bump-version.mjs major          # 手动指定：重大改版 +1.0.0
 *
 * 升级内容：
 *   - mobile/app.json → expo.version（展示版本）
 *   - mobile/app.json → expo.android.versionCode（安装升级用单调整数，= 主万+次百+补个）
 *
 * 判断规则（auto 模式，按距上次发版的提交记录推断）：
 *   - 含 feat / 新增功能        → minor
 *   - 仅 fix/perf/style/fix 类  → patch
 *   - 含 BREAKING/破坏性/架构重做 → major
 *
 * ⚠️ 热更规则（重要）：
 *   - 纯 JS 改动：runtimeVersion 保持 "1.0.0" 不动，eas update 即可热更所有已装用户
 *   - 新增/升级原生依赖：必须手动同步 bump app.json 的 runtimeVersion，并重新 eas build
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const APP_JSON = path.resolve(__dirname, '../mobile/app.json');

function bump(version, level) {
  const [maj, min, pat] = version.split('.').map(Number);
  if (level === 'major') return `${maj + 1}.0.0`;
  if (level === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

/** 从 git 提交记录推断升级级别（自上次发版提交以来） */
function inferLevel() {
  let range = 'HEAD';
  try {
    const last = execSync('git log --oneline --grep="chore(release)" -n 1 --format=%H')
      .toString()
      .trim();
    if (last) range = `${last}..HEAD`;
  } catch {}

  const log = execSync(`git log ${range} --format=%s`).toString();
  if (!log.trim()) return 'patch';

  if (/BREAKING|破坏性|架构重做|大改版/i.test(log)) return 'major';
  if (/(^|\)|: |\s)feat(\(|:| )|新增|新功能|feature/i.test(log)) return 'minor';
  return 'patch';
}

const level = process.argv[2] || 'auto';
const finalLevel = ['patch', 'minor', 'major'].includes(level) ? level : inferLevel();

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
const oldVersion = app.expo.version;
const newVersion = bump(oldVersion, finalLevel);
const versionCode =
  Number(newVersion.split('.')[0]) * 10000 +
  Number(newVersion.split('.')[1]) * 100 +
  Number(newVersion.split('.')[2]);

app.expo.version = newVersion;
app.expo.android = app.expo.android || {};
app.expo.android.versionCode = versionCode;

fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2) + '\n', 'utf8');

// 汇总本次发版包含的提交，方便写更新说明
let commits = '';
try {
  const last = execSync('git log --oneline --grep="chore(release)" -n 1 --format=%H').toString().trim();
  const range = last ? `${last}..HEAD` : '-n 10';
  commits = execSync(`git log ${range} --format=%s`).toString().trim();
} catch {}

console.log('══════════════════════════════════════');
console.log(`版本升级: ${oldVersion} → ${newVersion} (${finalLevel})`);
console.log(`versionCode: ${versionCode}`);
console.log('──────────────────────────────────────');
console.log('本次包含提交:');
console.log(commits || '（无新提交）');
console.log('──────────────────────────────────────');
console.log('下一步:');
console.log(`  1. git add -A && git commit -m "chore(release): v${newVersion}" && git push`);
console.log(
  `  2. bunx eas-cli update --branch production --environment production --message "v${newVersion} 摘要"`
);
console.log('  ⚠️ 若本次改动了原生依赖: 手动 bump runtimeVersion 并重新 eas build');
