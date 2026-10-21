import { Check, X } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { Recipe } from '../types';
import type { MealSlot } from '../store/weeklyPlanStore';
import { UI_ICON_WEIGHT } from '../lib/icons';
import { getMealSlotLabel } from '../lib/weeklyPlan';

interface WeeklyPlanMealRowProps {
  mealSlot: MealSlot;
  recipe?: Recipe;
  completed: boolean;
  compact?: boolean;
  onOpen: () => void;
  onNavigate: () => void;
  onClear: () => void;
  onToggleComplete: () => void;
}

export function WeeklyPlanMealRow({
  mealSlot,
  recipe,
  completed,
  onOpen,
  onNavigate,
  onClear,
  onToggleComplete,
}: WeeklyPlanMealRowProps) {
  if (!recipe) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full bg-white/70 border border-dashed border-oat-200 rounded-xl p-3.5 flex items-center justify-between gap-2 text-left hover:border-apricot-400 transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="px-2 py-0.5 rounded bg-oat-100 text-cocoa-700 text-[10px] font-semibold shrink-0">
            {getMealSlotLabel(mealSlot)}
          </span>
          <span className="text-xs text-cocoa-400 truncate">暂未安排，点击去菜谱库挑选</span>
        </span>
        <span className="text-xs font-semibold text-apricot-500 shrink-0">+ 选菜</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl p-3.5 card-shadow border border-oat-100 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleComplete}
          aria-label={completed ? '标记未完成' : '标记完成'}
          className={clsx(
            'w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors',
            completed
              ? 'bg-apricot-500 border-apricot-500 text-white'
              : 'border-cocoa-200 bg-oat-50'
          )}
        >
          {completed && <Check size={11} weight="bold" />}
        </button>

        <button type="button" onClick={onNavigate} className="min-w-0 text-left">
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-apricot-600">
              {getMealSlotLabel(mealSlot)}
            </span>
            {completed && <span className="text-[9px] text-cocoa-400">· 已完成</span>}
          </span>
          <h4
            className={clsx(
              'text-xs font-bold truncate mt-0.5',
              completed ? 'line-through text-cocoa-400' : 'text-cocoa-900'
            )}
          >
            {recipe.name}
          </h4>
        </button>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onOpen}
          className="px-2 py-1 rounded-md bg-oat-50 text-cocoa-700 text-[10px] font-medium"
        >
          更换
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="清除"
          className="w-6 h-6 rounded-md bg-oat-50 text-cocoa-400 hover:text-red-500 flex items-center justify-center transition-colors"
        >
          <X size={12} weight={UI_ICON_WEIGHT} />
        </button>
      </div>
    </div>
  );
}
