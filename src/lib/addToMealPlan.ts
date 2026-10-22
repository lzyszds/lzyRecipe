import type { Recipe } from '../types';

/** 「加入本周计划」弹窗的打开入口，由 AddToMealPlanProvider 注册，列表卡片调用 */
let opener: ((recipe: Recipe) => void) | null = null;

export function setAddToMealPlanOpener(fn: ((recipe: Recipe) => void) | null) {
  opener = fn;
}

export function openAddToMealPlan(recipe: Recipe) {
  opener?.(recipe);
}
