import { Recipe } from '@/types';

/** 稳定伪随机数（0~1）：同一 (seed, id) 恒定，跨天/跨菜变化 */
export function stableHash(seed: number, id: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

/** 当日种子：精选池按天轮换，同一天内保持稳定 */
export function daySeedNow(): number {
  return Math.floor(Date.now() / 86400000);
}

/**
 * 精选算法打分：
 * 内容完整度（步骤/用料/封面/诀窍）+ 收藏加成 + 最近吃过降权（推新）+ 每日轮换扰动
 */
export function scoreRecipe(
  recipe: Recipe,
  favoriteIds: Set<string>,
  cookedIds: Set<string>,
  daySeed: number
): number {
  let score = 0;
  score += Math.min((recipe.steps?.length || 0) / 6, 2); // 步骤完整度 0~2
  score += (recipe.ingredients?.length || 0) >= 4 ? 1 : 0; // 用料丰富
  score += recipe.coverImage ? 1 : 0; // 有封面
  score += recipe.tips ? 0.5 : 0; // 有诀窍
  if (favoriteIds.has(recipe.id)) score += 2; // 收藏加成
  if (cookedIds.has(recipe.id)) score -= 2.5; // 最近做过的降权，把位置让给新菜
  score += stableHash(daySeed, recipe.id) * 3; // 每日轮换扰动 0~3
  return score;
}

/**
 * 精选算法：全库按综合分排序（当天稳定、每天轮换、收藏加权、吃过降权）。
 * 首页信息流与开屏封面预加载共用，保证预热的就是首页即将展示的图。
 */
export function pickHeroSlides(
  allRecipes: Recipe[],
  favorites: string[],
  recent: { recipeId: string }[]
): Recipe[] {
  const daySeed = daySeedNow();
  const favoriteIds = new Set(favorites);
  const cookedIds = new Set(recent.map((c) => c.recipeId));
  return allRecipes
    .map((r) => ({ recipe: r, score: scoreRecipe(r, favoriteIds, cookedIds, daySeed) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.recipe);
}
