import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAllRecipes } from '../lib/recipes';
import { useWeeklyPlanStore } from '../store/weeklyPlanStore';
import { Button } from './ui/Button';
import {
  MEAL_SLOTS,
  countPlanMeals,
  getMealSlotLabel,
  getTodayDayIndex,
  WEEK_DAYS,
} from '../lib/weeklyPlan';

export function WeeklyPlan() {
  const navigate = useNavigate();
  const allRecipes = useAllRecipes();
  const { plans, ensureCurrentWeek } = useWeeklyPlanStore();

  useEffect(() => {
    ensureCurrentWeek();
  }, [ensureCurrentWeek]);

  const todayIndex = getTodayDayIndex();
  const stats = countPlanMeals(plans);
  const isEmpty = stats.planned === 0;
  const today = plans.find((day) => day.dayIndex === todayIndex) ?? plans[0];
  const progress = stats.total ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate('/weekly-plan')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate('/weekly-plan');
      }}
      className="bg-white rounded-3xl p-5 shadow-card cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <span className="text-[11px] font-medium text-primary">
            本周饮食计划 · 周{WEEK_DAYS[todayIndex].slice(2)}
          </span>
          <h2 className="text-base font-bold text-text-primary mt-0.5">今日三餐安排</h2>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-xs font-semibold text-text-primary">
            {stats.completed} / {stats.total} 餐
          </span>
          <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-1.5 ml-auto">
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {today ? (
        <div className="grid grid-cols-3 gap-2.5">
          {MEAL_SLOTS.map((slot) => {
            const entry = today[slot.key];
            const recipe = allRecipes.find((r) => r.id === entry.recipeId);
            const done = entry.completed && Boolean(recipe);
            return (
              <div
                key={slot.key}
                className={clsx(
                  'rounded-2xl p-3 min-w-0',
                  done ? 'bg-surface' : recipe ? 'bg-sage-50' : 'bg-surface'
                )}
              >
                <span
                  className={clsx(
                    'text-[10px] block',
                    done
                      ? 'text-neutral-400'
                      : recipe
                        ? 'text-sage-600 font-medium'
                        : 'text-neutral-400'
                  )}
                >
                  {getMealSlotLabel(slot.key)} ·{' '}
                  {done ? '已完成' : recipe ? '待制作' : '未安排'}
                </span>
                <span
                  className={clsx(
                    'text-xs mt-1 block truncate',
                    done
                      ? 'text-neutral-400 line-through'
                      : recipe
                        ? 'text-sage-600 font-bold'
                        : 'text-neutral-400'
                  )}
                >
                  {recipe ? recipe.name : '—'}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {isEmpty && (
        <div className="mt-4">
          <Button
            variant="primary"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/weekly-plan');
            }}
          >
            规划本周三餐
          </Button>
        </div>
      )}
    </div>
  );
}
