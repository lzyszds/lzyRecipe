import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';

interface TodayPlateState {
  plateRecipeIds: string[];
  checkedIngredients: Record<string, boolean>;
  isModalOpen: boolean;
  toastMessage: string | null;

  addToPlate: (recipeId: string) => void;
  removeFromPlate: (recipeId: string) => void;
  togglePlate: (recipeId: string) => boolean; // 返回当前是否已加入
  isInPlate: (recipeId: string) => boolean;
  clearPlate: () => void;
  toggleIngredientCheck: (key: string) => void;
  openModal: () => void;
  closeModal: () => void;
  showToast: (msg: string) => void;
}

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export const useTodayPlateStore = create<TodayPlateState>()(
  persist(
    (set, get) => ({
      // 默认给几个经典菜品，初次进入更有充实感
      plateRecipeIds: ['s001', 's003'],
      checkedIngredients: {},
      isModalOpen: false,
      toastMessage: null,

      addToPlate: (recipeId) =>
        set((state) => {
          if (state.plateRecipeIds.includes(recipeId)) return state;
          return { plateRecipeIds: [...state.plateRecipeIds, recipeId] };
        }),

      removeFromPlate: (recipeId) =>
        set((state) => ({
          plateRecipeIds: state.plateRecipeIds.filter((id) => id !== recipeId),
        })),

      togglePlate: (recipeId) => {
        const current = get().plateRecipeIds;
        const exists = current.includes(recipeId);
        if (exists) {
          set({ plateRecipeIds: current.filter((id) => id !== recipeId) });
          return false;
        } else {
          set({ plateRecipeIds: [...current, recipeId] });
          return true;
        }
      },

      isInPlate: (recipeId) => get().plateRecipeIds.includes(recipeId),

      clearPlate: () => set({ plateRecipeIds: [], checkedIngredients: {} }),

      toggleIngredientCheck: (key) =>
        set((state) => ({
          checkedIngredients: {
            ...state.checkedIngredients,
            [key]: !state.checkedIngredients[key],
          },
        })),

      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),

      showToast: (msg) => {
        if (toastTimeout) clearTimeout(toastTimeout);
        set({ toastMessage: msg });
        toastTimeout = setTimeout(() => {
          set({ toastMessage: null });
        }, 2200);
      },
    }),
    {
      name: 'lzy-recipe-today-plate-v1',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        plateRecipeIds: state.plateRecipeIds,
        checkedIngredients: state.checkedIngredients,
      }),
    }
  )
);
