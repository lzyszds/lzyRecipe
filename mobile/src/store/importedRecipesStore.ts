import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';
import { Recipe } from '../types';
import { useFavoritesStore } from './favoritesStore';

interface ImportedRecipesState {
  importedRecipes: Recipe[];
  addImportedRecipes: (recipes: Recipe[]) => void;
  saveOrUpdateRecipe: (recipe: Recipe) => void;
  updateImportedRecipeCover: (recipeId: string, coverImage: string, fallbackRecipe?: Recipe) => void;
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
      saveOrUpdateRecipe: (recipe: Recipe) =>
        set((state) => {
          const exists = state.importedRecipes.some((r) => r.id === recipe.id);
          if (exists) {
            return {
              importedRecipes: state.importedRecipes.map((r) =>
                r.id === recipe.id ? recipe : r
              ),
            };
          }
          return {
            importedRecipes: [...state.importedRecipes, recipe],
          };
        }),
      updateImportedRecipeCover: (recipeId, coverImage, fallbackRecipe) =>
        set((state) => {
          const exists = state.importedRecipes.some((r) => r.id === recipeId);
          if (exists) {
            return {
              importedRecipes: state.importedRecipes.map((r) =>
                r.id === recipeId ? { ...r, coverImage } : r
              ),
            };
          }
          if (fallbackRecipe) {
            return {
              importedRecipes: [
                ...state.importedRecipes,
                { ...fallbackRecipe, coverImage },
              ],
            };
          }
          return state;
        }),
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
      storage: createJSONStorage(() => safeAsyncStorage),
    }
  )
);
