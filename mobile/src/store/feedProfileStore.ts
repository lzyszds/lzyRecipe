import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';
import type { Recipe } from '@/types';

interface FeedProfileState {
  /** 分类浏览次数（用户点进菜谱详情时累加） */
  categoryViews: Record<string, number>;
  /** 标签浏览次数（口味偏好信号） */
  tagViews: Record<string, number>;
  /** 记录一次菜谱浏览：为推荐引擎累加口味画像 */
  recordView: (recipe: Recipe) => void;
  /** 清空画像（配合"重置推荐"功能） */
  resetProfile: () => void;
}

/** 单项计数上限：防止极端用户权重无限膨胀 */
const MAX_COUNT = 999;

/**
 * 推荐口味画像：
 * 记录用户浏览行为聚合出的分类/标签偏好，供信息流推荐引擎做个性化加权。
 * 收藏与"已吃掉"信号复用 favoritesStore / recentCookedStore，不在重复记录。
 */
export const useFeedProfileStore = create<FeedProfileState>()(
  persist(
    (set) => ({
      categoryViews: {},
      tagViews: {},
      recordView: (recipe) =>
        set((state) => {
          const bump = (rec: Record<string, number>, keys: string[]) => {
            if (keys.length === 0) return rec;
            const next = { ...rec };
            for (const k of keys) next[k] = Math.min(MAX_COUNT, (next[k] || 0) + 1);
            return next;
          };
          return {
            categoryViews: bump(state.categoryViews, recipe.category ? [recipe.category] : []),
            tagViews: bump(state.tagViews, recipe.tags || []),
          };
        }),
      resetProfile: () => set({ categoryViews: {}, tagViews: {} }),
    }),
    {
      name: 'feed-profile-storage-v1',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        categoryViews: state.categoryViews,
        tagViews: state.tagViews,
      }),
    }
  )
);
