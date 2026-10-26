import { create } from 'zustand';
import { Recipe } from '../types';
import { useFeedbackStore } from './feedbackStore';

interface MealPlanSheetState {
  targetRecipe: Recipe | null;
  /** 每次打开递增，用于重置抽屉内的选周/选日状态 */
  session: number;
  openSheet: (recipe: Recipe) => void;
  closeSheet: () => void;
  toastMessage: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useMealPlanSheetStore = create<MealPlanSheetState>((set) => ({
  targetRecipe: null,
  session: 0,
  openSheet: (recipe) =>
    set((state) => ({ targetRecipe: recipe, session: state.session + 1 })),
  closeSheet: () => set({ targetRecipe: null }),
  toastMessage: null,
  showToast: (message) => {
    useFeedbackStore.getState().showToast(message);
  },
  clearToast: () => set({ toastMessage: null }),
}));
