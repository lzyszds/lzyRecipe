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

export interface AiSettings {
  /** OpenAI 兼容接口地址，如 https://api.deepseek.com/v1 或 https://api.openai.com/v1 */
  baseUrl: string;
  apiKey: string;
  /** 对话模型，如 deepseek-chat / gpt-4o-mini */
  model: string;
}

interface SettingsState {
  sync: CloudSyncConfig;
  ai: AiSettings;
  setSync: (patch: Partial<CloudSyncConfig>) => void;
  setAi: (patch: Partial<AiSettings>) => void;
}

export const DEFAULT_SYNC: CloudSyncConfig = {
  endpoint: 'https://sync.lzyszds.cn',
  token: '',
  autoSync: true,
};

export const DEFAULT_AI: AiSettings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sync: { ...DEFAULT_SYNC },
      ai: { ...DEFAULT_AI },
      setSync: (patch) =>
        set((state) => ({
          sync: { ...state.sync, ...patch },
        })),
      setAi: (patch) =>
        set((state) => ({
          ai: { ...state.ai, ...patch },
        })),
    }),
    {
      name: 'lzy-recipe-settings-storage',
      storage: createJSONStorage(() => safeAsyncStorage),
      merge: (persistedState: any, currentState: SettingsState) => {
        const persistedSync = persistedState?.sync || {};
        const persistedAi = persistedState?.ai || {};
        return {
          ...currentState,
          sync: {
            ...DEFAULT_SYNC,
            ...persistedSync,
            endpoint: persistedSync.endpoint?.trim()
              ? persistedSync.endpoint
              : DEFAULT_SYNC.endpoint,
          },
          ai: {
            ...DEFAULT_AI,
            ...persistedAi,
          },
        };
      },
    }
  )
);

export function isSyncConfigured(sync: CloudSyncConfig): boolean {
  return Boolean(sync.endpoint?.trim() && sync.token?.trim());
}

export function isAiConfigured(ai: AiSettings): boolean {
  return Boolean(ai.baseUrl?.trim() && ai.apiKey?.trim() && ai.model?.trim());
}
