import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecipeCoverOverridesState {
  overrides: Record<string, string>;
  setCoverOverride: (recipeId: string, coverImage: string) => void;
  clearCoverOverride: (recipeId: string) => void;
  getCoverOverride: (recipeId: string) => string | undefined;
}

export const useRecipeCoverOverridesStore = create<RecipeCoverOverridesState>()(
  persist(
    (set, get) => ({
      overrides: {},
      setCoverOverride: (recipeId, coverImage) =>
        set((state) => ({
          overrides: { ...state.overrides, [recipeId]: coverImage },
        })),
      clearCoverOverride: (recipeId) =>
        set((state) => {
          const next = { ...state.overrides };
          delete next[recipeId];
          return { overrides: next };
        }),
      getCoverOverride: (recipeId) => get().overrides[recipeId],
    }),
    {
      name: 'recipe-cover-overrides',
    }
  )
);
