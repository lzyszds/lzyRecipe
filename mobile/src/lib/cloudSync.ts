import { create } from 'zustand';
import { AppState } from 'react-native';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useNotesStore, Note } from '../store/notesStore';
import {
  useSettingsStore,
  isSyncConfigured,
  CloudSyncConfig,
} from '../store/settingsStore';
import { Recipe } from '../types';
import { recipes as builtinRecipes } from '../data/recipes';
import { generatedRecipes } from '../data/generatedRecipes';
import { useBentoStore } from '../store/bentoStore';
import { wrapCorsProxy } from './proxyUrl';

/** 内置菜谱 id 集合：内置/AI 生成库随 App 发版打包，不参与云同步（否则每次推好几 MB） */
const BUILTIN_RECIPE_IDS = new Set<string>([...builtinRecipes, ...generatedRecipes].map((r) => r.id));

/** 同步内容快照：服务端按密钥区分用户，多端完全一致 */
export interface SyncPayload {
  favorites: string[];
  favoritesUpdatedAt?: number;
  importedRecipes: Recipe[];
  notes: Note[];
  bento?: {
    recipePool: string[];
    bentoByDate: Record<string, import('../store/bentoStore').DayBento>;
  };
  settings?: {
    sync: CloudSyncConfig;
    ai?: import('../store/settingsStore').AiSettings;
  };
}

interface SyncEnvelope {
  data: SyncPayload;
  updatedAt: string | null;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'not-configured';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  message: string;
}

export const useSyncStore = create<SyncState>(() => ({
  status: 'not-configured',
  lastSyncedAt: null,
  message: '',
}));

function endpointOf(config: CloudSyncConfig, path: string): string {
  return `${config.endpoint.trim().replace(/\/+$/, '')}${path}`;
}

function authHeaders(config: CloudSyncConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.token.trim()}`,
    'Content-Type': 'application/json',
  };
}

async function requestJson<T>(
  url: string,
  options: { method?: string; headers?: Record<string, string>; json?: any; timeoutMs?: number } = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);

  try {
    const res = await fetch(wrapCorsProxy(url), {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.json ? JSON.stringify(options.json) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function collectPayload(): SyncPayload {
  const settings = useSettingsStore.getState();
  // 只同步用户数据（导入/AI 生成的个人菜谱），不携带内置菜谱库
  const importedRecipes = useImportedRecipesStore.getState().importedRecipes;
  return {
    favorites: useFavoritesStore.getState().favorites,
    favoritesUpdatedAt: useFavoritesStore.getState().favoritesUpdatedAt,
    importedRecipes,
    notes: useNotesStore.getState().notes,
    bento: {
      recipePool: useBentoStore.getState().recipePool,
      bentoByDate: useBentoStore.getState().bentoByDate,
    },
    settings: {
      sync: settings.sync,
      ai: settings.ai,
    },
  };
}

function applyPayload(
  payload: SyncPayload,
  options: { preferRemoteFavorites?: boolean } = {}
): void {
  if (Array.isArray(payload.favorites)) {
    const local = useFavoritesStore.getState();
    const remoteUpdatedAt =
      typeof payload.favoritesUpdatedAt === 'number' ? payload.favoritesUpdatedAt : 0;

    if (options.preferRemoteFavorites || remoteUpdatedAt > local.favoritesUpdatedAt) {
      useFavoritesStore.setState({
        favorites: payload.favorites,
        favoritesUpdatedAt: remoteUpdatedAt,
      });
    } else if (remoteUpdatedAt === 0 && local.favoritesUpdatedAt === 0) {
      // 兼容旧版云端数据：没有时间戳时取并集，避免本地刚收藏的菜被旧数据覆盖
      useFavoritesStore.setState({
        favorites: Array.from(new Set([...local.favorites, ...payload.favorites])),
      });
    }
  }

  if (Array.isArray(payload.importedRecipes)) {
    // 按 id 合并，通过 updatedAt 时间戳比较，本地更新时间更新或相同则保留本地，绝不被远端旧数据覆盖
    // 额外过滤内置菜谱：旧版云端存过全量库，这里不再回收进本地（下次推送自动清理云端冗余）
    const local = useImportedRecipesStore.getState().importedRecipes;
    const map = new Map(local.map((r) => [r.id, r]));
    for (const remoteRecipe of payload.importedRecipes) {
      if (BUILTIN_RECIPE_IDS.has(remoteRecipe.id)) continue;
      const localRecipe = map.get(remoteRecipe.id);
      if (!localRecipe) {
        map.set(remoteRecipe.id, remoteRecipe);
      } else {
        const localTime = new Date(localRecipe.updatedAt || localRecipe.createdAt || 0).getTime();
        const remoteTime = new Date(remoteRecipe.updatedAt || remoteRecipe.createdAt || 0).getTime();
        // 只有当云端更新时间严格晚于本地修改时间时，才接受云端覆盖；否则坚决保留本地最新修改
        if (remoteTime > localTime) {
          map.set(remoteRecipe.id, remoteRecipe);
        }
      }
    }
    useImportedRecipesStore.setState({ importedRecipes: [...map.values()] });
  }

  if (payload.bento) {
    useBentoStore.getState().mergeBentoData(payload.bento);
  }

  if (Array.isArray(payload.notes)) {
    useNotesStore.getState().mergeRemote(payload.notes);
  }

  if (payload.settings?.ai) {
    const localAi = useSettingsStore.getState().ai;
    const remoteAi = payload.settings.ai;
    useSettingsStore.getState().setAi({
      ...remoteAi,
      apiKey: remoteAi.apiKey?.trim() || localAi.apiKey,
      channelKeys: {
        ...(localAi.channelKeys || {}),
        ...(remoteAi.channelKeys || {}),
      },
      channelModels: {
        ...(localAi.channelModels || {}),
        ...(remoteAi.channelModels || {}),
      },
      channelBaseUrls: {
        ...(localAi.channelBaseUrls || {}),
        ...(remoteAi.channelBaseUrls || {}),
      },
    });
  }
}

function finish(status: Exclude<SyncStatus, 'syncing'>, message: string) {
  useSyncStore.setState({
    status,
    message,
    ...(status === 'success' ? { lastSyncedAt: new Date().toISOString() } : {}),
  });
}

async function fetchRemote(config: CloudSyncConfig): Promise<SyncEnvelope | null> {
  return requestJson<SyncEnvelope | null>(endpointOf(config, '/sync'), {
    headers: authHeaders(config),
    timeoutMs: 30000,
  });
}

async function pushPayload(config: CloudSyncConfig): Promise<void> {
  await requestJson<{ ok: boolean }>(endpointOf(config, '/sync'), {
    method: 'PUT',
    headers: authHeaders(config),
    json: collectPayload(),
    timeoutMs: 30000,
  });
}

let isSyncing = false;
let pendingSync = false;

/**
 * 双向同步：先拉取合并云端数据，再把合并后的完整快照推回云端
 */
export async function syncNow(
  config: CloudSyncConfig = useSettingsStore.getState().sync
): Promise<boolean> {
  if (!isSyncConfigured(config)) {
    finish('not-configured', '请先填写同步服务地址与密钥');
    return false;
  }

  if (isSyncing) {
    pendingSync = true;
    return false;
  }

  isSyncing = true;
  useSyncStore.setState({ status: 'syncing', message: '正在同步…' });
  try {
    const remote = await fetchRemote(config);
    if (remote?.data) {
      applyPayload(remote.data);
    }
    await pushPayload(config);
    finish('success', '同步完成');
    return true;
  } catch (err: any) {
    finish('error', err instanceof Error ? err.message : String(err));
    return false;
  } finally {
    isSyncing = false;
    if (pendingSync) {
      pendingSync = false;
      setTimeout(() => {
        void syncNow(useSettingsStore.getState().sync);
      }, 300);
    }
  }
}

/** 只拉取云端数据到本地 */
export async function pullFromCloud(
  config: CloudSyncConfig = useSettingsStore.getState().sync
): Promise<void> {
  if (!isSyncConfigured(config)) throw new Error('请先填写同步服务地址与密钥');
  useSyncStore.setState({ status: 'syncing', message: '正在从云端拉取…' });
  try {
    const remote = await fetchRemote(config);
    if (remote?.data) applyPayload(remote.data, { preferRemoteFavorites: true });
    finish('success', '已从云端恢复数据');
  } catch (err: any) {
    finish('error', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/** 只把本机数据推到云端 */
export async function pushToCloud(
  config: CloudSyncConfig = useSettingsStore.getState().sync
): Promise<void> {
  if (!isSyncConfigured(config)) throw new Error('请先填写同步服务地址与密钥');
  useSyncStore.setState({ status: 'syncing', message: '正在推送至云端…' });
  try {
    await pushPayload(config);
    finish('success', '已成功覆盖云端');
  } catch (err: any) {
    finish('error', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

export async function testConnection(
  config: CloudSyncConfig = useSettingsStore.getState().sync
): Promise<boolean> {
  if (!isSyncConfigured(config)) throw new Error('请先填写同步服务地址与密钥');
  const res = await requestJson<{ ok?: boolean }>(endpointOf(config, '/health'), {
    headers: authHeaders(config),
    timeoutMs: 12000,
  });
  return res?.ok === true;
}

import { registerSyncRunner, triggerAutoSync } from './syncTrigger';

export { triggerAutoSync };

let autoSyncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function performDebouncedAutoSync(delayMs = 500) {
  const sync = useSettingsStore.getState().sync;
  if (!isSyncConfigured(sync) || !sync.autoSync) return;

  if (autoSyncDebounceTimer) {
    clearTimeout(autoSyncDebounceTimer);
  }

  autoSyncDebounceTimer = setTimeout(() => {
    autoSyncDebounceTimer = null;
    void syncNow(sync);
  }, delayMs);
}

registerSyncRunner(performDebouncedAutoSync);

let autoSyncStarted = false;

/** 启动时自动同步 + 回到前台自动对齐 */
export function startAutoSync() {
  if (autoSyncStarted) return;
  autoSyncStarted = true;
  const sync = useSettingsStore.getState().sync;
  if (!isSyncConfigured(sync)) {
    useSyncStore.setState({ status: 'not-configured', message: '未配置云同步' });
    return;
  }
  if (!sync.autoSync) {
    useSyncStore.setState({ status: 'idle', message: '已关闭自动同步' });
    return;
  }

  setTimeout(() => {
    void syncNow(sync);
  }, 1200);

  // 回到前台即开新会话同步一次：
  // App 在后台/被杀期间在其他端做过的改动，切回来立刻双向对齐（60s 内已同步过则跳过）
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    const latest = useSettingsStore.getState().sync;
    if (!isSyncConfigured(latest) || !latest.autoSync) return;
    const last = new Date(useSyncStore.getState().lastSyncedAt || 0).getTime();
    if (Date.now() - last < 60000) return;
    setTimeout(() => {
      void syncNow(latest);
    }, 800);
  });
}
