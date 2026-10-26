import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';

export interface RecentView {
  recipeId: string;
  viewedAt: number;
}

interface RecentViewsState {
  recent: RecentView[];
  recordView: (recipeId: string) => void;
  removeView: (recipeId: string) => void;
  clearRecent: () => void;
}

const MAX_RECENT_VIEWS = 12;

export const useRecentViewsStore = create<RecentViewsState>()(
  persist(
    (set) => ({
      recent: [],
      recordView: (recipeId) =>
        set((state) => {
          const next = state.recent.filter((item) => item.recipeId !== recipeId);
          return {
            recent: [
              { recipeId, viewedAt: Date.now() },
              ...next,
            ].slice(0, MAX_RECENT_VIEWS),
          };
        }),
      removeView: (recipeId) =>
        set((state) => ({
          recent: state.recent.filter((item) => item.recipeId !== recipeId),
        })),
      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: 'recent-views-storage-v1',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({ recent: state.recent }),
    }
  )
);
