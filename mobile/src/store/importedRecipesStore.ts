import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';
import { Recipe } from '../types';
import { useFavoritesStore } from './favoritesStore';

import { triggerAutoSync } from '@/lib/syncTrigger';

interface ImportedRecipesState {
  importedRecipes: Recipe[];
  addImportedRecipes: (recipes: Recipe[]) => void;
  saveOrUpdateRecipe: (recipe: Recipe) => void;
  updateImportedRecipeCover: (recipeId: string, coverImage: string, fallbackRecipe?: Recipe) => void;
  updateImportedRecipeCovers: (covers: Record<string, string>) => void;
  removeImportedRecipe: (recipeId: string) => void;
  clearImportedRecipes: () => void;
}

export const useImportedRecipesStore = create<ImportedRecipesState>()(
  persist(
    (set) => ({
      importedRecipes: [],
      addImportedRecipes: (recipes: Recipe[]) => {
        const now = new Date().toISOString();
        set((state) => {
          const existingIds = new Set(state.importedRecipes.map((r) => r.id));
          const newRecipes = recipes
            .filter((r) => !existingIds.has(r.id))
            .map((r) => ({
              ...r,
              createdAt: r.createdAt || now,
              updatedAt: r.updatedAt || now,
            }));
          return {
            importedRecipes: [...state.importedRecipes, ...newRecipes],
          };
        });
        triggerAutoSync(800);
      },
      saveOrUpdateRecipe: (recipe: Recipe) => {
        const now = new Date().toISOString();
        const recipeWithTimestamp: Recipe = {
          ...recipe,
          createdAt: recipe.createdAt || now,
          updatedAt: now,
        };
        set((state) => {
          const exists = state.importedRecipes.some((r) => r.id === recipe.id);
          if (exists) {
            return {
              importedRecipes: state.importedRecipes.map((r) =>
                r.id === recipe.id ? recipeWithTimestamp : r
              ),
            };
          }
          return {
            importedRecipes: [...state.importedRecipes, recipeWithTimestamp],
          };
        });
        triggerAutoSync(500);
      },
      updateImportedRecipeCover: (recipeId, coverImage, fallbackRecipe) => {
        const now = new Date().toISOString();
        set((state) => {
          const exists = state.importedRecipes.some((r) => r.id === recipeId);
          if (exists) {
            return {
              importedRecipes: state.importedRecipes.map((r) =>
                r.id === recipeId ? { ...r, coverImage, updatedAt: now } : r
              ),
            };
          }
          if (fallbackRecipe) {
            return {
              importedRecipes: [
                ...state.importedRecipes,
                { ...fallbackRecipe, coverImage, updatedAt: now },
              ],
            };
          }
          return state;
        });
        triggerAutoSync(300);
      },
      updateImportedRecipeCovers: (covers) => {
        const now = new Date().toISOString();
        set((state) => ({
          importedRecipes: state.importedRecipes.map((r) =>
            covers[r.id] ? { ...r, coverImage: covers[r.id], updatedAt: now } : r
          ),
        }));
        triggerAutoSync(500);
      },
      removeImportedRecipe: (recipeId: string) => {
        useFavoritesStore.getState().removeFavorite(recipeId);
        set((state) => ({
          importedRecipes: state.importedRecipes.filter((r) => r.id !== recipeId),
        }));
        triggerAutoSync(500);
      },
      clearImportedRecipes: () => {
        const ids = useImportedRecipesStore.getState().importedRecipes.map((r) => r.id);
        ids.forEach((id) => useFavoritesStore.getState().removeFavorite(id));
        set({ importedRecipes: [] });
        triggerAutoSync(500);
      },
    }),
    {
      name: 'imported-recipes-storage',
      storage: createJSONStorage(() => safeAsyncStorage),
      // 迁移：历史数据里的 base64 封面统一清空（体积大、拖慢加载与云同步），缺图走补全流程
      onRehydrateStorage: () => (state) => {
        if (state?.importedRecipes?.some((r) => String(r.coverImage || '').startsWith('data:'))) {
          setTimeout(() => {
            useImportedRecipesStore.setState({
              importedRecipes: useImportedRecipesStore
                .getState()
                .importedRecipes.map((r) =>
                  String(r.coverImage || '').startsWith('data:') ? { ...r, coverImage: '' } : r
                ),
            });
          }, 0);
        }
      },
    }
  )
);
