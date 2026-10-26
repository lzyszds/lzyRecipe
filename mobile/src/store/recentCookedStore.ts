import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';

export interface RecentCooked {
  recipeId: string;
  /** 便当盒「已吃掉」打卡完成时间戳 */
  eatenAt: number;
}

interface RecentCookedState {
  recent: RecentCooked[];
  recordCooked: (recipeId: string) => void;
  removeCooked: (recipeId: string) => void;
  clearRecent: () => void;
}

const MAX_RECENT_COOKED = 12;

/**
 * 首页「最近点过」数据源：
 * 仅当便当盒里的餐品被打卡「已吃掉」（视为完成）时才记录，
 * 取消打卡会同步移除，纯浏览不产生记录。
 */
export const useRecentCookedStore = create<RecentCookedState>()(
  persist(
    (set) => ({
      recent: [],
      recordCooked: (recipeId) =>
        set((state) => {
          const next = state.recent.filter((item) => item.recipeId !== recipeId);
          return {
            recent: [{ recipeId, eatenAt: Date.now() }, ...next].slice(0, MAX_RECENT_COOKED),
          };
        }),
      removeCooked: (recipeId) =>
        set((state) => ({
          recent: state.recent.filter((item) => item.recipeId !== recipeId),
        })),
      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: 'recent-cooked-storage-v1',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({ recent: state.recent }),
    }
  )
);
