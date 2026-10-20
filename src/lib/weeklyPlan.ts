import type { Recipe } from '../types';
import type { MealPlanEntry, MealSlot, WeeklyPlanDay } from '../store/weeklyPlanStore';

export type WeeklyPlanOptionalGroup = 'dessert' | 'drink' | 'snack';

/** 周菜单可选纳入的分组 */
export const WEEKLY_PLAN_OPTIONAL_GROUPS: {
  key: WeeklyPlanOptionalGroup;
  label: string;
  hint: string;
  categories: string[];
}[] = [
  { key: 'dessert', label: '甜点', hint: '蛋糕、甜品', categories: ['甜点'] },
  { key: 'drink', label: '饮品', hint: '奶茶、饮料', categories: ['饮品'] },
  { key: 'snack', label: '早点', hint: '粥点、面点', categories: ['早餐'] },
];

export const DEFAULT_WEEKLY_PLAN_INCLUDES: Record<WeeklyPlanOptionalGroup, boolean> = {
  dessert: true,
  drink: true,
  snack: true,
};

export const MEAL_SLOTS: {
  key: MealSlot;
  label: string;
  short: string;
  hint: string;
}[] = [
  { key: 'breakfast', label: '早餐', short: '早', hint: '粥点、面点、饮品' },
  { key: 'lunch', label: '午餐', short: '午', hint: '家常小炒、简餐' },
  { key: 'dinner', label: '晚餐', short: '晚', hint: '正餐、硬菜' },
];

/** 各餐次优先匹配的分类（更丰富） */
export const MEAL_SLOT_CATEGORIES: Record<MealSlot, string[]> = {
  breakfast: ['早餐', '主食', '汤', '饮品', '甜点'],
  lunch: [
    '家常菜',
    '川菜',
    '粤菜',
    '湘菜',
    '鲁菜',
    '海鲜',
    '肉类',
    '蔬菜',
    '主食',
    '汤',
    '西餐',
  ],
  dinner: [
    '家常菜',
    '川菜',
    '粤菜',
    '湘菜',
    '鲁菜',
    '海鲜',
    '肉类',
    '蔬菜',
    '主食',
    '汤',
    '西餐',
  ],
};

export const MEAL_SLOT_KEYS = MEAL_SLOTS.map((s) => s.key);

export function getMealSlotLabel(slot: MealSlot): string {
  return MEAL_SLOTS.find((s) => s.key === slot)?.label ?? slot;
}

export function getExcludedWeeklyPlanCategories(
  includeOptionalGroups: Record<WeeklyPlanOptionalGroup, boolean>
): Set<string> {
  const excluded = new Set<string>();
  for (const group of WEEKLY_PLAN_OPTIONAL_GROUPS) {
    if (!includeOptionalGroups[group.key]) {
      group.categories.forEach((c) => excluded.add(c));
    }
  }
  return excluded;
}

export function filterRecipesForWeeklyPlan(
  recipes: Recipe[],
  includeOptionalGroups: Record<WeeklyPlanOptionalGroup, boolean>
): Recipe[] {
  const excluded = getExcludedWeeklyPlanCategories(includeOptionalGroups);
  if (excluded.size === 0) return recipes;
  return recipes.filter((r) => !excluded.has(r.category));
}

/** 按餐次 + 范围过滤菜谱 */
export function filterRecipesForMealSlot(
  recipes: Recipe[],
  mealSlot: MealSlot,
  includeOptionalGroups: Record<WeeklyPlanOptionalGroup, boolean>
): Recipe[] {
  const base = filterRecipesForWeeklyPlan(recipes, includeOptionalGroups);
  const preferred = new Set(MEAL_SLOT_CATEGORIES[mealSlot]);
  const matched = base.filter((r) => preferred.has(r.category));
  return matched.length > 0 ? matched : base;
}

export function suggestMealSlotForRecipe(recipe: Recipe): MealSlot {
  const { category } = recipe;
  if (['早餐', '饮品', '甜点'].includes(category)) return 'breakfast';
  if (['主食', '汤'].includes(category) && recipe.cookTime <= 25) return 'breakfast';
  if (['海鲜', '肉类'].includes(category) && recipe.cookTime >= 45) return 'dinner';
  if (['家常菜', '蔬菜'].includes(category)) return 'lunch';
  return 'dinner';
}

export const WEEK_DAYS = [
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
  '星期日',
] as const;

export function getWeekMonday(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getCurrentWeekKey(date = new Date()): string {
  return getWeekMonday(date).toISOString().slice(0, 10);
}

export function getTodayDayIndex(date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatWeekRange(weekKey: string): string {
  const monday = new Date(`${weekKey}T00:00:00`);
  if (Number.isNaN(monday.getTime())) return '本周';
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${formatShortDate(monday)} – ${formatShortDate(sunday)}`;
}

export function getDayDateLabel(weekKey: string, dayIndex: number): string {
  const monday = new Date(`${weekKey}T00:00:00`);
  if (Number.isNaN(monday.getTime())) return WEEK_DAYS[dayIndex] ?? '';
  const date = new Date(monday);
  date.setDate(monday.getDate() + dayIndex);
  return `${WEEK_DAYS[dayIndex]} · ${formatShortDate(date)}`;
}

export function getMealPickerLabel(
  weekKey: string,
  dayIndex: number,
  mealSlot: MealSlot
): string {
  return `${getDayDateLabel(weekKey, dayIndex)} · ${getMealSlotLabel(mealSlot)}`;
}

export interface PlanMealStats {
  planned: number;
  completed: number;
  total: number;
}

export function countPlanMeals(days: WeeklyPlanDay[]): PlanMealStats {
  let planned = 0;
  let completed = 0;
  const total = days.length * MEAL_SLOTS.length;

  for (const day of days) {
    for (const slot of MEAL_SLOTS) {
      const entry = day[slot.key];
      if (entry.recipeId) {
        planned += 1;
        if (entry.completed) completed += 1;
      }
    }
  }

  return { planned, completed, total };
}

export interface ShoppingItem {
  name: string;
  details: string;
}

export function aggregatePlanIngredients(
  days: WeeklyPlanDay[],
  recipes: Recipe[]
): ShoppingItem[] {
  const map = new Map<string, Set<string>>();

  for (const day of days) {
    for (const slot of MEAL_SLOTS) {
      const recipeId = day[slot.key].recipeId;
      if (!recipeId) continue;
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) continue;

      for (const ing of recipe.ingredients) {
        const name = ing.name.trim();
        if (!name) continue;
        if (!map.has(name)) map.set(name, new Set());
        const amount = ing.amount.trim();
        if (amount) map.get(name)!.add(amount);
      }
    }
  }

  return Array.from(map.entries())
    .map(([name, amounts]) => ({
      name,
      details: Array.from(amounts).join(' · '),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

function shuffleArray<T>(items: T[]): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function pickRandomRecipeId(pool: Recipe[], usedOnDay: Set<string>): string {
  if (pool.length === 0) return '';
  const shuffled = shuffleArray(pool);
  const fresh = shuffled.find((r) => !usedOnDay.has(r.id));
  return (fresh ?? shuffled[0]).id;
}

export type SmartFillTarget = 'all' | 'lunch' | MealSlot;

export function resolveSmartFillSlots(target: SmartFillTarget): MealSlot[] {
  if (target === 'all') return [...MEAL_SLOT_KEYS];
  if (target === 'lunch') return ['lunch'];
  return [target];
}

/** 智能填充：可指定只填午餐（中餐）或单独填早/午/晚 */
export function buildSmartWeeklyFill(
  days: WeeklyPlanDay[],
  recipes: Recipe[],
  includeOptionalGroups: Record<WeeklyPlanOptionalGroup, boolean>,
  target: SmartFillTarget = 'all'
): WeeklyPlanDay[] {
  const targetSlots = resolveSmartFillSlots(target);

  return days.map((day) => {
    const usedOnDay = new Set<string>();
    const nextDay = {
      ...day,
      breakfast: { ...day.breakfast },
      lunch: { ...day.lunch },
      dinner: { ...day.dinner },
    };

    for (const slotKey of targetSlots) {
      const pool = filterRecipesForMealSlot(recipes, slotKey, includeOptionalGroups);
      if (pool.length === 0) continue;
      const recipeId = pickRandomRecipeId(pool, usedOnDay);
      if (!recipeId) continue;
      usedOnDay.add(recipeId);
      nextDay[slotKey] = { recipeId, completed: false };
    }

    return nextDay;
  });
}

/** 用收藏顺序填充空档 */
export function buildSequentialWeeklyFill(
  days: WeeklyPlanDay[],
  recipeIds: string[]
): WeeklyPlanDay[] {
  if (recipeIds.length === 0) return days;

  let cursor = 0;
  const next = days.map((day) => ({
    ...day,
    breakfast: { ...day.breakfast },
    lunch: { ...day.lunch },
    dinner: { ...day.dinner },
  }));

  for (const day of next) {
    for (const slot of MEAL_SLOTS) {
      if (!day[slot.key].recipeId && recipeIds.length > 0) {
        day[slot.key] = {
          recipeId: recipeIds[cursor % recipeIds.length],
          completed: false,
        };
        cursor += 1;
      }
    }
  }

  return next;
}

export function getDayMeals(day: WeeklyPlanDay): { slot: MealSlot; entry: MealPlanEntry }[] {
  return MEAL_SLOTS.map((s) => ({ slot: s.key, entry: day[s.key] }));
}

export function hasPlannedMeals(plans: WeeklyPlanDay[]): boolean {
  return plans.some((day) => MEAL_SLOTS.some((s) => day[s.key].recipeId));
}
