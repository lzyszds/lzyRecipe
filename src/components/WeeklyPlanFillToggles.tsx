import { useState } from 'react';
import { clsx } from 'clsx';
import type { Recipe } from '../types';
import { useWeeklyPlanStore, type SmartFillTarget } from '../store/weeklyPlanStore';

const FILL_OPTIONS: { target: SmartFillTarget; label: string; hint: string }[] = [
  { target: 'all', label: '三餐全填', hint: '早午晚' },
  { target: 'lunch', label: '仅午餐', hint: '中餐' },
  { target: 'breakfast', label: '仅早餐', hint: '粥点' },
  { target: 'dinner', label: '仅晚餐', hint: '硬菜' },
];

interface WeeklyPlanFillTogglesProps {
  recipes: Recipe[];
  className?: string;
}

export function WeeklyPlanFillToggles({ recipes, className }: WeeklyPlanFillTogglesProps) {
  const smartShuffleFill = useWeeklyPlanStore((s) => s.smartShuffleFill);
  const [activeTarget, setActiveTarget] = useState<SmartFillTarget>('all');
  const disabled = recipes.length === 0;

  const handleFill = (target: SmartFillTarget) => {
    if (disabled) return;
    setActiveTarget(target);
    smartShuffleFill(recipes, target);
  };

  return (
    <div className={clsx('space-y-2', className)}>
      <div>
        <p className="text-sm font-bold text-text-primary">智能填充</p>
        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
          点击选择填充范围，按餐次品类随机安排；可只填午餐（中餐）或单独填早/晚
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILL_OPTIONS.map((opt) => {
          const active = activeTarget === opt.target;
          return (
            <button
              key={opt.target}
              type="button"
              disabled={disabled}
              onClick={() => handleFill(opt.target)}
              className={clsx(
                'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium',
                'transition-colors duration-150 active:scale-[0.98]',
                'disabled:opacity-50 disabled:pointer-events-none',
                active
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-neutral-100'
              )}
              aria-pressed={active}
            >
              <span>{opt.label}</span>
              <span className={clsx('opacity-70', active && 'opacity-90')}>
                · {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
