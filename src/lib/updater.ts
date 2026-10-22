import { create } from 'zustand';
import { request, requestJson } from './net';
import { isTauri } from './tauri';
import { APP_NAME } from './appBrand';

/**
 * 应用更新：版本、安装包与前端整包都放在 GitHub Releases（由 GitHub Actions 自动发布）。
 * - 安卓端：支持“免安装更新”（前端整包）和安装包更新
 * - 桌面端：下载安装包自行安装
 * - 浏览器预览：只提示有新版本
 */

const REPO = 'lzyszds/lzyRecipe';
const RELEASE_PREFIX = `${APP_NAME}-v`;
const TAG_PATTERN = new RegExp(`^${APP_NAME}-v(\\d+)\\.(\\d+)\\.(\\d+)$`);

export const CURRENT_VERSION = __APP_VERSION__;
const CURRENT_BUILD_ID = __APP_BUILD_ID__;

interface GithubRelease {
  tag_name: string;
  name?: string;
  body?: string | null;
  html_url: string;
  published_at?: string;
  assets?: { name: string; browser_download_url: string; size: number }[];
}

export interface UpdateInfo {
  version: string;
  tag: string;
  notes: string;
  htmlUrl: string;
  publishedAt: string | null;
  /** 安卓安装包 */
  apk?: { url: string; size: number; name: string };
  /** 桌面安装包 */
  installer?: { url: string; size: number; name: string };
  /** 前端整包 web.zip：不重新安装即可热更新 */
  webBundle?: { url: string; size: number; name: string };
}

function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const isAndroid =
  typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

/** 发布的产物命名约定（与 GitHub Actions 保持一致） */
function pickAssets(releases: GithubRelease[]) {
  return (tag: string) => {
    const target = releases.find((r) => r.tag_name === tag);
    const assets = target?.assets ?? [];
    const apk = assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
    const installer = assets.find(
      (a) =>
        /\.(exe|msi|dmg|app\.tar\.gz|deb|AppImage)$/i.test(a.name) &&
        !/\.sig$/i.test(a.name)
    );
    const webBundle = assets.find((a) => a.name === 'web.zip');
    return { apk, installer, webBundle };
  };
}

function toUpdateInfo(release: GithubRelease, releaseList: GithubRelease[]): UpdateInfo {
  const { apk, installer, webBundle } = pickAssets(releaseList)(release.tag_name);
  return {
    version: tagToVersion(release.tag_name),
    tag: release.tag_name,
    notes: (release.body ?? '').trim(),
    htmlUrl: release.html_url,
    publishedAt: release.published_at ?? null,
    apk: apk
      ? { url: apk.browser_download_url, size: apk.size, name: apk.name }
      : undefined,
    installer: installer
      ? { url: installer.browser_download_url, size: installer.size, name: installer.name }
      : undefined,
    webBundle: webBundle
      ? { url: webBundle.browser_download_url, size: webBundle.size, name: webBundle.name }
      : undefined,
  };
}

function tagToVersion(tag: string): string {
  const match = tag.match(TAG_PATTERN);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : tag.replace(RELEASE_PREFIX, '');
}

async function checkGithub(options: { includePrerelease?: boolean }): Promise<UpdateInfo | null> {
  const releases = await requestJson<GithubRelease[]>(
    `https://api.github.com/repos/${REPO}/releases?per_page=20`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'MengChuShiGuang-Updater',
      },
      timeoutMs: 15000,
    }
  );
  if (!Array.isArray(releases)) return null;

  const valid = releases.filter((r) => TAG_PATTERN.test(r.tag_name));
  const stable = valid.filter((r) => !/beta|rc|alpha/i.test(r.tag_name));
  const pool = options.includePrerelease === false ? stable : valid;
  const latest = pool[0];
  if (!latest) return null;
  const info = toUpdateInfo(latest, valid);
  // 判断是否比当前新；本地开发时版本号可能还没升，用 build-id 判断源码是否已是最新提交
  if (compareVersion(info.version, CURRENT_VERSION) > 0) return info;
  const sameCommit = info.notes.includes(`build-id:${CURRENT_BUILD_ID}`);
  if (info.version === CURRENT_VERSION && CURRENT_BUILD_ID !== 'dev' && !sameCommit) return info;
  return null;
}

/**
 * 查询是否有新版本（读取 GitHub Releases）。
 * @param options.includePrerelease 首页等只关心正式版时传 false
 */
export async function checkForUpdate(
  options: { includePrerelease?: boolean } = {}
): Promise<UpdateInfo | null> {
  try {
    return await checkGithub(options);
  } catch {
    // 网络不可用或接口限流时静默忽略
    return null;
  }
}

function saveWithAnchor(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

interface UpdaterState {
  phase: 'idle' | 'checking' | 'downloading' | 'installing';
  progress: number;
  message: string;
  error: string;
}

export const useUpdaterStore = create<UpdaterState>(() => ({
  phase: 'idle',
  progress: 0,
  message: '',
  error: '',
}));

function setState(patch: Partial<UpdaterState>) {
  useUpdaterStore.setState(patch);
}

/** 下载安装包并进入安装流程 */
export async function downloadAndInstall(info: UpdateInfo): Promise<void> {
  const target = isAndroid ? info.apk : info.installer;
  if (!target) {
    setState({
      phase: 'idle',
      error: isAndroid
        ? '这个版本还没有安卓安装包，请稍后再试'
        : '这个版本还没有桌面安装包，请稍后再试',
    });
    return;
  }

  setState({ phase: 'downloading', progress: 0, error: '', message: '正在下载…' });
  try {
    setState({ message: '正在下载安装包…' });
    const res = await request({
      url: target.url,
      headers: { Accept: '*/*' },
      timeoutMs: 600000,
    });
    if (!res.ok) throw new Error(`下载失败（HTTP ${res.status}）`);
    if (!res.body.length) throw new Error('下载到的安装包为空，请稍后重试');

    if (isAndroid && isTauri()) {
      // 一次下载拿到字节，直接交给原生层写盘并拉起系统安装界面
      setState({ phase: 'installing', message: '下载完成，正在打开安装程序…' });
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('install_apk_from_bytes', {
        bytes: Array.from(res.body),
        fileName: `mengchu-${info.version}.apk`,
      });
      setState({ phase: 'idle', message: '请在弹出的安装界面中完成安装' });
      return;
    }

    // 桌面端 / 浏览器：保存文件，用户自行运行安装包
    saveWithAnchor(
      new Blob([res.body as unknown as BlobPart], { type: 'application/octet-stream' }),
      target.name
    );
    setState({
      phase: 'idle',
      message: isAndroid ? '已保存安装包，请在下载目录中打开安装' : '安装包已下载，运行它即可完成更新',
    });
  } catch (err) {
    setState({
      phase: 'idle',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** 当前生效的前端资源版本（热更新成功后可跨重启保留） */
export const ACTIVE_WEB_VERSION: string = readActiveWebVersion();

function readActiveWebVersion(): string {
  try {
    const raw = localStorage.getItem('web-update-active');
    if (!raw) return CURRENT_VERSION;
    const parsed = JSON.parse(raw) as { version?: string; buildId?: string };
    // 只有源码与当前构建相同（本地 dev 未变）时才认为热更新仍然有效
    if (parsed.buildId && parsed.buildId !== CURRENT_BUILD_ID) return CURRENT_VERSION;
    return parsed.version || CURRENT_VERSION;
  } catch {
    return CURRENT_VERSION;
  }
}

export function hasWebBundle(info: UpdateInfo | null): boolean {
  return Boolean(info?.webBundle);
}

/**
 * 下载并应用前端资源包（无需重新安装）。
 * 流程：下载 web.zip → 解压到应用数据目录 webapp-vX → 校验 index.html → 记为待生效
 * 返回解压目录路径，由调用方触发页面重载并写入 active 版本。
 */
export async function downloadWebBundle(info: UpdateInfo): Promise<void> {
  if (!info.webBundle) throw new Error('这个版本没有提供前端整包');
  if (!isTauri()) throw new Error('浏览器预览无法应用整包更新，请使用 App');

  setState({ phase: 'downloading', progress: 0, error: '', message: '正在下载更新包…' });
  try {
    const res = await request({
      url: info.webBundle.url,
      headers: { Accept: '*/*' },
      timeoutMs: 300000,
    });
    if (!res.ok) throw new Error(`下载失败（HTTP ${res.status}）`);
    if (!res.body.length) throw new Error('更新包为空，请稍后重试');

    setState({ phase: 'installing', message: '正在解压更新包…' });
    const { invoke } = await import('@tauri-apps/api/core');
    const dir = await invoke<string>('apply_web_bundle', {
      bytes: Array.from(res.body),
      version: info.version,
    });
    // 记录待生效信息：重载后由启动逻辑读取
    localStorage.setItem(
      'web-update-pending',
      JSON.stringify({ version: info.version, dir, buildId: latestBuildId(info) })
    );
    setState({ phase: 'idle', message: '更新包已准备好，即将重启界面…' });
    await reloadApp();
  } catch (err) {
    setState({ phase: 'idle', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

function latestBuildId(info: UpdateInfo): string {
  const match = info.notes.match(/build-id:([\w-]+)/);
  return match ? match[1] : '';
}

/** 重新加载应用界面（安卓端走 isReload 标记，桌面/浏览器直接刷新） */
async function reloadApp(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('reload_app');
  } catch {
    window.location.reload();
  }
}

/** 启动时若存在待生效的整包更新，返回其信息供界面提示 */
export function takePendingWebUpdate(): { version: string; dir: string; buildId: string } | null {
  try {
    const raw = localStorage.getItem('web-update-pending');
    if (!raw) return null;
    localStorage.removeItem('web-update-pending');
    const parsed = JSON.parse(raw) as { version: string; dir: string; buildId: string };
    if (parsed.version) {
      localStorage.setItem('web-update-active', JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 打开 Release 页面（安装失败时的兜底） */
export function openReleasePage(url: string) {
  window.open(url, '_blank', 'noopener');
}

export function formatSize(bytes?: number): string {
  if (!bytes) return '';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('zh-CN');
}
