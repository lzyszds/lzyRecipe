import { create } from 'zustand';
import type { AppVersionManifest } from '@/lib/updater';

interface UpdateState {
  /** 服务器上检测到的新版本清单（null = 无可用更新） */
  available: AppVersionManifest | null;
  /** 更新弹窗是否可见 */
  visible: boolean;
  /** APK 下载中 */
  downloading: boolean;
  /** 下载进度 0~1 */
  progress: number;
  setAvailable: (m: AppVersionManifest | null) => void;
  setVisible: (v: boolean) => void;
  setDownloading: (d: boolean) => void;
  setProgress: (p: number) => void;
}

/** 应用内整包更新状态（不持久化，每次启动重新检测） */
export const useUpdateStore = create<UpdateState>((set) => ({
  available: null,
  visible: false,
  downloading: false,
  progress: 0,
  setAvailable: (available) => set({ available, visible: Boolean(available) }),
  setVisible: (visible) => set({ visible }),
  setDownloading: (downloading) => set({ downloading }),
  setProgress: (progress) => set({ progress }),
}));
