import { recipes, categories } from '../data/recipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { Category, Recipe } from '../types';

export function getAllRecipes(importedRecipes: Recipe[] = []): Recipe[] {
  const map = new Map<string, Recipe>();
  for (const r of recipes) {
    map.set(r.id, r);
  }
  for (const r of importedRecipes) {
    map.set(r.id, r);
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
