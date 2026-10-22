#!/usr/bin/env node
/**
 * 校验各处的版本号是否一致（CI 与本地打包前都会调用）。
 *
 * 以 package.json 为准，检查：
 * - src-tauri/tauri.conf.json
 * - src-tauri/Cargo.toml
 * - src-tauri/gen/android/app/tauri.properties（versionName 与 versionCode）
 *
 * 用法:
 *   node scripts/check-version-sync.mjs          # 只检查
 *   node scripts/check-version-sync.mjs --tag 萌厨食光-v0.3.0  # 同时检查 tag 与版本一致
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** 与 Tauri 默认规则一致: major * 1000000 + minor * 1000 + patch */
export function androidVersionCode(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 1000000 + minor * 1000 + patch;
}

function readVersionFromJson(path) {
  return JSON.parse(readFileSync(path, 'utf8')).version;
}

function readCargoVersion(path) {
  const match = readFileSync(path, 'utf8').match(/^\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m);
  return match?.[1];
}

function readAndroidProps(path) {
  const text = readFileSync(path, 'utf8');
  return {
    versionName: text.match(/^tauri\.android\.versionName=(.*)$/m)?.[1]?.trim(),
    versionCode: text.match(/^tauri\.android\.versionCode=(.*)$/m)?.[1]?.trim(),
  };
}

const results = [];
function check(label, actual, expected) {
  results.push({ label, actual, expected, ok: actual === expected });
}

const pkgVersion = readVersionFromJson(join(root, 'package.json'));
check('package.json', pkgVersion, pkgVersion);
check('src-tauri/tauri.conf.json', readVersionFromJson(join(root, 'src-tauri', 'tauri.conf.json')), pkgVersion);
check('src-tauri/Cargo.toml', readCargoVersion(join(root, 'src-tauri', 'Cargo.toml')), pkgVersion);

const propsPath = join(root, 'src-tauri', 'gen', 'android', 'app', 'tauri.properties');
if (existsSync(propsPath)) {
  const props = readAndroidProps(propsPath);
  check('Android versionName', props.versionName, pkgVersion);
  check('Android versionCode', props.versionCode, String(androidVersionCode(pkgVersion)));
}

const tagIndex = process.argv.indexOf('--tag');
if (tagIndex >= 0) {
  const tag = process.argv[tagIndex + 1];
  check(`tag ${tag}`, tag, `萌厨食光-v${pkgVersion}`);
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.label}: ${r.actual ?? '(缺失)'}${r.ok ? '' : `  (应为 ${r.expected})`}`);
}

if (failed.length) {
  console.error(`\n版本号不一致（${failed.length} 处）。请先运行 npm run android:build 选择升级版本号，或手动同步。`);
  process.exit(1);
}
console.log(`\n版本号一致：${pkgVersion}`);
