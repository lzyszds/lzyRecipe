import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CoverProvider = 'local' | 'baidu' | 'bing';

export interface CloudSyncConfig {
  /** 自己部署的 Cloudflare Worker 地址，如 https://mengchu-sync.xxx.workers.dev */
  endpoint: string;
  /** 同步密钥：同一个密钥的设备和笔记互相可见 */
  token: string;
  /** 打开 App 时自动同步 */
  autoSync: boolean;
}

export interface AiSettings {
  /** OpenAI 兼容接口地址，如 https://api.deepseek.com/v1 */
  baseUrl: string;
  apiKey: string;
  /** 对话模型，如 deepseek-chat / gpt-4o-mini */
  model: string;
  /** 语音转文字模型，留空使用 whisper-1 */
  transcribeModel: string;
}

interface SettingsState {
  coverProvider: CoverProvider;
  baiduApiKey: string;
  baiduSecretKey: string;
  bingApiKey: string;
  /** 微软 Bing 图像搜索端点，国内可用 Azure 中国密钥 */
  bingEndpoint: string;
  /** 云同步（菜谱、收藏、周历、笔记、AI 与同步配置） */
  sync: CloudSyncConfig;
  /** AI 助手 */
  ai: AiSettings;
  setCoverProvider: (provider: CoverProvider) => void;
  setBaiduKeys: (apiKey: string, secretKey: string) => void;
  setBingKey: (apiKey: string) => void;
  setBingEndpoint: (endpoint: string) => void;
  setSync: (patch: Partial<CloudSyncConfig>) => void;
  setAi: (patch: Partial<AiSettings>) => void;
}

export const DEFAULT_SYNC: CloudSyncConfig = {
  endpoint: 'https://sync.lzyszds.cn',
  token: '',
  autoSync: true,
};

export const DEFAULT_AI: AiSettings = {
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  transcribeModel: 'whisper-1',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      coverProvider: 'local',
      baiduApiKey: '',
      baiduSecretKey: '',
      bingApiKey: '',
      bingEndpoint: 'https://api.bing.microsoft.com/v7.0/images/search',
      sync: { ...DEFAULT_SYNC },
      ai: { ...DEFAULT_AI },
      setCoverProvider: (coverProvider) => set({ coverProvider }),
      setBaiduKeys: (baiduApiKey, baiduSecretKey) => set({ baiduApiKey, baiduSecretKey }),
      setBingKey: (bingApiKey) => set({ bingApiKey }),
      setBingEndpoint: (bingEndpoint) => set({ bingEndpoint }),
      setSync: (patch) => set((state) => ({ sync: { ...state.sync, ...patch } })),
      setAi: (patch) => set((state) => ({ ai: { ...state.ai, ...patch } })),
    }),
    {
      name: 'app-settings',
      // 旧版本没有 sync / ai 字段，合并默认值避免首次打开时 undefined
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        const mergedSync = { ...DEFAULT_SYNC, ...saved.sync };
        if (!mergedSync.endpoint?.trim()) {
          mergedSync.endpoint = DEFAULT_SYNC.endpoint;
        }
        return {
          ...current,
          ...saved,
          sync: mergedSync,
          ai: { ...DEFAULT_AI, ...saved.ai },
        };
      },
    }
  )
);

export function isCloudCoverConfigured(state: SettingsState): boolean {
  if (state.coverProvider === 'baidu') {
    return Boolean(state.baiduApiKey.trim() && state.baiduSecretKey.trim());
  }
  if (state.coverProvider === 'bing') {
    return Boolean(state.bingApiKey.trim() && state.bingEndpoint.trim());
  }
  return false;
}

export function isSyncConfigured(sync: CloudSyncConfig): boolean {
  return Boolean(sync.endpoint.trim() && sync.token.trim());
}

export function isAiConfigured(ai: AiSettings): boolean {
  return Boolean(ai.baseUrl.trim() && ai.apiKey.trim() && ai.model.trim());
}
