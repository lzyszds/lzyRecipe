import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';

/** 菜谱库排序模式（与 recipes.tsx 内部定义保持一致） */
export type RecipesSortMode = 'default' | 'timeAsc' | 'easyFirst';
/** 菜谱库卡片视图 */
export type RecipesCardLayout = 'compact' | 'magazine';

interface UiPrefsState {
  /** 菜谱库排序：综合 / 最快 / 简单优先 */
  recipesSortMode: RecipesSortMode;
  /** 菜谱库卡片视图：精品横卡 / 杂志大图卡 */
  recipesCardLayout: RecipesCardLayout;
  /** 首页场景筛选 id（all / fast / chuangxiang / seafood / soup / comfort） */
  homeScene: string;
  /** 开屏动画开关：关闭后冷启动直接进入首页（仅保留轻量加载遮罩） */
  splashEnabled: boolean;
  setRecipesSortMode: (mode: RecipesSortMode) => void;
  setRecipesCardLayout: (layout: RecipesCardLayout) => void;
  setHomeScene: (scene: string) => void;
  setSplashEnabled: (enabled: boolean) => void;
}

/**
 * 轻量界面偏好：把排序、卡片视图、首页场景筛选等纯 UI 状态持久化，
 * 避免每次冷启动都被重置回默认值
 */
export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      recipesSortMode: 'default',
      recipesCardLayout: 'compact',
      homeScene: 'all',
      splashEnabled: true,
      setRecipesSortMode: (mode) => set({ recipesSortMode: mode }),
      setRecipesCardLayout: (layout) => set({ recipesCardLayout: layout }),
      setHomeScene: (scene) => set({ homeScene: scene }),
      setSplashEnabled: (enabled) => set({ splashEnabled: enabled }),
    }),
    {
      name: 'lzy-recipe-ui-prefs-storage',
      storage: createJSONStorage(() => safeAsyncStorage),
    }
  )
);
