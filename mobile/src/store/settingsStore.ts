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
  /** 当前生效的渠道 ID，如 'nvidia' | 'siliconflow' | 'deepseek' | 'custom' */
  providerId?: string;
  /** OpenAI 兼容接口地址，如 https://api.deepseek.com/v1 或 https://api.openai.com/v1 */
  baseUrl: string;
  /** 当前生效的 API Key (保持向下兼容) */
  apiKey: string;
  /** 对话模型，如 deepseek-chat / gpt-4o-mini */
  model: string;
  /** 每个渠道独立的 API Key，Key 为渠道 id（如 'nvidia' | 'siliconflow' | 'deepseek' | 'custom'） */
  channelKeys?: Record<string, string>;
  /** 每个渠道独立配置的模型，Key 为渠道 id */
  channelModels?: Record<string, string>;
  /** 每个渠道独立配置的 BaseUrl，Key 为渠道 id（如 custom 渠道保存的自定义地址） */
  channelBaseUrls?: Record<string, string>;
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
  providerId: 'nvidia',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  apiKey: '',
  model: 'meta/llama-3.1-70b-instruct',
  channelKeys: {
    nvidia: '',
    siliconflow: '',
    deepseek: '',
    custom: '',
  },
  channelModels: {
    nvidia: 'meta/llama-3.1-70b-instruct',
    siliconflow: 'deepseek-ai/DeepSeek-V3',
    deepseek: 'deepseek-chat',
    custom: '',
  },
  channelBaseUrls: {
    nvidia: 'https://integrate.api.nvidia.com/v1',
    siliconflow: 'https://api.siliconflow.cn/v1',
    deepseek: 'https://api.deepseek.com/v1',
    custom: '',
  },
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

        // 智能兼容老版单一 apiKey：若存在老版 key 但 channelKeys 未定义，自动识别并迁移至对应渠道
        const legacyKey = persistedAi.apiKey || '';
        const legacyUrl = persistedAi.baseUrl || '';
        const existingChannelKeys = { ...(persistedAi.channelKeys || {}) };

        let detectedChannel = 'custom';
        if (legacyUrl.includes('integrate.api.nvidia.com')) detectedChannel = 'nvidia';
        else if (legacyUrl.includes('siliconflow.cn')) detectedChannel = 'siliconflow';
        else if (legacyUrl.includes('deepseek.com')) detectedChannel = 'deepseek';

        if (legacyKey && !existingChannelKeys[detectedChannel]) {
          existingChannelKeys[detectedChannel] = legacyKey;
        }

        const mergedChannelKeys = {
          ...DEFAULT_AI.channelKeys,
          ...existingChannelKeys,
        };

        const activeProviderId = persistedAi.providerId || detectedChannel;
        const activeKey = mergedChannelKeys[activeProviderId] || legacyKey || '';

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
            providerId: activeProviderId,
            apiKey: activeKey,
            channelKeys: mergedChannelKeys,
            channelModels: {
              ...DEFAULT_AI.channelModels,
              ...(persistedAi.channelModels || {}),
            },
            channelBaseUrls: {
              ...DEFAULT_AI.channelBaseUrls,
              ...(persistedAi.channelBaseUrls || {}),
            },
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
