import { recipes, categories } from '../data/recipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { Category, Recipe } from '../types';

export function getAllRecipes(importedRecipes: Recipe[] = []): Recipe[] {
  return [...recipes, ...importedRecipes];
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
