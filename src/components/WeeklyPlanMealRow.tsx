import { Check, X } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { Recipe } from '../types';
import type { MealSlot } from '../store/weeklyPlanStore';
import { RecipeCoverImage } from './RecipeCoverImage';
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
  compact = false,
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
        className="w-full py-4 rounded-2xl border border-dashed border-neutral-300 text-neutral-400 text-xs font-medium flex items-center justify-center gap-1.5 hover:border-primary/50 hover:text-primary transition-colors"
      >
        <span className="text-base leading-none">+</span>
        添加{getMealSlotLabel(mealSlot)}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleComplete}
          aria-label={completed ? '标记未完成' : '标记完成'}
          className={clsx(
            'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
            completed ? 'bg-primary border-primary' : 'border-neutral-300 bg-white'
          )}
        >
          {completed && <Check size={11} weight="bold" className="text-white" />}
        </button>

        {!compact && (
          <button
            type="button"
            onClick={onNavigate}
            className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100"
          >
            <RecipeCoverImage
              recipeId={recipe.id}
              name={recipe.name}
              coverImage={recipe.coverImage}
              category={recipe.category}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          </button>
        )}

        <button type="button" onClick={onNavigate} className="min-w-0 text-left">
          <span className="text-[10px] text-text-secondary block">
            {getMealSlotLabel(mealSlot)} · {recipe.category}
          </span>
          <h4
            className={clsx(
              'text-sm font-medium truncate mt-0.5',
              completed ? 'text-neutral-400 line-through' : 'text-text-primary'
            )}
          >
            {recipe.name}
          </h4>
        </button>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onOpen}
          className="px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
        >
          更换
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="清除"
          className="btn-icon !w-7 !h-7 !shadow-none !bg-transparent"
        >
          <X size={14} weight={UI_ICON_WEIGHT} />
        </button>
      </div>
    </div>
  );
}
