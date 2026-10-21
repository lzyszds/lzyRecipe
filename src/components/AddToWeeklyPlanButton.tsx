import { useEffect, useState } from 'react';
import { CalendarPlus, Check } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { IconButton } from './ui/IconButton';
import { BottomSheet } from './ui/BottomSheet';
import { useAllRecipes } from '../lib/recipes';
import {
  getSuggestedSlotForRecipeId,
  useWeeklyPlanStore,
  type MealSlot,
} from '../store/weeklyPlanStore';
import { MEAL_SLOTS, getDayDateLabel, getMealSlotLabel, getTodayDayIndex } from '../lib/weeklyPlan';
import { UI_ICON_WEIGHT } from '../lib/icons';

interface AddToWeeklyPlanButtonProps {
  recipeId: string;
  recipeName: string;
}

export function AddToWeeklyPlanButton({ recipeId, recipeName }: AddToWeeklyPlanButtonProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');

  const allRecipes = useAllRecipes();
  const { weekKey, plans, ensureCurrentWeek, assignRecipe, addToFirstEmptySlot } =
    useWeeklyPlanStore();

  useEffect(() => {
    ensureCurrentWeek();
  }, [ensureCurrentWeek]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const todayIndex = getTodayDayIndex();
  const suggestedSlot = getSuggestedSlotForRecipeId(recipeId, allRecipes);

  const showToast = (message: string) => {
    setToast(message);
    setOpen(false);
  };

  const handleQuickAdd = () => {
    const result = addToFirstEmptySlot(recipeId, suggestedSlot);
    if (result === null) {
      setOpen(true);
      return;
    }
    showToast(
      `已加入${getDayDateLabel(weekKey, result.dayIndex).split(' · ')[0]}${getMealSlotLabel(result.mealSlot)}`
    );
  };

  const handlePickSlot = (dayIndex: number, mealSlot: MealSlot) => {
    assignRecipe(dayIndex, mealSlot, recipeId);
    showToast(`已安排到${getMealSlotLabel(mealSlot)}`);
  };

  const isAssigned = (dayIndex: number, mealSlot: MealSlot) =>
    plans.find((d) => d.dayIndex === dayIndex)?.[mealSlot].recipeId === recipeId;

  return (
    <>
      <IconButton
        icon={<CalendarPlus size={18} weight={UI_ICON_WEIGHT} />}
        label="加入本周计划"
        onClick={handleQuickAdd}
        className="!bg-white/90 backdrop-blur-md !text-cocoa-900 !border-transparent !shadow-none"
      />

      {toast && (
        <div className="fixed left-1/2 bottom-24 z-[120] -translate-x-1/2 rounded-full bg-white px-4 py-2 shadow-float text-xs font-medium text-text-primary whitespace-nowrap">
          {toast}
        </div>
      )}

      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title="选择餐次"
        description={`${recipeName} · 推荐${getMealSlotLabel(suggestedSlot)}`}
      >
        <div className="space-y-4">
          {plans.map((day) => (
            <div key={day.dayIndex}>
              <p className="text-[11px] font-medium text-text-secondary mb-1.5">
                {getDayDateLabel(weekKey, day.dayIndex)}
              </p>
              <div className="space-y-1.5">
                {MEAL_SLOTS.map((slot) => {
                  const current = allRecipes.find(
                    (r) => r.id === day[slot.key].recipeId
                  );
                  const selected = isAssigned(day.dayIndex, slot.key);
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => handlePickSlot(day.dayIndex, slot.key)}
                      className={clsx(
                        'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        day.dayIndex === todayIndex ? 'bg-sage-50' : 'bg-surface',
                        selected && 'ring-1 ring-primary/30'
                      )}
                    >
                      <span className="text-[11px] font-bold text-text-primary w-7 flex-shrink-0">
                        {slot.short}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary">
                          {getMealSlotLabel(slot.key)}
                        </p>
                        <p className="text-[11px] text-text-secondary truncate mt-0.5">
                          {current ? `当前：${current.name}` : '空档'}
                        </p>
                      </div>
                      {selected && (
                        <Check size={16} weight="bold" className="text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
