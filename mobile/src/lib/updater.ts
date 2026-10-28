import { Platform } from 'react-native';
import { wrapCorsProxy } from './proxyUrl';

/** 服务器版本清单结构 */
export interface AppVersionManifest {
  /** 原生包版本号（与 app.json android.versionCode 对应） */
  versionCode: number;
  /** 展示用版本名，如 "1.2.1" */
  versionName: string;
  /** 新 APK 的直链下载地址 */
  apkUrl: string;
  /** 更新说明（弹窗里展示） */
  notes?: string;
}

/** 版本清单地址：服务器上放一个 app-version.json 即可（见 docs/app-update.md） */
export const MANIFEST_URL = 'https://sync.lzyszds.cn/app-version.json';

/** 拉取服务器版本清单；失败返回 null（视为"无法检查"，不打扰用户） */
export async function fetchLatestManifest(): Promise<AppVersionManifest | null> {
  try {
    const res = await fetch(wrapCorsProxy(MANIFEST_URL), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && typeof json.versionCode === 'number' && typeof json.apkUrl === 'string') {
      return json as AppVersionManifest;
    }
    return null;
  } catch {
    return null;
  }
}

/** 当前 App 的原生版本号（expo.version，如 "1.2.1"） */
export function currentVersionName(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants');
    return Constants.expoConfig?.version || '';
  } catch {
    return '';
  }
}

/** 当前 App 的原生版本号数字（android.versionCode） */
export function currentVersionCode(): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants');
    return Number(Constants.expoConfig?.android?.versionCode || 0);
  } catch {
    return 0;
  }
}

/** 服务器版本是否比当前安装的新 */
export function isNewerVersion(manifest: AppVersionManifest, currentVersionCode: number): boolean {
  return typeof manifest.versionCode === 'number' && manifest.versionCode > currentVersionCode;
}

/** 当前平台是否支持应用内下载安装（仅 Android 原生端） */
export function isInAppInstallSupported(): boolean {
  return Platform.OS === 'android';
}

export interface ApkDownloadProgress {
  received: number;
  total: number;
}

/**
 * 应用内下载新 APK 并拉起系统安装器（仅 Android）。
 * 下载走 expo-file-system（带进度回调），下载完成后通过 content:// URI 拉起系统安装器。
 * 首次安装时系统会引导用户开启"允许安装未知应用"。
 */
export async function downloadAndInstallApk(
  apkUrl: string,
  onProgress?: (ratio: number) => void
): Promise<void> {
  if (Platform.OS !== 'android') throw new Error('仅支持 Android');

  // SDK 54+ 主入口是新 API，下载/取 content:// 用 legacy 入口最稳
  let FS: any;
  try {
    FS = require('expo-file-system/legacy');
  } catch {
    FS = require('expo-file-system');
  }

  const target = `${FS.cacheDirectory}shike-update-${Date.now()}.apk`;
  const { uri } = await FS.downloadAsync(apkUrl, target, {}, (dp: any) => {
    if (dp.totalBytesExpectedToWrite > 0) {
      onProgress?.(dp.totalBytesWritten / dp.totalBytesExpectedToWrite);
    }
  });

  // file:// 转 content://（走 FileProvider），安装器才有权限读取
  const contentUri = await FS.getContentUriAsync(uri);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const IntentLauncher = require('expo-intent-launcher');
  await IntentLauncher.startActivityAsync(IntentLauncher.ACTION_VIEW, {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}
