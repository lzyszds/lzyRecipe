import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';

export interface CloudSyncConfig {
  /** 部署的云同步服务地址，如 https://mengchu-sync.xxx.workers.dev */
  endpoint: string;
  /** 同步密钥：多端（桌面端、手机端）填写相同密钥即可双向同步 */
  token: string;
  /** 打开应用时自动同步 */
  autoSync: boolean;
}

interface SettingsState {
  sync: CloudSyncConfig;
  setSync: (patch: Partial<CloudSyncConfig>) => void;
}

export const DEFAULT_SYNC: CloudSyncConfig = {
  endpoint: 'https://sync.lzyszds.cn',
  token: '',
  autoSync: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sync: { ...DEFAULT_SYNC },
      setSync: (patch) =>
        set((state) => ({
          sync: { ...state.sync, ...patch },
        })),
    }),
    {
      name: 'lzy-recipe-settings-storage',
      storage: createJSONStorage(() => safeAsyncStorage),
      merge: (persistedState: any, currentState: SettingsState) => {
        const persistedSync = persistedState?.sync || {};
        return {
          ...currentState,
          sync: {
            ...DEFAULT_SYNC,
            ...persistedSync,
            endpoint: persistedSync.endpoint?.trim()
              ? persistedSync.endpoint
              : DEFAULT_SYNC.endpoint,
          },
        };
      },
    }
  )
);

export function isSyncConfigured(sync: CloudSyncConfig): boolean {
  return Boolean(sync.endpoint?.trim() && sync.token?.trim());
}
