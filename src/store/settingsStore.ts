import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CoverProvider = 'local' | 'baidu' | 'bing';

interface SettingsState {
  coverProvider: CoverProvider;
  baiduApiKey: string;
  baiduSecretKey: string;
  bingApiKey: string;
  /** 微软 Bing 图像搜索端点，国内可用 Azure 中国密钥 */
  bingEndpoint: string;
  setCoverProvider: (provider: CoverProvider) => void;
  setBaiduKeys: (apiKey: string, secretKey: string) => void;
  setBingKey: (apiKey: string) => void;
  setBingEndpoint: (endpoint: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      coverProvider: 'local',
      baiduApiKey: '',
      baiduSecretKey: '',
      bingApiKey: '',
      bingEndpoint: 'https://api.bing.microsoft.com/v7.0/images/search',
      setCoverProvider: (coverProvider) => set({ coverProvider }),
      setBaiduKeys: (baiduApiKey, baiduSecretKey) => set({ baiduApiKey, baiduSecretKey }),
      setBingKey: (bingApiKey) => set({ bingApiKey }),
      setBingEndpoint: (bingEndpoint) => set({ bingEndpoint }),
    }),
    { name: 'app-settings' }
  )
);

export function isCloudCoverConfigured(state: SettingsState): boolean {
  if (state.coverProvider === 'baidu') {
    return Boolean(state.baiduApiKey.trim() && state.baiduSecretKey.trim());
  }
  if (state.coverProvider === 'bing') {
    return Boolean(state.bingApiKey.trim());
  }
  return false;
}
