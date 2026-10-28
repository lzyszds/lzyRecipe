import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '@/lib/safeStorage';
import { getTodayString, getWeekDates, getMondayOf } from '@/lib/bentoDate';
import type { Recipe } from '@/types';
import { useRecentCookedStore } from './recentCookedStore';
import { logActivity } from './activityLogStore';
import { triggerAutoSync } from '@/lib/syncTrigger';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealSlotItem {
  recipeId: string;
  eatenAt: string | null; // ISO 时间戳，null 表示未吃
}

export interface DayBento {
  date: string; // YYYY-MM-DD
  breakfast: MealSlotItem[];
  lunch: MealSlotItem[];
  dinner: MealSlotItem[];
}

export const createEmptyDayBento = (date: string): DayBento => ({
  date,
  breakfast: [],
  lunch: [],
  dinner: [],
});

interface BentoState {
  // 1. 想吃候选池（RecipePool，从收藏/搜索/推荐随手加入）
  recipePool: string[];

  // 2. 每天的便当盒，以真实日期 YYYY-MM-DD 为 Key
  bentoByDate: Record<string, DayBento>;

  // 3. 采购清单打勾状态，Key 为材料名或组合 Key
  purchasedIngredients: Record<string, boolean>;

  // 候选池操作
  addToPool: (recipeId: string) => void;
  removeFromPool: (recipeId: string) => void;
  togglePool: (recipeId: string) => boolean;
  clearPool: () => void;

  // 便当餐位操作
  getDayBento: (date: string) => DayBento;
  addDishesToMeal: (date: string, mealType: MealType, recipeIds: string[]) => void;
  removeDishFromMeal: (date: string, mealType: MealType, recipeId: string) => void;
  clearMeal: (date: string, mealType: MealType) => void;
  clearDay: (date: string) => void;
  clearWeek: (mondayStr: string) => void;

  // “已吃掉” 打卡动效与状态
  toggleEaten: (date: string, mealType: MealType, recipeId: string) => void;

  // 上班族快捷：一键“午餐带饭”（选中一道菜排入周一至周五全部午餐）
  applyLunchBentoToWorkdays: (mondayStr: string, recipeId: string) => void;

  // 批量填充指定日期与餐位的菜品
  batchFillSlots: (
    slots: Record<string, { breakfast?: string[]; lunch?: string[]; dinner?: string[] }>
  ) => number;

  // 智能填充空餐位（保留空白与已有菜，绝不覆盖已有手排）
  smartFillEmptySlots: (mondayStr: string, allRecipes: Recipe[]) => number;

  // 采购单打勾与清空
  togglePurchased: (ingKey: string) => void;
  clearPurchased: () => void;

  // 数据同步或导入外部 bento
  mergeBentoData: (incoming: {
    recipePool?: string[];
    bentoByDate?: Record<string, DayBento>;
  }) => void;
}

export const useBentoStore = create<BentoState>()(
  persist(
    (set, get) => ({
      recipePool: [],
      bentoByDate: {},
      purchasedIngredients: {},

      addToPool: (recipeId) =>
        set((state) => {
          if (state.recipePool.includes(recipeId)) return state;
          return { recipePool: [recipeId, ...state.recipePool] };
        }),

      removeFromPool: (recipeId) => {
        set((state) => ({
          recipePool: state.recipePool.filter((id) => id !== recipeId),
        }));
        triggerAutoSync(800);
      },

      togglePool: (recipeId) => {
        const current = get().recipePool;
        const exists = current.includes(recipeId);
        if (exists) {
          set({ recipePool: current.filter((id) => id !== recipeId) });
          triggerAutoSync(800);
          return false;
        } else {
          set({ recipePool: [recipeId, ...current] });
          triggerAutoSync(800);
          return true;
        }
      },

      clearPool: () => {
        set({ recipePool: [] });
        triggerAutoSync(800);
      },

      getDayBento: (date) => {
        const state = get();
        return state.bentoByDate[date] || createEmptyDayBento(date);
      },

      addDishesToMeal: (date, mealType, recipeIds) => {
        const state = get();
        const currentDay = state.bentoByDate[date] || createEmptyDayBento(date);
        const currentSlot = currentDay[mealType] || [];
        const existingIds = new Set(currentSlot.map((item) => item.recipeId));

        const newItems: MealSlotItem[] = [];
        for (const id of recipeIds) {
          if (!existingIds.has(id)) {
            newItems.push({ recipeId: id, eatenAt: null });
          }
        }

        if (newItems.length === 0) return;

        set({
          bentoByDate: {
            ...state.bentoByDate,
            [date]: {
              ...currentDay,
              [mealType]: [...currentSlot, ...newItems],
            },
          },
        });

        logActivity({
          type: 'bento',
          action: '便当加入菜品',
          detail: `${date} ${MEAL_LABELS[mealType]} · ${newItems.length} 道`,
          meta: { 日期: date, 餐位: MEAL_LABELS[mealType] },
        });
        triggerAutoSync(1000);
      },

      removeDishFromMeal: (date, mealType, recipeId) => {
        const state = get();
        const currentDay = state.bentoByDate[date];
        if (!currentDay) return;

        set({
          bentoByDate: {
            ...state.bentoByDate,
            [date]: {
              ...currentDay,
              [mealType]: currentDay[mealType].filter((item) => item.recipeId !== recipeId),
            },
          },
        });

        logActivity({
          type: 'bento',
          action: '便当移除菜品',
          detail: `${date} ${MEAL_LABELS[mealType]} · 菜谱 ${recipeId}`,
          meta: { 日期: date, 餐位: MEAL_LABELS[mealType] },
        });
        triggerAutoSync(1000);
      },

      clearMeal: (date, mealType) => {
        set((state) => {
          const currentDay = state.bentoByDate[date];
          if (!currentDay) return state;
          return {
            bentoByDate: {
              ...state.bentoByDate,
              [date]: {
                ...currentDay,
                [mealType]: [],
              },
            },
          };
        });
        triggerAutoSync(1000);
      },

      clearDay: (date) => {
        set((state) => {
          const currentDay = state.bentoByDate[date];
          if (!currentDay) return state;
          return {
            bentoByDate: {
              ...state.bentoByDate,
              [date]: createEmptyDayBento(date),
            },
          };
        });
        triggerAutoSync(1000);
      },

      clearWeek: (mondayStr) => {
        set((state) => {
          const weekDates = getWeekDates(mondayStr);
          const nextBento = { ...state.bentoByDate };
          for (const d of weekDates) {
            nextBento[d] = createEmptyDayBento(d);
          }
          return { bentoByDate: nextBento };
        });
        triggerAutoSync(1000);
      },

      batchFillSlots: (slots) => {
        let addedCount = 0;
        set((state) => {
          const nextBento = { ...state.bentoByDate };
          for (const [date, meals] of Object.entries(slots)) {
            const currentDay = nextBento[date] || createEmptyDayBento(date);
            const nextBreakfast = [...currentDay.breakfast];
            const nextLunch = [...currentDay.lunch];
            const nextDinner = [...currentDay.dinner];

            const appendUnique = (targetList: MealSlotItem[], ids?: string[]) => {
              if (!ids) return;
              const existingIds = new Set(targetList.map((i) => i.recipeId));
              for (const id of ids) {
                if (!existingIds.has(id)) {
                  targetList.push({ recipeId: id, eatenAt: null });
                  existingIds.add(id);
                  addedCount++;
                }
              }
            };

            appendUnique(nextBreakfast, meals.breakfast);
            appendUnique(nextLunch, meals.lunch);
            appendUnique(nextDinner, meals.dinner);

            nextBento[date] = {
              ...currentDay,
              breakfast: nextBreakfast,
              lunch: nextLunch,
              dinner: nextDinner,
            };
          }
          return { bentoByDate: nextBento };
        });
        logActivity({
          type: 'bento',
          action: 'AI 智能配餐',
          detail: `填入 ${addedCount} 道菜`,
        });
        triggerAutoSync(1000);
        return addedCount;
      },

      toggleEaten: (date, mealType, recipeId) => {
        const currentDay = get().bentoByDate[date];
        if (!currentDay) return;

        const wasEaten = currentDay[mealType].some(
          (item) => item.recipeId === recipeId && item.eatenAt
        );

        const updated = currentDay[mealType].map((item) => {
          if (item.recipeId !== recipeId) return item;
          return {
            ...item,
            eatenAt: item.eatenAt ? null : new Date().toISOString(),
          };
        });

        set({
          bentoByDate: {
            ...get().bentoByDate,
            [date]: {
              ...currentDay,
              [mealType]: updated,
            },
          },
        });

        // 打卡「已吃掉」（视为完成）→ 记入首页「最近点过」；取消打卡 → 同步移除
        if (wasEaten) {
          useRecentCookedStore.getState().removeCooked(recipeId);
        } else {
          useRecentCookedStore.getState().recordCooked(recipeId);
        }

        logActivity({
          type: 'bento',
          action: wasEaten ? '便当取消打卡' : '便当打卡·已吃掉',
          detail: `${date} ${MEAL_LABELS[mealType]} · 菜谱 ${recipeId}`,
          meta: { 日期: date, 餐位: MEAL_LABELS[mealType] },
        });
        triggerAutoSync(1000);
      },

      applyLunchBentoToWorkdays: (mondayStr, recipeId) => {
        set((state) => {
          const weekDates = getWeekDates(mondayStr);
          // 周一到周五: index 0 ~ 4
          const workdays = weekDates.slice(0, 5);
          const nextBento = { ...state.bentoByDate };

          for (const d of workdays) {
            const dayBento = nextBento[d] || createEmptyDayBento(d);
            const exists = dayBento.lunch.some((item) => item.recipeId === recipeId);
            if (!exists) {
              nextBento[d] = {
                ...dayBento,
                lunch: [...dayBento.lunch, { recipeId, eatenAt: null }],
              };
            }
          }

          return { bentoByDate: nextBento };
        });
        triggerAutoSync(1000);
      },

      smartFillEmptySlots: (mondayStr, allRecipes) => {
        if (!allRecipes.length) return 0;
        let filledCount = 0;

        const weekDates = getWeekDates(mondayStr);
        const breakfastCandidates = allRecipes.filter((r) =>
          ['早餐', '主食', '点心', '汤'].includes(r.category)
        );
        const mealCandidates = allRecipes.filter(
          (r) => !['饮品', '甜点'].includes(r.category)
        );

        const getRandom = (arr: Recipe[]) => arr[Math.floor(Math.random() * arr.length)];

        set((state) => {
          const nextBento = { ...state.bentoByDate };

          for (const d of weekDates) {
            const dayBento = nextBento[d] || createEmptyDayBento(d);
            let dayChanged = false;

            // 1. 早餐如果为空，填 1 道
            let nextBreakfast = [...dayBento.breakfast];
            if (nextBreakfast.length === 0) {
              const pick = getRandom(breakfastCandidates.length ? breakfastCandidates : allRecipes);
              if (pick) {
                nextBreakfast.push({ recipeId: pick.id, eatenAt: null });
                filledCount++;
                dayChanged = true;
              }
            }

            // 2. 午餐如果为空，填 2 道
            let nextLunch = [...dayBento.lunch];
            if (nextLunch.length === 0) {
              const pick1 = getRandom(mealCandidates);
              let pick2 = getRandom(mealCandidates);
              if (pick1 && pick2 && pick1.id === pick2.id) {
                pick2 = getRandom(mealCandidates);
              }
              if (pick1) nextLunch.push({ recipeId: pick1.id, eatenAt: null });
              if (pick2 && pick2.id !== pick1?.id) nextLunch.push({ recipeId: pick2.id, eatenAt: null });
              filledCount += nextLunch.length;
              dayChanged = true;
            }

            // 3. 晚餐如果为空，填 2 道
            let nextDinner = [...dayBento.dinner];
            if (nextDinner.length === 0) {
              const pick1 = getRandom(mealCandidates);
              let pick2 = getRandom(mealCandidates);
              if (pick1 && pick2 && pick1.id === pick2.id) {
                pick2 = getRandom(mealCandidates);
              }
              if (pick1) nextDinner.push({ recipeId: pick1.id, eatenAt: null });
              if (pick2 && pick2.id !== pick1?.id) nextDinner.push({ recipeId: pick2.id, eatenAt: null });
              filledCount += nextDinner.length;
              dayChanged = true;
            }

            if (dayChanged) {
              nextBento[d] = {
                ...dayBento,
                breakfast: nextBreakfast,
                lunch: nextLunch,
                dinner: nextDinner,
              };
            }
          }

          return { bentoByDate: nextBento };
        });

        if (filledCount > 0) triggerAutoSync(1000);
        return filledCount;
      },

      togglePurchased: (ingKey) => {
        set((state) => ({
          purchasedIngredients: {
            ...state.purchasedIngredients,
            [ingKey]: !state.purchasedIngredients[ingKey],
          },
        }));
        triggerAutoSync(1500);
      },

      clearPurchased: () => {
        set({ purchasedIngredients: {} });
        triggerAutoSync(1500);
      },

      mergeBentoData: (incoming) =>
        set((state) => {
          const nextPool = Array.from(
            new Set([...(incoming.recipePool || []), ...state.recipePool])
          );
          const nextBento = { ...state.bentoByDate, ...(incoming.bentoByDate || {}) };
          return { recipePool: nextPool, bentoByDate: nextBento };
        }),
    }),
    {
      name: 'lzy-recipe-bento-storage-v1',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        recipePool: state.recipePool,
        bentoByDate: state.bentoByDate,
        purchasedIngredients: state.purchasedIngredients,
      }),
    }
  )
);
