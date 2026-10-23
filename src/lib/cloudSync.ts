import { create } from 'zustand';
import { requestJson } from './net';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import {
  useWeeklyPlanStore,
  emptyDay,
  type WeeklyPlanDay,
  type WeeklyPlanOptionalGroup,
} from '../store/weeklyPlanStore';
import { useWeeklyPlanTemplatesStore, type WeeklyPlanTemplate } from '../store/weeklyPlanTemplatesStore';
import { useNotesStore, type Note } from '../store/notesStore';
import {
  useSettingsStore,
  isSyncConfigured,
  type AiSettings,
  type CloudSyncConfig,
} from '../store/settingsStore';
import type { Recipe } from '../types';

/** 同步内容快照：服务端按密钥区分用户，只保存这一份 JSON */
export interface SyncPayload {
  favorites: string[];
  importedRecipes: Recipe[];
  weeklyPlan: {
    weekKey: string;
    plans: WeeklyPlanDay[];
    includeOptionalGroups: Record<WeeklyPlanOptionalGroup, boolean>;
    templates: WeeklyPlanTemplate[];
  };
  notes: Note[];
  settings: {
    ai: AiSettings;
    sync: CloudSyncConfig;
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
  return { Authorization: `Bearer ${config.token.trim()}` };
}

import { getAllRecipes } from './recipes';

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
      templates: useWeeklyPlanTemplatesStore.getState().templates,
    },
    notes: useNotesStore.getState().notes,
    settings: { ai: settings.ai, sync: settings.sync },
  };
}

function applyPayload(payload: SyncPayload): void {
  if (Array.isArray(payload.favorites)) {
    useFavoritesStore.setState({ favorites: payload.favorites });
  }
  if (Array.isArray(payload.importedRecipes)) {
    // 按 id 合并，云端没有的本地菜谱保留，避免某次同步把新写的菜谱冲掉
    const local = useImportedRecipesStore.getState().importedRecipes;
    const map = new Map(local.map((r) => [r.id, r]));
    for (const recipe of payload.importedRecipes) map.set(recipe.id, recipe);
    useImportedRecipesStore.setState({ importedRecipes: [...map.values()] });
  }
  if (payload.weeklyPlan) {
    const plan = useWeeklyPlanStore.getState();
    useWeeklyPlanStore.setState({
      weekKey: payload.weeklyPlan.weekKey || plan.weekKey,
      plans:
        Array.isArray(payload.weeklyPlan.plans) && payload.weeklyPlan.plans.length === 7
          ? payload.weeklyPlan.plans
          : Array.from({ length: 7 }, (_, i) => emptyDay(i)),
      includeOptionalGroups: {
        ...plan.includeOptionalGroups,
        ...(payload.weeklyPlan.includeOptionalGroups ?? {}),
      },
    });
    if (Array.isArray(payload.weeklyPlan.templates)) {
      useWeeklyPlanTemplatesStore.setState({ templates: payload.weeklyPlan.templates });
    }
  }
  if (Array.isArray(payload.notes)) useNotesStore.getState().mergeRemote(payload.notes);
  if (payload.settings) {
    const current = useSettingsStore.getState();
    if (payload.settings.ai) current.setAi(payload.settings.ai);
    // 同步地址与密钥始终保留本机填写的，避免被云端旧配置覆盖导致连不上
    const { endpoint, token } = current.sync;
    if (payload.settings.sync) current.setSync({ ...payload.settings.sync, endpoint, token });
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
    timeoutMs: 60000,
  });
}

async function pushPayload(config: CloudSyncConfig): Promise<void> {
  await requestJson<{ ok: boolean }>(endpointOf(config, '/sync'), {
    method: 'PUT',
    headers: authHeaders(config),
    json: collectPayload(),
    timeoutMs: 60000,
  });
}

/**
 * 双向同步：先把云端数据合并到本地，再把合并后的完整快照推回云端。
 * 单用户多设备场景下「合并后覆盖」足够简单可靠。
 */
export async function syncNow(
  config: CloudSyncConfig = useSettingsStore.getState().sync
): Promise<boolean> {
  if (!isSyncConfigured(config)) {
    finish('not-configured', '请先在设置中填写同步地址与密钥');
    return false;
  }
  useSyncStore.setState({ status: 'syncing', message: '正在同步…' });
  try {
    const remote = await fetchRemote(config);
    if (remote?.data) applyPayload(remote.data);
    await pushPayload(config);
    finish('success', '同步完成');
    return true;
  } catch (err) {
    finish('error', err instanceof Error ? err.message : String(err));
    return false;
  }
}

/** 只拉取云端数据到本地（新设备恢复用） */
export async function pullFromCloud(
  config: CloudSyncConfig = useSettingsStore.getState().sync
): Promise<void> {
  if (!isSyncConfigured(config)) throw new Error('请先在设置中填写同步地址与密钥');
  const remote = await fetchRemote(config);
  if (remote?.data) applyPayload(remote.data);
}

/** 只把本机数据推到云端（用本机覆盖云端） */
export async function pushToCloud(
  config: CloudSyncConfig = useSettingsStore.getState().sync
): Promise<void> {
  if (!isSyncConfigured(config)) throw new Error('请先在设置中填写同步地址与密钥');
  await pushPayload(config);
}

export async function testConnection(config: CloudSyncConfig = useSettingsStore.getState().sync) {
  if (!isSyncConfigured(config)) throw new Error('请先填写同步地址与密钥');
  const res = await requestJson<{ ok?: boolean; service?: string }>(
    endpointOf(config, '/health'),
    { timeoutMs: 15000 }
  );
  return res?.ok === true;
}

let autoSyncStarted = false;

/** 启动时自动同步一次（设置里可关闭） */
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
  window.setTimeout(() => {
    void syncNow(sync);
  }, 1500);
}
