import { useEffect, useState } from 'react';
import { Check } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { BottomSheet } from './ui/BottomSheet';
import { CoverThumb } from './CoverThumb';
import type { Recipe } from '../types';
import { MEAL_SLOTS, getDayDateLabel, getMealSlotLabel, getTodayDayIndex } from '../lib/weeklyPlan';
import { getDayNumber, getDayTag } from '../lib/weeklyPlanDate';
import {
  getSuggestedSlotForRecipeId,
  useWeeklyPlanStore,
  type MealSlot,
} from '../store/weeklyPlanStore';
import { useAllRecipes } from '../lib/recipes';
import { UI_ICON_WEIGHT } from '../lib/icons';
import { setAddToMealPlanOpener } from '../lib/addToMealPlan';

/** 全应用共用一个「加入本周计划」弹窗，卡片按钮通过 openAddToMealPlan 打开 */
export function AddToMealPlanProvider() {
  const allRecipes = useAllRecipes();
  const { weekKey, plans, ensureCurrentWeek, assignRecipe } = useWeeklyPlanStore();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [dayIndex, setDayIndex] = useState(() => getTodayDayIndex());
  const [mealSlot, setMealSlot] = useState<MealSlot>('dinner');
  const [toast, setToast] = useState('');

  const todayIndex = getTodayDayIndex();

  useEffect(() => {
    ensureCurrentWeek();
  }, [ensureCurrentWeek]);

  useEffect(() => {
    setAddToMealPlanOpener((next) => {
      // 每次打开都回到「今天 + 推荐餐次」，方便连续给多道菜排菜
      setRecipe(next);
      setDayIndex(getTodayDayIndex());
      setMealSlot(getSuggestedSlotForRecipeId(next.id, allRecipes));
    });
    return () => setAddToMealPlanOpener(null);
  }, [allRecipes]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const close = () => setRecipe(null);

  const dayOf = (index: number) => plans.find((day) => day.dayIndex === index);
  const entry = recipe ? dayOf(dayIndex)?.[mealSlot] : undefined;
  const currentRecipe = allRecipes.find((r) => r.id === entry?.recipeId);

  const handleConfirm = () => {
    if (!recipe) return;
    assignRecipe(dayIndex, mealSlot, recipe.id);
    setToast(
      `${recipe.name} 已安排到${getDayDateLabel(weekKey, dayIndex).split(' · ')[0]}${getMealSlotLabel(mealSlot)}`
    );
    close();
  };

  return (
    <>
      <BottomSheet
        isOpen={Boolean(recipe)}
        onClose={close}
        title="加入本周计划"
        description={recipe ? `${recipe.category} · ${recipe.cookTime} 分钟` : undefined}
        bodyClassName="space-y-4"
      >
        {recipe && (
          <>
            <div className="flex items-center gap-3 rounded-xl bg-white border border-oat-100 px-3 py-2.5">
              <CoverThumb
                recipeId={recipe.id}
                name={recipe.name}
                coverImage={recipe.coverImage}
                category={recipe.category}
                className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-oat-100 text-base leading-none"
              />
              <p className="text-sm font-bold text-cocoa-900 truncate">{recipe.name}</p>
            </div>

            {/* 日期：与周历页一致的单行日期条 */}
            <div className="grid grid-cols-7 gap-1 rounded-xl bg-white p-1 border border-oat-100">
              {plans.map((day) => {
                const active = day.dayIndex === dayIndex;
                const filled = MEAL_SLOTS.filter((slot) => day[slot.key].recipeId).length;
                return (
                  <button
                    key={day.dayIndex}
                    type="button"
                    onClick={() => setDayIndex(day.dayIndex)}
                    aria-pressed={active}
                    aria-label={getDayDateLabel(weekKey, day.dayIndex)}
                    className={clsx(
                      'py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-colors',
                      active ? 'bg-apricot-500 text-white' : 'text-cocoa-700 hover:bg-oat-50'
                    )}
                  >
                    <span className={clsx('text-[10px] leading-none', active ? 'text-white/85' : 'text-cocoa-400')}>
                      {getDayTag(day.dayIndex, todayIndex)}
                    </span>
                    <span className="text-sm font-bold leading-none mt-0.5">
                      {getDayNumber(weekKey, day.dayIndex)}
                    </span>
                    <span
                      className={clsx(
                        'text-[9px] leading-none',
                        active ? 'text-white/90' : filled > 0 ? 'text-apricot-500' : 'text-cocoa-400'
                      )}
                    >
                      {filled}/3
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 餐次：分段按钮，下方直接显示当前餐次的安排 */}
            <div>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white border border-oat-100">
                {MEAL_SLOTS.map((slot) => {
                  const active = slot.key === mealSlot;
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => setMealSlot(slot.key)}
                      aria-pressed={active}
                      className={clsx(
                        'h-9 rounded-lg text-xs font-semibold transition-colors',
                        active ? 'bg-apricot-500 text-white shadow-cozy-primary' : 'text-cocoa-700 hover:bg-oat-50'
                      )}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 px-1 text-[11px] text-cocoa-400 truncate">
                {getDayDateLabel(weekKey, dayIndex)} · {getMealSlotLabel(mealSlot)}：
                {currentRecipe ? (
                  <span className="text-cocoa-700">{currentRecipe.name}</span>
                ) : (
                  '暂未安排'
                )}
              </p>
            </div>

            <button type="button" onClick={handleConfirm} className="btn btn-primary w-full">
              <Check size={15} weight={UI_ICON_WEIGHT} />
              {currentRecipe ? '替换此餐' : '加入计划'}
            </button>
          </>
        )}
      </BottomSheet>

      {toast && (
        <div className="fixed left-1/2 bottom-24 z-[120] -translate-x-1/2 rounded-full bg-white px-4 py-2 shadow-float text-xs font-medium text-cocoa-900 whitespace-nowrap">
          {toast}
        </div>
      )}
    </>
  );
}
