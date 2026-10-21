import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Heart,
  Image,
  FolderOpen,
  Shuffle,
  Sparkle,
  Trash,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { PageMain } from '../components/ui/PageLayout';
import { BottomSheet } from '../components/ui/BottomSheet';
import { AppHeader } from '../components/AppHeader';
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

function getDayTag(dayIndex: number, todayIndex: number): string {
  const diff = dayIndex - todayIndex;
  if (diff === 0) return '今天';
  if (diff === -1) return '昨天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  return `周${WEEK_DAYS[dayIndex].slice(2)}`;
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
    includeOptionalGroups,
    applyPlans,
    clearPlan,
  } = useWeeklyPlanStore();

  const todayIndex = getTodayDayIndex();
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [view, setView] = useState<'day' | 'grid'>('day');
  const [picking, setPicking] = useState<PickingTarget | null>(null);
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
      setView('day');
      setPicking({ dayIndex: focusDay, mealSlot: focusMeal ?? 'dinner' });
    }
  }, [dayParam, focusMeal]);

  const stats = useMemo(() => countPlanMeals(plans), [plans]);

  const favoriteRecipeIds = favorites
    .map((id) => allRecipes.find((r) => r.id === id)?.id)
    .filter(Boolean) as string[];

  const day = plans.find((d) => d.dayIndex === selectedDay) ?? plans[0];
  const progress = stats.total ? Math.round((stats.planned / stats.total) * 100) : 0;

  const pickingRecipes = useMemo(() => {
    if (!picking) return allRecipes;
    return filterRecipesForMealSlot(allRecipes, picking.mealSlot, includeOptionalGroups);
  }, [allRecipes, picking, includeOptionalGroups]);

  const pickingLabel =
    picking !== null
      ? getMealPickerLabel(weekKey, picking.dayIndex, picking.mealSlot)
      : '';

  /** 随机今日：只补齐所选日期的空档 */
  const randomFillSelectedDay = () => {
    if (!day) return;
    MEAL_SLOTS.forEach((slot) => {
      if (day[slot.key].recipeId) return;
      const pool = filterRecipesForMealSlot(allRecipes, slot.key, includeOptionalGroups);
      if (pool.length === 0) return;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      assignRecipe(selectedDay, slot.key, pick.id);
    });
  };

  const dayMealCount = day
    ? MEAL_SLOTS.filter((slot) => day[slot.key].recipeId).length
    : 0;

  return (
    <div>
      <AppHeader />

      <PageMain className="space-y-3.5">
        {/* 本周排菜状态与操作台 */}
        <section className="bg-white rounded-xl p-4 card-shadow border border-oat-100 space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-cocoa-900">本周饮食计划</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-oat-100 text-cocoa-700 font-medium">
                  {formatWeekRange(weekKey)}
                </span>
              </div>
              <p className="text-[11px] text-cocoa-400 mt-1">
                已规划 <b className="text-apricot-600">{stats.planned}</b> / {stats.total} 餐 · 已完成{' '}
                {stats.completed} 餐
              </p>
            </div>

            <div className="bg-oat-100 p-0.5 rounded-lg flex text-[11px] font-medium shrink-0">
              <button
                type="button"
                onClick={() => setView('day')}
                className={clsx(
                  'px-2.5 py-1 rounded-md transition-all',
                  view === 'day' ? 'bg-white text-cocoa-900 shadow-cozy-sm' : 'text-cocoa-700'
                )}
              >
                按日
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                className={clsx(
                  'px-2.5 py-1 rounded-md transition-all',
                  view === 'grid' ? 'bg-white text-cocoa-900 shadow-cozy-sm' : 'text-cocoa-700'
                )}
              >
                全周表
              </button>
            </div>
          </div>

          <div className="w-full h-1.5 bg-oat-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-apricot-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => fillFromFavorites(favoriteRecipeIds)}
              disabled={favoriteRecipeIds.length === 0}
              className="py-2 px-1 rounded-lg bg-oat-50 border border-oat-100 flex flex-col items-center gap-1 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <Heart size={16} weight={UI_ICON_WEIGHT} className="text-apricot-500" />
              <span className="text-[10px] font-medium text-cocoa-700">收藏填满</span>
            </button>
            <button
              type="button"
              onClick={randomFillSelectedDay}
              disabled={allRecipes.length === 0}
              className="py-2 px-1 rounded-lg bg-oat-50 border border-oat-100 flex flex-col items-center gap-1 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <Shuffle size={16} weight={UI_ICON_WEIGHT} className="text-apricot-500" />
              <span className="text-[10px] font-medium text-cocoa-700">随机今日</span>
            </button>
            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              className="py-2 px-1 rounded-lg bg-oat-50 border border-oat-100 flex flex-col items-center gap-1 active:scale-95 transition"
            >
              <FolderOpen size={16} weight={UI_ICON_WEIGHT} className="text-cocoa-700" />
              <span className="text-[10px] font-medium text-cocoa-700">套用模板</span>
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="py-2 px-1 rounded-lg bg-oat-50 border border-oat-100 flex flex-col items-center gap-1 active:scale-95 transition"
            >
              <Image size={16} weight={UI_ICON_WEIGHT} className="text-cocoa-700" />
              <span className="text-[10px] font-medium text-cocoa-700">导出长图</span>
            </button>
          </div>
        </section>

        {view === 'day' ? (
          <div className="space-y-3 anim-fade">
            {/* 周一至周日选择器 */}
            <div className="grid grid-cols-7 gap-1 bg-white p-1.5 rounded-xl card-shadow border border-oat-100">
              {WEEK_DAYS.map((_, index) => {
                const active = index === selectedDay;
                const dayPlan = plans.find((d) => d.dayIndex === index);
                const filled = dayPlan
                  ? MEAL_SLOTS.filter((slot) => dayPlan[slot.key].recipeId).length
                  : 0;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedDay(index)}
                    className={clsx(
                      'py-2 rounded-lg flex flex-col items-center transition-colors',
                      active ? 'bg-apricot-500 text-white' : 'text-cocoa-700 hover:bg-oat-50'
                    )}
                  >
                    <span
                      className={clsx(
                        'text-[9px]',
                        active ? 'text-white/80' : 'text-cocoa-400'
                      )}
                    >
                      {getDayTag(index, todayIndex)}
                    </span>
                    <span className="text-xs font-bold mt-0.5">
                      {getDayNumber(weekKey, index)}
                    </span>
                    <span
                      className={clsx(
                        'text-[9px] mt-0.5',
                        active ? 'text-white/90' : 'text-apricot-500 font-semibold'
                      )}
                    >
                      {filled}/3
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 所选日期的三餐 */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="text-xs font-bold text-cocoa-900">
                  {WEEK_DAYS[selectedDay]}
                  {selectedDay === todayIndex ? ' · 今天' : ''}
                </h2>
                <span className="text-[11px] text-cocoa-400">{dayMealCount}/3 餐已安排</span>
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
                      onOpen={() => setPicking({ dayIndex: day.dayIndex, mealSlot: slot.key })}
                      onNavigate={() => recipe && navigate(`/recipe/${recipe.id}`)}
                      onClear={() => clearMeal(day.dayIndex, slot.key)}
                      onToggleComplete={() => toggleCompleted(day.dayIndex, slot.key)}
                    />
                  );
                })}

              {stats.planned > 0 && (
                <div className="flex items-center justify-between px-0.5 pt-1">
                  <span className="text-[11px] text-cocoa-400">
                    已完成 {stats.completed} / {stats.planned} 餐
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('确定要清空本周全部安排吗？')) clearPlan();
                    }}
                    className="text-[11px] font-medium text-red-500 flex items-center gap-1"
                  >
                    <Trash size={12} weight={UI_ICON_WEIGHT} />
                    清空本周
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-3 card-shadow border border-oat-100 space-y-2 anim-fade">
            <div className="grid grid-cols-4 text-[10px] font-bold text-cocoa-400 pb-1.5 border-b border-oat-100 text-center">
              <span className="text-left pl-1">日期</span>
              <span>早餐</span>
              <span>午餐</span>
              <span>晚餐</span>
            </div>
            <div className="divide-y divide-oat-100/70 text-[11px]">
              {WEEK_DAYS.map((dayName, index) => {
                const dayPlan = plans.find((d) => d.dayIndex === index);
                const cells = MEAL_SLOTS.map((slot) =>
                  dayPlan?.[slot.key].recipeId
                    ? allRecipes.find((r) => r.id === dayPlan[slot.key].recipeId)?.name ?? '—'
                    : '—'
                );
                return (
                  <button
                    key={dayName}
                    type="button"
                    onClick={() => {
                      setSelectedDay(index);
                      setView('day');
                    }}
                    className={clsx(
                      'w-full grid grid-cols-4 items-center py-2 text-center gap-1.5 rounded-lg px-1 transition-colors hover:bg-oat-50',
                      index === todayIndex && 'bg-apricot-50/50'
                    )}
                  >
                    <span className="font-bold text-left text-cocoa-900 truncate">
                      {dayName.slice(2)}{' '}
                      <span className="text-[9px] font-normal text-cocoa-400">
                        {getDayNumber(weekKey, index)}日
                      </span>
                    </span>
                    {cells.map((name, i) => (
                      <span
                        key={MEAL_SLOTS[i].key}
                        className={clsx(
                          'py-1 px-1 rounded bg-oat-50 truncate',
                          name === '—'
                            ? 'text-cocoa-200'
                            : 'text-cocoa-900 font-medium'
                        )}
                      >
                        {name}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title="导出本周菜单长图"
        description={formatWeekRange(weekKey)}
        bodyClassName="space-y-4"
      >
        <div className="bg-white p-5 rounded-xl border border-oat-200 space-y-1 text-center">
          <Image size={24} weight={UI_ICON_WEIGHT} className="text-apricot-500 mx-auto" />
          <p className="text-sm font-bold text-cocoa-900 pt-1">本周饮食计划长图</p>
          <p className="text-[10px] text-cocoa-400">{formatWeekRange(weekKey)}</p>
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
        title="套用模板与候选品类"
        bodyClassName="space-y-5"
      >
        <WeeklyPlanScopeToggles />
        <div className="h-px bg-oat-100" />
        <WeeklyPlanTemplates plans={plans} onApply={applyPlans} />
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              if (confirm('确定要重新智能随机安排本周空档吗？')) {
                const pool = allRecipes;
                if (pool.length > 0) {
                  MEAL_SLOTS.forEach((slot) => {
                    plans.forEach((d) => {
                      if (d[slot.key].recipeId) return;
                      const candidates = filterRecipesForMealSlot(
                        pool,
                        slot.key,
                        includeOptionalGroups
                      );
                      if (candidates.length === 0) return;
                      assignRecipe(
                        d.dayIndex,
                        slot.key,
                        candidates[Math.floor(Math.random() * candidates.length)].id
                      );
                    });
                  });
                }
                setPrefsOpen(false);
              }
            }}
            className="w-full h-10 rounded-xl bg-apricot-50 border border-apricot-200/70 text-apricot-600 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Sparkle size={14} weight="fill" />
            智能随机填满本周空档
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
