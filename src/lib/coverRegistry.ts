import { recipes } from '../data/recipes';

function coverPathForRecipe(recipeId: string, coverImage: string): string {
  if (coverImage.startsWith('/covers/')) return coverImage;
  return `/covers/${recipeId}.svg`;
}

/** 内置菜谱本地封面（优先 jpg/png，其次 svg） */
export function getLocalCoverPath(recipeName: string): string | null {
  const name = recipeName.trim();
  const recipe = recipes.find((r) => r.name === name);
  if (recipe) {
    return coverPathForRecipe(recipe.id, recipe.coverImage);
  }
  return null;
}

export function getLocalCoverPathById(recipeId: string): string {
  const recipe = recipes.find((r) => r.id === recipeId);
  if (recipe?.coverImage.startsWith('/covers/')) return recipe.coverImage;
  return `/covers/${recipeId}.svg`;
}
