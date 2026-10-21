import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CaretRight, Check, Plus } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { useAllRecipes } from '../lib/recipes';
import { useWeeklyPlanStore } from '../store/weeklyPlanStore';
import {
  MEAL_SLOTS,
  WEEK_DAYS,
  getMealSlotLabel,
  getTodayDayIndex,
} from '../lib/weeklyPlan';
import { UI_ICON_WEIGHT } from '../lib/icons';

/** 首页「今日三餐概览」卡片（对应网页稿的三等分网格） */
export function WeeklyPlan() {
  const navigate = useNavigate();
  const allRecipes = useAllRecipes();
  const { plans, ensureCurrentWeek } = useWeeklyPlanStore();

  useEffect(() => {
    ensureCurrentWeek();
  }, [ensureCurrentWeek]);

  const todayIndex = getTodayDayIndex();
  const today = plans.find((day) => day.dayIndex === todayIndex) ?? plans[0];

  return (
    <div className="bg-white rounded-xl p-3.5 card-shadow border border-oat-100">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarCheck size={14} weight={UI_ICON_WEIGHT} className="text-apricot-500 flex-shrink-0" />
          <span className="text-xs font-bold text-cocoa-900 truncate">
            周{WEEK_DAYS[todayIndex].slice(2)} (今天) 三餐概览
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/weekly-plan')}
          className="text-[11px] font-medium text-apricot-500 flex items-center gap-0.5 hover:underline flex-shrink-0"
        >
          <span>管理整周</span>
          <CaretRight size={12} weight={UI_ICON_WEIGHT} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MEAL_SLOTS.map((slot) => {
          const entry = today?.[slot.key];
          const recipe = entry?.recipeId
            ? allRecipes.find((r) => r.id === entry.recipeId)
            : undefined;
          const done = Boolean(entry?.completed && recipe);

          return (
            <button
              key={slot.key}
              type="button"
              onClick={() =>
                navigate(`/weekly-plan?day=${todayIndex}&meal=${slot.key}`)
              }
              className={clsx(
                'rounded-lg p-2 border text-left transition active:scale-[0.98] min-w-0',
                recipe
                  ? 'bg-oat-50 border-oat-100'
                  : 'bg-apricot-50/60 border-dashed border-apricot-200'
              )}
            >
              <span
                className={clsx(
                  'flex items-center justify-between text-[10px]',
                  recipe ? 'text-cocoa-400' : 'text-apricot-600'
                )}
              >
                <span>{getMealSlotLabel(slot.key)}</span>
                {done ? (
                  <Check size={11} weight={UI_ICON_WEIGHT} className="text-apricot-500" />
                ) : recipe ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-apricot-500" />
                ) : (
                  <Plus size={11} weight={UI_ICON_WEIGHT} />
                )}
              </span>
              <span
                className={clsx(
                  'text-xs font-semibold truncate mt-0.5 block',
                  !recipe
                    ? 'text-apricot-500'
                    : done
                      ? 'text-cocoa-400 line-through'
                      : 'text-cocoa-900'
                )}
              >
                {recipe ? recipe.name : '待安排'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
