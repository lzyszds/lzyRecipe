import { recipes, categories } from '../data/recipes';
import { generatedRecipes } from '../data/generatedRecipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { migrateRecipeTaxonomy } from '../constants/recipeCategories';
import { Category, Recipe } from '../types';

export function getAllRecipes(importedRecipes: Recipe[] = []): Recipe[] {
  const map = new Map<string, Recipe>();
  for (const r of recipes) {
    map.set(r.id, migrateRecipeTaxonomy(r));
  }
  for (const r of generatedRecipes) {
    map.set(r.id, migrateRecipeTaxonomy(r));
  }
  for (const r of importedRecipes) {
    // 用户导入的菜谱可能还是旧分类体系（海鲜/汤/调料等），读取时自动归一并补标签
    map.set(r.id, migrateRecipeTaxonomy(r));
  }
  return Array.from(map.values());
}

export function getCategoriesWithCounts(allRecipes: Recipe[]): Category[] {
  return categories.map((category) => ({
    ...category,
    count: allRecipes.filter((r) => r.category === category.name).length,
  }));
}

export function useAllRecipes(): Recipe[] {
  const importedRecipes = useImportedRecipesStore((s) => s.importedRecipes);
  return getAllRecipes(importedRecipes);
}
