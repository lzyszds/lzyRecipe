import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, ShareNetwork, ShoppingBag, Sparkle } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { PageMain } from '../components/ui/PageLayout';
import { BottomSheet } from '../components/ui/BottomSheet';
import { WeeklyPlanPickerModal } from '../components/WeeklyPlanPickerModal';
import { WeeklyPlanShareBar } from '../components/WeeklyPlanShareBar';
import { WeeklyPlanScopeToggles } from '../components/WeeklyPlanScopeToggles';
import { WeeklyPlanTemplates } from '../components/WeeklyPlanTemplates';
import { WeeklyPlanMealRow } from '../components/WeeklyPlanMealRow';
import { useAllRecipes } from '../lib/recipes';
import { useFavoritesStore } from '../store/favoritesStore';
import { useWeeklyPlanStore, type MealSlot } from '../store/weeklyPlanStore';
import {
  MEAL_SLOTS,
  WEEK_DAYS,
  aggregatePlanIngredients,
  countPlanMeals,
  filterRecipesForMealSlot,
  formatWeekRange,
  getMealPickerLabel,
  getTodayDayIndex,
} from '../lib/weeklyPlan';
import { UI_ICON_WEIGHT } from '../lib/icons';

interface PickingTarget {
  dayIndex: number;
  mealSlot: MealSlot;
}

function parseMealSlot(value: string | null): MealSlot | null {
  if (value === 'breakfast' || value === 'lunch' || value === 'dinner') return value;
  return null;
}

function getDayNumber(weekKey: string, dayIndex: number): number {
  const monday = new Date(`${weekKey}T00:00:00`);
  if (Number.isNaN(monday.getTime())) return dayIndex + 1;
  const date = new Date(monday);
  date.setDate(monday.getDate() + dayIndex);
  return date.getDate();
}

export function WeeklyPlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dayParam = searchParams.get('day');
  const focusMeal = parseMealSlot(searchParams.get('meal'));
  const allRecipes = useAllRecipes();
  const favorites = useFavoritesStore((s) => s.favorites);

  const {
    weekKey,
    plans,
    ensureCurrentWeek,
    assignRecipe,
    clearMeal,
    toggleCompleted,
    fillFromFavorites,
    smartShuffleFill,
    includeOptionalGroups,
    applyPlans,
    clearPlan,
  } = useWeeklyPlanStore();

  const todayIndex = getTodayDayIndex();
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [picking, setPicking] = useState<PickingTarget | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    ensureCurrentWeek();
  }, [ensureCurrentWeek]);

  useEffect(() => {
    if (dayParam === null) return;
    const focusDay = Number(dayParam);
    if (!Number.isNaN(focusDay) && focusDay >= 0 && focusDay <= 6) {
      setSelectedDay(focusDay);
      setPicking({ dayIndex: focusDay, mealSlot: focusMeal ?? 'dinner' });
    }
  }, [dayParam, focusMeal]);

  const stats = useMemo(() => countPlanMeals(plans), [plans]);
  const shoppingList = useMemo(
    () => aggregatePlanIngredients(plans, allRecipes),
    [plans, allRecipes]
  );

  const favoriteRecipeIds = favorites
    .map((id) => allRecipes.find((r) => r.id === id)?.id)
    .filter(Boolean) as string[];

  const day = plans.find((d) => d.dayIndex === selectedDay) ?? plans[0];

  const pickingRecipes = useMemo(() => {
    if (!picking) return allRecipes;
    return filterRecipesForMealSlot(allRecipes, picking.mealSlot, includeOptionalGroups);
  }, [allRecipes, picking, includeOptionalGroups]);

  const pickingLabel =
    picking !== null
      ? getMealPickerLabel(weekKey, picking.dayIndex, picking.mealSlot)
      : '';

  return (
    <div>
      <header className="page-header">
        <div className="page-container pt-3 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text-primary">本周饮食计划</h1>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {formatWeekRange(weekKey)} · 已完成 {stats.completed}/{stats.total}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShoppingOpen(true)}
                className="px-3 h-8 rounded-full bg-white text-text-primary text-xs font-medium shadow-cozy-sm flex items-center gap-1.5"
              >
                <ShoppingBag size={14} weight={UI_ICON_WEIGHT} className="text-primary" />
                清单 ({shoppingList.length})
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                aria-label="分享周菜单"
                className="btn-icon !w-8 !h-8"
              >
                <ShareNetwork size={15} weight={UI_ICON_WEIGHT} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <PageMain className="space-y-5">
        {/* 周一至周日日期栏 */}
        <div className="grid grid-cols-7 gap-1 bg-white p-1.5 rounded-2xl shadow-card">
          {WEEK_DAYS.map((_, index) => {
            const active = index === selectedDay;
            const isToday = index === todayIndex;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedDay(index)}
                className={clsx(
                  'py-2 rounded-xl flex flex-col items-center transition-colors',
                  active ? 'bg-primary text-white' : 'text-neutral-500 hover:bg-surface'
                )}
              >
                <span className={clsx('text-[10px]', active ? 'opacity-80' : 'opacity-70')}>
                  {isToday ? '今' : WEEK_DAYS[index].slice(2)}
                </span>
                <span className="text-xs font-bold mt-0.5">
                  {getDayNumber(weekKey, index)}
                </span>
              </button>
            );
          })}
        </div>

        {/* 当日三餐 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary">
              {WEEK_DAYS[selectedDay]}
              {selectedDay === todayIndex ? ' · 今天' : ''}
            </h2>
            <span className="text-[11px] text-text-secondary">
              {MEAL_SLOTS.filter((s) => day?.[s.key].recipeId).length}/3 餐已安排
            </span>
          </div>

          {day &&
            MEAL_SLOTS.map((slot) => {
              const entry = day[slot.key];
              const recipe = allRecipes.find((r) => r.id === entry.recipeId);
              return (
                <WeeklyPlanMealRow
                  key={slot.key}
                  mealSlot={slot.key}
                  recipe={recipe}
                  completed={entry.completed}
                  onOpen={() =>
                    setPicking({ dayIndex: day.dayIndex, mealSlot: slot.key })
                  }
                  onNavigate={() => recipe && navigate(`/recipe/${recipe.id}`)}
                  onClear={() => clearMeal(day.dayIndex, slot.key)}
                  onToggleComplete={() => toggleCompleted(day.dayIndex, slot.key)}
                />
              );
            })}
        </div>

        {/* 快捷排菜工具 */}
        <section className="bg-white rounded-2xl p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary">快捷排菜工具</h3>
            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              className="text-xs font-medium text-primary"
            >
              品类开关与模板 →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => smartShuffleFill(allRecipes, 'all')}
              disabled={allRecipes.length === 0}
              className="h-11 rounded-xl bg-sage-50 text-sage-600 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Sparkle size={14} weight="fill" />
              智能随机填满本周
            </button>
            <button
              type="button"
              onClick={() => fillFromFavorites(favoriteRecipeIds)}
              disabled={favoriteRecipeIds.length === 0}
              className="h-11 rounded-xl bg-surface text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Heart size={14} weight="fill" className="text-primary" />
              用「我的收藏」填满
            </button>
          </div>

          {stats.planned > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-text-secondary">
                已安排 {stats.planned}/{stats.total} 餐
              </span>
              <button
                type="button"
                onClick={clearPlan}
                className="text-[11px] font-medium text-red-500"
              >
                清空本周
              </button>
            </div>
          )}
        </section>
      </PageMain>

      <WeeklyPlanPickerModal
        isOpen={picking !== null}
        dayLabel={pickingLabel}
        mealSlot={picking?.mealSlot}
        recipes={pickingRecipes}
        allRecipesCount={allRecipes.length}
        favoriteIds={favorites}
        onClose={() => setPicking(null)}
        onSelect={(recipeId) => {
          if (picking) assignRecipe(picking.dayIndex, picking.mealSlot, recipeId);
          setPicking(null);
        }}
      />

      <BottomSheet
        isOpen={shoppingOpen}
        onClose={() => setShoppingOpen(false)}
        title="本周采购清单"
        description="同名食材已自动合并"
        bodyClassName="space-y-1"
      >
        {shoppingList.length === 0 ? (
          <p className="text-center text-xs text-text-secondary py-8">
            安排三餐后，这里会自动汇总本周食材
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {shoppingList.map((item) => (
              <li key={item.name} className="py-3 flex items-start justify-between gap-4">
                <span className="text-sm font-medium text-text-primary">{item.name}</span>
                <span className="text-xs text-text-secondary text-right">
                  {item.details || '适量'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title="分享周菜单"
        description={formatWeekRange(weekKey)}
        bodyClassName="space-y-4"
      >
        <div className="rounded-2xl bg-surface p-6 text-center space-y-1">
          <p className="text-sm font-bold text-text-primary">本周菜单长图</p>
          <p className="text-xs text-text-secondary">{formatWeekRange(weekKey)}</p>
        </div>
        <WeeklyPlanShareBar
          weekKey={weekKey}
          plans={plans}
          recipes={allRecipes}
          disabled={stats.planned === 0}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        title="排菜偏好与周模板"
        bodyClassName="space-y-5"
      >
        <WeeklyPlanScopeToggles />
        <div className="h-px bg-neutral-100" />
        <WeeklyPlanTemplates plans={plans} onApply={applyPlans} />
      </BottomSheet>
    </div>
  );
}
