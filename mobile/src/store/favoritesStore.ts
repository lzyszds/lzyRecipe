import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';

import { triggerAutoSync } from '@/lib/syncTrigger';
import { logActivity } from './activityLogStore';

interface FavoritesState {
  favorites: string[];
  favoritesUpdatedAt: number;
  addFavorite: (recipeId: string) => void;
  removeFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  toggleFavorite: (recipeId: string) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      favoritesUpdatedAt: 0,
      addFavorite: (recipeId: string) => {
        set((state) => ({
          favorites: state.favorites.includes(recipeId)
            ? state.favorites
            : [...state.favorites, recipeId],
          favoritesUpdatedAt: Date.now(),
        }));
        logActivity({ type: 'favorite', action: '收藏菜谱', detail: recipeId });
        triggerAutoSync(800);
      },
      removeFavorite: (recipeId: string) => {
        set((state) => ({
          favorites: state.favorites.filter((id) => id !== recipeId),
          favoritesUpdatedAt: Date.now(),
        }));
        logActivity({ type: 'favorite', action: '取消收藏', detail: recipeId });
        triggerAutoSync(800);
      },
      isFavorite: (recipeId: string) => get().favorites.includes(recipeId),
      toggleFavorite: (recipeId: string) => {
        const { favorites, addFavorite, removeFavorite } = get();
        if (favorites.includes(recipeId)) {
          removeFavorite(recipeId);
        } else {
          addFavorite(recipeId);
        }
      },
    }),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => safeAsyncStorage),
    }
  )
);
