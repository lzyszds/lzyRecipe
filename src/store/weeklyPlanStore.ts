import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Recipe } from '../types';
import {
  DEFAULT_WEEKLY_PLAN_INCLUDES,
  MEAL_SLOT_KEYS,
  buildSequentialWeeklyFill,
  buildSmartWeeklyFill,
  getCurrentWeekKey,
  suggestMealSlotForRecipe,
  type SmartFillTarget,
  type WeeklyPlanOptionalGroup,
} from '../lib/weeklyPlan';

export type { WeeklyPlanOptionalGroup, SmartFillTarget };

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export interface MealPlanEntry {
  recipeId: string;
  completed: boolean;
}

export interface WeeklyPlanDay {
  dayIndex: number;
  breakfast: MealPlanEntry;
  lunch: MealPlanEntry;
  dinner: MealPlanEntry;
}

/** @deprecated 旧版单日结构，仅用于迁移 */
export interface WeeklyPlanItem {
  dayIndex: number;
  recipeId: string;
  completed: boolean;
}

export const emptyMealEntry = (): MealPlanEntry => ({
  recipeId: '',
  completed: false,
});

export const emptyDay = (dayIndex: number): WeeklyPlanDay => ({
  dayIndex,
  breakfast: emptyMealEntry(),
  lunch: emptyMealEntry(),
  dinner: emptyMealEntry(),
});

const emptyPlan = (): WeeklyPlanDay[] =>
  Array.from({ length: 7 }, (_, dayIndex) => emptyDay(dayIndex));

interface WeeklyPlanState {
  weekKey: string;
  plans: WeeklyPlanDay[];
  includeOptionalGroups: Record<WeeklyPlanOptionalGroup, boolean>;
  ensureCurrentWeek: () => void;
  assignRecipe: (dayIndex: number, mealSlot: MealSlot, recipeId: string) => void;
  clearMeal: (dayIndex: number, mealSlot: MealSlot) => void;
  clearDay: (dayIndex: number) => void;
  clearPlan: () => void;
  toggleCompleted: (dayIndex: number, mealSlot: MealSlot) => void;
  smartShuffleFill: (recipes: Recipe[], target?: SmartFillTarget) => void;
  fillFromFavorites: (recipeIds: string[]) => void;
  addToFirstEmptySlot: (
    recipeId: string,
    preferredSlot?: MealSlot
  ) => { dayIndex: number; mealSlot: MealSlot } | null;
  setIncludeOptionalGroup: (key: WeeklyPlanOptionalGroup, included: boolean) => void;
  applyPlans: (plans: WeeklyPlanDay[]) => void;
}

function migrateLegacyPlans(
  legacy: WeeklyPlanItem[] | WeeklyPlanDay[] | undefined
): WeeklyPlanDay[] {
  if (!legacy?.length) return emptyPlan();

  const first = legacy[0] as WeeklyPlanItem | WeeklyPlanDay;
  if ('breakfast' in first) {
    return legacy.length === 7 ? (legacy as WeeklyPlanDay[]) : emptyPlan();
  }

  const oldPlans = legacy as WeeklyPlanItem[];
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const day = emptyDay(dayIndex);
    const old = oldPlans.find((p) => p.dayIndex === dayIndex);
    if (old?.recipeId) {
      day.dinner = { recipeId: old.recipeId, completed: old.completed };
    }
    return day;
  });
}

export const useWeeklyPlanStore = create<WeeklyPlanState>()(
  persist(
    (set, get) => ({
      weekKey: getCurrentWeekKey(),
      plans: emptyPlan(),
      includeOptionalGroups: { ...DEFAULT_WEEKLY_PLAN_INCLUDES },

      ensureCurrentWeek: () => {
        const current = getCurrentWeekKey();
        if (get().weekKey === current) return;
        set({ weekKey: current, plans: emptyPlan() });
      },

      assignRecipe: (dayIndex, mealSlot, recipeId) =>
        set((state) => ({
          plans: state.plans.map((day) =>
            day.dayIndex === dayIndex
              ? {
                  ...day,
                  [mealSlot]: { recipeId, completed: false },
                }
              : day
          ),
        })),

      clearMeal: (dayIndex, mealSlot) =>
        set((state) => ({
          plans: state.plans.map((day) =>
            day.dayIndex === dayIndex
              ? { ...day, [mealSlot]: emptyMealEntry() }
              : day
          ),
        })),

      clearDay: (dayIndex) =>
        set((state) => ({
          plans: state.plans.map((day) =>
            day.dayIndex === dayIndex ? emptyDay(dayIndex) : day
          ),
        })),

      clearPlan: () => set({ plans: emptyPlan() }),

      toggleCompleted: (dayIndex, mealSlot) =>
        set((state) => ({
          plans: state.plans.map((day) => {
            if (day.dayIndex !== dayIndex) return day;
            const meal = day[mealSlot];
            if (!meal.recipeId) return day;
            return {
              ...day,
              [mealSlot]: { ...meal, completed: !meal.completed },
            };
          }),
        })),

      smartShuffleFill: (recipes, target = 'all') => {
        const { plans, includeOptionalGroups } = get();
        set({
          plans: buildSmartWeeklyFill(plans, recipes, includeOptionalGroups, target),
        });
      },

      fillFromFavorites: (recipeIds) => {
        if (recipeIds.length === 0) return;
        const { plans } = get();
        set({ plans: buildSequentialWeeklyFill(plans, recipeIds) });
      },

      addToFirstEmptySlot: (recipeId, preferredSlot) => {
        const { plans } = get();
        const slotOrder: MealSlot[] = preferredSlot
          ? [preferredSlot, ...MEAL_SLOT_KEYS.filter((s) => s !== preferredSlot)]
          : [...MEAL_SLOT_KEYS];

        for (const mealSlot of slotOrder) {
          for (const day of plans) {
            if (!day[mealSlot].recipeId) {
              get().assignRecipe(day.dayIndex, mealSlot, recipeId);
              return { dayIndex: day.dayIndex, mealSlot };
            }
          }
        }
        return null;
      },

      setIncludeOptionalGroup: (key, included) =>
        set((state) => ({
          includeOptionalGroups: {
            ...state.includeOptionalGroups,
            [key]: included,
          },
        })),

      applyPlans: (plans) => {
        if (plans.length !== 7) return;
        set({
          plans: plans.map((day) => ({
            ...day,
            breakfast: { ...day.breakfast, completed: false },
            lunch: { ...day.lunch, completed: false },
            dinner: { ...day.dinner, completed: false },
          })),
        });
      },
    }),
    {
      name: 'weekly-plan-storage',
      version: 4,
      migrate: (persisted) => {
        const state = persisted as Partial<WeeklyPlanState> & {
          plans?: WeeklyPlanItem[] | WeeklyPlanDay[];
        };
        return {
          weekKey: state.weekKey ?? getCurrentWeekKey(),
          plans: migrateLegacyPlans(state.plans),
          includeOptionalGroups: {
            ...DEFAULT_WEEKLY_PLAN_INCLUDES,
            ...state.includeOptionalGroups,
          },
        };
      },
    }
  )
);

export function getSuggestedSlotForRecipeId(
  recipeId: string,
  recipes: Recipe[]
): MealSlot {
  const recipe = recipes.find((r) => r.id === recipeId);
  return recipe ? suggestMealSlotForRecipe(recipe) : 'dinner';
}
