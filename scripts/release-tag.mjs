#!/usr/bin/env node
/**
 * 发布：按 package.json 的版本号打 tag 并推送，触发 GitHub Actions 构建 APK 并发布 Release。
 *
 * 用法:
 *   npm run release:tag            # 打 tag 并推送
 *   npm run release:tag -- --dry   # 只检查，不真正打 tag/推送
 *
 * 前置：先运行 npm run android:build:patch（或 minor/major）升级版本号并提交，
 * 否则 tag 会指向旧提交。
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dryRun = process.argv.includes('--dry');

const APP_PREFIX = '萌厨食光-v';

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', ...options }).trim();
}

function fail(message) {
  console.error(`\x1b[31m[错误]\x1b[0m ${message}`);
  process.exit(1);
}

// 1. 版本一致性
execFileSync(process.execPath, [join(__dirname, 'check-version-sync.mjs')], {
  cwd: root,
  stdio: 'inherit',
});

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const tag = `${APP_PREFIX}${version}`;

// 2. 工作区必须干净，tag 才不会漏掉未提交的改动
const status = git(['status', '--porcelain']);
if (status) {
  fail(`工作区有未提交的改动，请先提交后再发版：\n${status}`);
}

// 3. 确认本地已推送
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const upstream = (() => {
  try {
    return git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  } catch {
    return null;
  }
})();
if (upstream) {
  const ahead = git(['rev-list', '--count', `${upstream}..HEAD`]);
  if (ahead !== '0') fail(`本地比 ${upstream} 多 ${ahead} 个提交，请先 git push`);
}

// 4. tag 是否已存在
const existing = git(['tag', '--list', tag]);
if (existing) fail(`tag ${tag} 已存在`);

console.log(`\n即将发布：${tag}（分支 ${branch}，提交 ${git(['rev-parse', '--short', 'HEAD'])}）`);
if (dryRun) {
  console.log('--dry：检查通过，未执行 tag/推送');
  process.exit(0);
}

// 5. 打 tag 并推送
git(['tag', '-a', tag, '-m', `发布 ${version}`]);
console.log(`\x1b[32m[√]\x1b[0m 已创建 tag ${tag}`);

const push = execFileSync('git', ['push', 'origin', tag], { cwd: root, stdio: 'inherit' });

void push;
console.log(`\n\x1b[32m[√]\x1b[0m 已推送 ${tag}，GitHub Actions 将开始构建并发布 Release`);
console.log('   进度：https://github.com/lzyszds/lzyRecipe/actions');
