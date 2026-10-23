import { create } from 'zustand';
import { Recipe } from '../types';

interface MealPlanSheetState {
  targetRecipe: Recipe | null;
  openSheet: (recipe: Recipe) => void;
  closeSheet: () => void;
  toastMessage: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useMealPlanSheetStore = create<MealPlanSheetState>((set) => ({
  targetRecipe: null,
  openSheet: (recipe) => set({ targetRecipe: recipe }),
  closeSheet: () => set({ targetRecipe: null }),
  toastMessage: null,
  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => {
      set({ toastMessage: null });
    }, 2200);
  },
  clearToast: () => set({ toastMessage: null }),
}));
