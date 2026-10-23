import { DayBento } from '@/store/bentoStore';
import { isToday, formatWeekRange } from './bentoDate';
import type { Recipe } from '@/types';

export interface GroceryItem {
  key: string;
  name: string;
  amounts: string[];
  dishNames: string[];
  isToday: boolean;
}

export interface GroceryListResult {
  todayItems: GroceryItem[];
  weekItems: GroceryItem[];
  totalCount: number;
}

export function buildGroceryList(
  weekDates: string[],
  bentoByDate: Record<string, DayBento>,
  allRecipes: Recipe[]
): GroceryListResult {
  const recipeMap = new Map(allRecipes.map((r) => [r.id, r]));

  // 区分今天食材与本周食材聚合 Map
  const todayMap = new Map<string, GroceryItem>();
  const weekMap = new Map<string, GroceryItem>();

  for (const date of weekDates) {
    const dayBento = bentoByDate[date];
    if (!dayBento) continue;

    const today = isToday(date);
    const targetMap = today ? todayMap : weekMap;

    const allSlots = [
      ...dayBento.breakfast,
      ...dayBento.lunch,
      ...dayBento.dinner,
    ];

    for (const item of allSlots) {
      const recipe = recipeMap.get(item.recipeId);
      if (!recipe) continue;

      for (const ing of recipe.ingredients) {
        const cleanName = ing.name.trim();
        if (!cleanName) continue;

        const existing = targetMap.get(cleanName);
        if (existing) {
          if (ing.amount && !existing.amounts.includes(ing.amount)) {
            existing.amounts.push(ing.amount);
          }
          if (!existing.dishNames.includes(recipe.name)) {
            existing.dishNames.push(recipe.name);
          }
        } else {
          targetMap.set(cleanName, {
            key: `${today ? 'today' : 'week'}_${cleanName}`,
            name: cleanName,
            amounts: ing.amount ? [ing.amount] : [],
            dishNames: [recipe.name],
            isToday: today,
          });
        }
      }
    }
  }

  const todayItems = Array.from(todayMap.values());
  const weekItems = Array.from(weekMap.values());

  return {
    todayItems,
    weekItems,
    totalCount: todayItems.length + weekItems.length,
  };
}

export function formatGroceryToText(
  mondayStr: string,
  todayItems: GroceryItem[],
  weekItems: GroceryItem[]
): string {
  const range = formatWeekRange(mondayStr);
  const lines: string[] = [`【家庭一周便当 · 采购清单】(${range})`];

  if (todayItems.length > 0) {
    lines.push('\n【今日急需用料】');
    todayItems.forEach((item) => {
      const amountStr = item.amounts.length > 0 ? ` (${item.amounts.join('+')})` : '';
      lines.push(`• ${item.name}${amountStr}  [配菜: ${item.dishNames.join('、')}]`);
    });
  }

  if (weekItems.length > 0) {
    lines.push('\n【本周备货食材】');
    weekItems.forEach((item) => {
      const amountStr = item.amounts.length > 0 ? ` (${item.amounts.join('+')})` : '';
      lines.push(`• ${item.name}${amountStr}  [配菜: ${item.dishNames.join('、')}]`);
    });
  }

  if (todayItems.length === 0 && weekItems.length === 0) {
    lines.push('\n（暂未安排菜品，清单为空）');
  }

  lines.push('\n来自 食刻·便当盒');
  return lines.join('\n');
}
