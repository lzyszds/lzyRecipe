#!/usr/bin/env node
/**
 * Android 打包脚本
 *
 * Tauri 2.0 会把前端资源嵌入到 Rust 编译的 .so 文件中，
 * 所以必须执行完整的 tauri android build 才能更新 APK 里的前端内容。
 *
 * 用法:
 *   npm run android:build                 # 默认：完整打包 arm64 Release（前端+Rust+APK）
 *   npm run android:build:debug           # 完整打包 arm64 Debug
 *   npm run android:build -- --skip-rust  # 快速重打包：跳过 Rust，复用已有 .so（前端不会更新）
 *   npm run android:build -- arm32        # 完整打包 armv7 Release
 *   npm run android:build -- --open       # 打包完成后打开 APK 所在文件夹
 *   npm run android:build -- --bump=patch # 打包前自动升级版本号（patch|minor|major|none）
 *
 * 版本号: 未指定 --bump 时会在打包前交互选择升级方式（回车默认不升级）；
 *         非交互环境（无终端）默认不升级。打包失败会自动回滚版本号。
 *
 * 输出位置（固定，方便查找）:
 *   release/android/萌厨食光-{version}-{arch}-{type}.apk
 *   release/android/latest.apk            # 始终指向最近一次打包结果
 *
 * 环境变量（未设置时使用以下默认值）:
 *   ANDROID_HOME  -> C:\Users\Administrator\AppData\Local\Android\Sdk
 *   NDK_HOME      -> $ANDROID_HOME\ndk\29.0.13846066
 *   JAVA_HOME     -> C:\Program Files\Android\Android Studio\jbr
 */
import { spawnSync } from 'child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { createInterface } from 'readline/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const androidDir = join(projectRoot, 'src-tauri', 'gen', 'android');
const releaseDir = join(projectRoot, 'release', 'android');

const versionFiles = {
  packageJson: join(projectRoot, 'package.json'),
  tauriConf: join(projectRoot, 'src-tauri', 'tauri.conf.json'),
  cargoToml: join(projectRoot, 'src-tauri', 'Cargo.toml'),
  cargoLock: join(projectRoot, 'src-tauri', 'Cargo.lock'),
  androidProps: join(androidDir, 'app', 'tauri.properties'),
};

const APP_DISPLAY_NAME = '萌厨食光';

// ---------- 参数解析 ----------
const args = process.argv.slice(2);
const wantDebug = args.includes('debug');
const wantArm32 = args.includes('arm32');
const skipRust = args.includes('--skip-rust');
const openFolder = args.includes('--open');
const BUMP_KINDS = ['patch', 'minor', 'major', 'none'];
const bumpFlag = args.find((a) => a.startsWith('--bump='))?.slice('--bump='.length);
const bumpArg = args.includes('--no-bump') ? 'none' : bumpFlag;
if (bumpArg !== undefined && !BUMP_KINDS.includes(bumpArg)) {
  console.error(`无效的 --bump 参数: ${bumpArg}（可选: ${BUMP_KINDS.join('|')}）`);
  process.exit(1);
}

const target = wantArm32 ? 'armv7' : 'aarch64';
const archDir = wantArm32 ? 'arm32' : 'arm64';
const buildType = wantDebug ? 'debug' : 'release';
const archLabel = wantArm32 ? 'arm32' : 'arm64';

// ---------- 版本号 ----------
function readAppVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
let appVersion = readAppVersion();
// 版本号写入后的回滚函数，构建失败时调用
let versionRollback = null;

const BUMP_LABELS = {
  patch: '修订号 (问题修复)',
  minor: '次版本 (新增功能)',
  major: '主版本 (不兼容变更)',
};

function bumpSemver(version, kind) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) fail(`版本号格式不正确（需要 x.y.z）: ${version}`);
  let [major, minor, patch] = match.slice(1).map(Number);
  if (kind === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (kind === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

// 与 Tauri 默认规则一致: major * 1000000 + minor * 1000 + patch
function androidVersionCode(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 1000000 + minor * 1000 + patch;
}

async function resolveBump(current) {
  if (bumpArg !== undefined) return bumpArg;
  if (!process.stdin.isTTY) return 'none';

  console.log(`\n当前版本: ${current}，请选择本次升级方式:`);
  ['patch', 'minor', 'major'].forEach((kind, i) => {
    console.log(`  ${i + 1}) ${BUMP_LABELS[kind]}  ${current} → ${bumpSemver(current, kind)}`);
  });
  console.log('  4) 不升级');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try {
    answer = (await rl.question('请输入序号 [1-4，直接回车为不升级]: ')).trim();
  } finally {
    rl.close();
  }
  if (answer === '') return 'none';
  const picked = { 1: 'patch', 2: 'minor', 3: 'major', 4: 'none' }[answer];
  if (!picked) fail(`无效的选项: ${answer}`);
  return picked;
}

function applyVersion(next) {
  const replaceVersion = (regex) => (text) =>
    text.replace(regex, (_, prefix, suffix) => `${prefix}${next}${suffix}`);

  const updates = {
    [versionFiles.packageJson]: replaceVersion(/("version":\s*")[^"]+(")/),
    [versionFiles.tauriConf]: replaceVersion(/("version":\s*")[^"]+(")/),
    [versionFiles.cargoToml]: replaceVersion(/^(version\s*=\s*")[^"]+(")/m),
    [versionFiles.cargoLock]: replaceVersion(/(name = "app"\r?\nversion = ")[^"]+(")/),
    [versionFiles.androidProps]: (text) =>
      text
        .replace(/^(tauri\.android\.versionName=).*$/m, `$1${next}`)
        .replace(/^(tauri\.android\.versionCode=).*$/m, `$1${androidVersionCode(next)}`),
  };

  const originals = {};
  for (const [file, update] of Object.entries(updates)) {
    if (!existsSync(file)) continue;
    const original = readFileSync(file, 'utf8');
    originals[file] = original;
    writeFileSync(file, update(original));
  }

  versionRollback = () => {
    for (const [file, original] of Object.entries(originals)) {
      writeFileSync(file, original);
    }
    console.error('\x1b[33m已回滚版本号修改\x1b[0m');
  };
}

async function maybeBumpVersion() {
  const previous = appVersion;
  const kind = await resolveBump(previous);
  if (kind === 'none') {
    console.log(`\x1b[32m[√]\x1b[0m 版本保持 ${previous}`);
    return;
  }

  const next = bumpSemver(previous, kind);
  applyVersion(next);
  appVersion = next;
  console.log(
    `\x1b[32m[√]\x1b[0m 版本已升级: ${previous} → ${next}（Android versionCode ${androidVersionCode(next)}）`
  );
}

// ---------- 环境变量 ----------
const ANDROID_HOME = process.env.ANDROID_HOME || 'C:\\Users\\Administrator\\AppData\\Local\\Android\\Sdk';
const NDK_HOME = process.env.NDK_HOME || `${ANDROID_HOME}\\ndk\\29.0.13846066`;
const JAVA_HOME = process.env.JAVA_HOME || 'C:\\Program Files\\Android\\Android Studio\\jbr';

function fail(msg) {
  console.error(`\x1b[31m[错误]\x1b[0m ${msg}`);
  if (versionRollback) versionRollback();
  process.exit(1);
}

function checkPath(label, p) {
  if (!existsSync(p)) {
    fail(`${label} 路径不存在: ${p}\n请通过环境变量设置正确路径。`);
  }
  console.log(`\x1b[32m[√]\x1b[0m ${label}: ${p}`);
}

/** 递归收集目录下所有 .apk */
function collectApks(dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectApks(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.apk')) {
      results.push(full);
    }
  }
  return results;
}

/** 从多个 APK 中选出最合适的一个 */
function pickBestApk(apks) {
  if (apks.length === 0) return null;
  if (apks.length === 1) return apks[0];

  const scored = apks.map((apk) => {
    const lower = apk.toLowerCase();
    let score = 0;
    if (lower.includes(buildType)) score += 100;
    if (lower.includes(archDir)) score += 50;
    if (lower.includes('universal')) score += 10;
    if (lower.includes('unsigned')) score -= 200;
    score += statSync(apk).mtimeMs / 1e12;
    return { apk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].apk;
}

function copyApkToRelease(sourceApk) {
  mkdirSync(releaseDir, { recursive: true });

  const fileName = `${APP_DISPLAY_NAME}-${appVersion}-${archLabel}-${buildType}.apk`;
  const destApk = join(releaseDir, fileName);
  const latestApk = join(releaseDir, 'latest.apk');

  copyFileSync(sourceApk, destApk);
  copyFileSync(sourceApk, latestApk);

  return { destApk, latestApk, fileName };
}

function openInExplorer(filePath) {
  if (process.platform === 'win32') {
    spawnSync('explorer', ['/select,', filePath.replace(/\//g, '\\')], { shell: true });
  } else if (process.platform === 'darwin') {
    spawnSync('open', ['-R', filePath], { shell: false });
  } else {
    spawnSync('xdg-open', [dirname(filePath)], { shell: false });
  }
}

console.log('\n\x1b[36m========== 环境检查 ==========\x1b[0m');
checkPath('ANDROID_HOME', ANDROID_HOME);
checkPath('NDK_HOME', NDK_HOME);
checkPath('JAVA_HOME', JAVA_HOME);
checkPath('Android 项目目录', androidDir);
console.log(`\x1b[32m[√]\x1b[0m APK 输出目录: ${releaseDir}`);

if (!existsSync(join(projectRoot, 'lzyrecipe.keystore'))) {
  fail('未找到签名文件 lzyrecipe.keystore');
}
console.log('\x1b[32m[√]\x1b[0m 签名文件: lzyrecipe.keystore');

// 公共环境变量
const PROXY = process.env.HTTP_PROXY || process.env.http_proxy || 'http://127.0.0.1:7890';
const env = {
  ...process.env,
  ANDROID_HOME,
  NDK_HOME,
  JAVA_HOME,
  PATH: `${JAVA_HOME}\\bin;${process.env.PATH || ''}`,
  HTTP_PROXY: PROXY,
  HTTPS_PROXY: PROXY,
  http_proxy: PROXY,
  https_proxy: PROXY,
  NO_PROXY: 'localhost,127.0.0.1',
};

await maybeBumpVersion();

if (skipRust) {
  const abi = wantArm32 ? 'armeabi-v7a' : 'arm64-v8a';
  const jniDir = join(androidDir, 'app', 'src', 'main', 'jniLibs', abi);
  if (!existsSync(jniDir) || readdirSync(jniDir).filter((f) => f.endsWith('.so')).length === 0) {
    fail(
      `未找到 ${abi} 的 .so 文件: ${jniDir}\n` +
      '快速模式需要先有 .so 文件。请先运行一次完整打包：npm run android:build'
    );
  }
  console.log(`\x1b[32m[√]\x1b[0m 原生库 ${abi} 已存在（快速模式）`);

  const gradleTask = `assemble${archDir === 'arm64' ? 'Arm64' : 'Arm32'}${wantDebug ? 'Debug' : 'Release'}`;
  console.log(`\n\x1b[36m========== Gradle 打包: ${gradleTask} -x rustBuild ==========\x1b[0m`);
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const gradle = spawnSync(
    gradlew,
    [gradleTask, '-x', `rustBuild${archDir === 'arm64' ? 'Arm64' : 'Arm32'}${wantDebug ? 'Debug' : 'Release'}`],
    { cwd: androidDir, stdio: 'inherit', env, shell: true }
  );
  if (gradle.status !== 0) {
    fail(`Gradle 构建失败 (exit ${gradle.status})`);
  }
} else {
  console.log(`\n\x1b[36m========== Tauri Android 完整打包 (target: ${target}, ${buildType}) ==========\x1b[0m`);
  console.log('流程: vite build -> cargo build (嵌入前端资源) -> 生成 .so -> Gradle 打包 APK\n');

  const tauriArgs = ['run', '--', 'tauri', 'android', 'build', '--target', target];
  if (wantDebug) {
    tauriArgs.push('--debug');
  }

  const tauri = spawnSync('npm', tauriArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    env,
    shell: true,
  });

  if (tauri.status !== 0) {
    fail(
      `Tauri Android 构建失败 (exit ${tauri.status})\n` +
      '如果是符号链接问题，可开启 Windows 开发者模式后重试，\n' +
      '或使用快速模式: npm run android:build -- --skip-rust（前端不会更新）'
    );
  }
}

// ---------- 定位并复制 APK ----------
const apkSearchRoot = join(androidDir, 'app', 'build', 'outputs', 'apk');
const allApks = collectApks(apkSearchRoot);
const sourceApk = pickBestApk(allApks);

console.log('\n\x1b[32m\x1b[1m========== 打包成功 ==========\x1b[0m\x1b[32m\x1b[0m');

if (!sourceApk) {
  console.log('\x1b[33m未找到 APK 文件，请检查 Gradle 输出目录:\x1b[0m');
  console.log(`  ${apkSearchRoot}`);
  process.exit(1);
}

const { destApk, latestApk, fileName } = copyApkToRelease(sourceApk);
const sizeMb = (statSync(destApk).size / 1024 / 1024).toFixed(2);

console.log('');
console.log('\x1b[1m📦 APK 已复制到项目根目录（固定位置，方便查找）\x1b[0m');
console.log('');
console.log(`  \x1b[36m主文件\x1b[0m  ${destApk}`);
console.log(`  \x1b[36m快捷名\x1b[0m  ${latestApk}  （始终是最新一次打包）`);
console.log('');
console.log(`  大小: ${sizeMb} MB`);
console.log(`  原始: ${sourceApk}`);
console.log('');
console.log('\x1b[90m提示: 下次打包加 --open 可自动打开文件夹\x1b[0m');
console.log('      npm run android:build -- --open');
console.log('');

if (openFolder) {
  openInExplorer(destApk);
}
