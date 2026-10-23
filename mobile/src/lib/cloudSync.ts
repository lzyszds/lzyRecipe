import { create } from 'zustand';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useWeeklyPlanStore, emptyDay, WeeklyPlanDay } from '../store/weeklyPlanStore';
import { useNotesStore, Note } from '../store/notesStore';
import {
  useSettingsStore,
  isSyncConfigured,
  CloudSyncConfig,
} from '../store/settingsStore';
import { Recipe } from '../types';
import { getAllRecipes } from './recipes';
import { useBentoStore } from '../store/bentoStore';

/** 同步内容快照：服务端按密钥区分用户，多端完全一致 */
export interface SyncPayload {
  favorites: string[];
  importedRecipes: Recipe[];
  weeklyPlan: {
    weekKey: string;
    plans: WeeklyPlanDay[];
    includeOptionalGroups?: any;
    templates?: any[];
  };
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
    const res = await fetch(url, {
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
  const plan = useWeeklyPlanStore.getState();
  const settings = useSettingsStore.getState();
  const allRecipes = getAllRecipes(useImportedRecipesStore.getState().importedRecipes);
  return {
    favorites: useFavoritesStore.getState().favorites,
    importedRecipes: allRecipes,
    weeklyPlan: {
      weekKey: plan.weekKey,
      plans: plan.plans,
      includeOptionalGroups: plan.includeOptionalGroups,
    },
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

function applyPayload(payload: SyncPayload): void {
  if (Array.isArray(payload.favorites)) {
    useFavoritesStore.setState({ favorites: payload.favorites });
  }

  if (Array.isArray(payload.importedRecipes)) {
    // 按 id 合并，本地独有的保留
    const local = useImportedRecipesStore.getState().importedRecipes;
    const map = new Map(local.map((r) => [r.id, r]));
    for (const recipe of payload.importedRecipes) {
      map.set(recipe.id, recipe);
    }
    useImportedRecipesStore.setState({ importedRecipes: [...map.values()] });
  }

  if (payload.weeklyPlan) {
    const currentPlan = useWeeklyPlanStore.getState();
    useWeeklyPlanStore.setState({
      weekKey: payload.weeklyPlan.weekKey || currentPlan.weekKey,
      plans:
        Array.isArray(payload.weeklyPlan.plans) && payload.weeklyPlan.plans.length === 7
          ? payload.weeklyPlan.plans
          : Array.from({ length: 7 }, (_, i) => emptyDay(i)),
      includeOptionalGroups: {
        ...currentPlan.includeOptionalGroups,
        ...(payload.weeklyPlan.includeOptionalGroups ?? {}),
      },
    });
  }

  if (payload.bento) {
    useBentoStore.getState().mergeBentoData(payload.bento);
  }

  if (Array.isArray(payload.notes)) {
    useNotesStore.getState().mergeRemote(payload.notes);
  }

  if (payload.settings?.ai) {
    const localAi = useSettingsStore.getState().ai;
    useSettingsStore.getState().setAi({
      ...payload.settings.ai,
      apiKey: payload.settings.ai.apiKey?.trim() || localAi.apiKey,
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
    if (remote?.data) applyPayload(remote.data);
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

let autoSyncStarted = false;

/** 启动时自动同步 */
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
}
