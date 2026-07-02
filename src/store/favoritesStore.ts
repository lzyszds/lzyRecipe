import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  favorites: string[];
  addFavorite: (recipeId: string) => void;
  removeFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  toggleFavorite: (recipeId: string) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (recipeId: string) =>
        set((state) => ({
          favorites: state.favorites.includes(recipeId)
            ? state.favorites
            : [...state.favorites, recipeId],
        })),
      removeFavorite: (recipeId: string) =>
        set((state) => ({
          favorites: state.favorites.filter((id) => id !== recipeId),
        })),
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
    }
  )
);
