import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Recipe } from '../types';
import { useFavoritesStore } from './favoritesStore';

interface ImportedRecipesState {
  importedRecipes: Recipe[];
  addImportedRecipes: (recipes: Recipe[]) => void;
  updateImportedRecipeCover: (recipeId: string, coverImage: string) => void;
  removeImportedRecipe: (recipeId: string) => void;
  clearImportedRecipes: () => void;
}

export const useImportedRecipesStore = create<ImportedRecipesState>()(
  persist(
    (set) => ({
      importedRecipes: [],
      addImportedRecipes: (recipes: Recipe[]) =>
        set((state) => {
          const existingIds = new Set(state.importedRecipes.map((r) => r.id));
          const newRecipes = recipes.filter((r) => !existingIds.has(r.id));
          return {
            importedRecipes: [...state.importedRecipes, ...newRecipes],
          };
        }),
      updateImportedRecipeCover: (recipeId, coverImage) =>
        set((state) => ({
          importedRecipes: state.importedRecipes.map((r) =>
            r.id === recipeId ? { ...r, coverImage } : r
          ),
        })),
      removeImportedRecipe: (recipeId: string) => {
        useFavoritesStore.getState().removeFavorite(recipeId);
        set((state) => ({
          importedRecipes: state.importedRecipes.filter((r) => r.id !== recipeId),
        }));
      },
      clearImportedRecipes: () => {
        const ids = useImportedRecipesStore.getState().importedRecipes.map((r) => r.id);
        ids.forEach((id) => useFavoritesStore.getState().removeFavorite(id));
        set({ importedRecipes: [] });
      },
    }),
    {
      name: 'imported-recipes-storage',
    }
  )
);
