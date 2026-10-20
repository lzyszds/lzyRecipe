import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeeklyPlanDay } from './weeklyPlanStore';
import { emptyDay } from './weeklyPlanStore';
import { countPlanMeals } from '../lib/weeklyPlan';

export interface WeeklyPlanTemplate {
  id: string;
  name: string;
  plans: WeeklyPlanDay[];
  createdAt: string;
}

function clonePlansForTemplate(plans: WeeklyPlanDay[]): WeeklyPlanDay[] {
  return plans.map((day) => ({
    dayIndex: day.dayIndex,
    breakfast: { recipeId: day.breakfast.recipeId, completed: false },
    lunch: { recipeId: day.lunch.recipeId, completed: false },
    dinner: { recipeId: day.dinner.recipeId, completed: false },
  }));
}

interface WeeklyPlanTemplatesState {
  templates: WeeklyPlanTemplate[];
  saveTemplate: (name: string, plans: WeeklyPlanDay[]) => string | null;
  applyTemplate: (id: string) => WeeklyPlanDay[] | null;
  removeTemplate: (id: string) => void;
  renameTemplate: (id: string, name: string) => void;
}

export const useWeeklyPlanTemplatesStore = create<WeeklyPlanTemplatesState>()(
  persist(
    (set, get) => ({
      templates: [],

      saveTemplate: (name, plans) => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        const { planned } = countPlanMeals(plans);
        if (planned === 0) return null;

        const id = `tpl_${Date.now()}`;
        const template: WeeklyPlanTemplate = {
          id,
          name: trimmed,
          plans: clonePlansForTemplate(plans),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          templates: [template, ...state.templates].slice(0, 12),
        }));

        return id;
      },

      applyTemplate: (id) => {
        const template = get().templates.find((t) => t.id === id);
        if (!template) return null;
        return clonePlansForTemplate(template.plans);
      },

      removeTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      renameTemplate: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, name: trimmed } : t
          ),
        }));
      },
    }),
    { name: 'weekly-plan-templates' }
  )
);

export function createEmptyPlans(): WeeklyPlanDay[] {
  return Array.from({ length: 7 }, (_, i) => emptyDay(i));
}
