import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WeeklyPlanItem {
  dayIndex: number;
  recipeId: string;
  completed: boolean;
}

interface WeeklyPlanState {
  plans: WeeklyPlanItem[];
  initPlan: (recipeIds: string[]) => void;
  toggleCompleted: (dayIndex: number) => void;
  setRecipe: (dayIndex: number, recipeId: string) => void;
}

const emptyPlan = (): WeeklyPlanItem[] =>
  Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex,
    recipeId: '',
    completed: false,
  }));

export const useWeeklyPlanStore = create<WeeklyPlanState>()(
  persist(
    (set, get) => ({
      plans: emptyPlan(),
      initPlan: (recipeIds: string[]) => {
        const { plans } = get();
        const hasRecipes = plans.some((p) => p.recipeId);
        if (hasRecipes || recipeIds.length === 0) return;

        set({
          plans: plans.map((plan, index) => ({
            ...plan,
            recipeId: recipeIds[index % recipeIds.length] ?? '',
          })),
        });
      },
      toggleCompleted: (dayIndex: number) =>
        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.dayIndex === dayIndex
              ? { ...plan, completed: !plan.completed }
              : plan
          ),
        })),
      setRecipe: (dayIndex: number, recipeId: string) =>
        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.dayIndex === dayIndex ? { ...plan, recipeId } : plan
          ),
        })),
    }),
    {
      name: 'weekly-plan-storage',
    }
  )
);
