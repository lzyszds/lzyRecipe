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
  model: 'minimaxai/minimax-m3.1-flash',
  channelKeys: {
    nvidia: '',
    siliconflow: '',
    deepseek: '',
    custom: '',
  },
  channelModels: {
    nvidia: 'minimaxai/minimax-m3.1-flash',
    siliconflow: 'deepseek-ai/DeepSeek-V3.2',
    deepseek: 'deepseek-flash',
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

        // 旧版默认模型自动升级：llama-3.1-70b 已从 NVIDIA 渠道默认位退役，
        // 若用户从未手动改过（仍等于旧默认值），则跟随新默认值，避免新装/老用户拿到过时模型
        const LEGACY_DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';
        const mergedChannelModels = {
          ...DEFAULT_AI.channelModels,
          ...(persistedAi.channelModels || {}),
        };
        if (mergedChannelModels.nvidia?.trim() === LEGACY_DEFAULT_MODEL) {
          mergedChannelModels.nvidia = DEFAULT_AI.channelModels?.nvidia ?? '';
        }

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
            model:
              persistedAi.model?.trim() && persistedAi.model !== LEGACY_DEFAULT_MODEL
                ? persistedAi.model
                : DEFAULT_AI.model,
            channelKeys: mergedChannelKeys,
            channelModels: mergedChannelModels,
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
