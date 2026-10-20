import { Heart, Trash } from '@phosphor-icons/react';
import { RecipeCard } from '../components/RecipeCard';
import { PageHeader } from '../components/ui/PageHeader';
import { PageMain, EmptyState } from '../components/ui/PageLayout';
import { IconButton } from '../components/ui/IconButton';
import { useFavoritesStore } from '../store/favoritesStore';
import { recipes } from '../data/recipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { UI_ICON_WEIGHT } from '../lib/icons';

export function Favorites() {
  const { favorites, removeFavorite } = useFavoritesStore();
  const importedRecipes = useImportedRecipesStore((s) => s.importedRecipes);
  const allRecipes = [...recipes, ...importedRecipes];
  const favoriteRecipes = allRecipes.filter((r) => favorites.includes(r.id));

  return (
    <div>
      <PageHeader title="我的收藏" showBack />

      <PageMain>
        {favoriteRecipes.length > 0 ? (
          <div className="space-y-2.5">
            {favoriteRecipes.map((recipe) => (
              <div key={recipe.id} className="relative">
                <RecipeCard recipe={recipe} compact hideFavorite />
                <div className="absolute top-1/2 -translate-y-1/2 right-3 z-20">
                  <IconButton
                    icon={<Trash size={16} weight={UI_ICON_WEIGHT} className="text-red-500" />}
                    label="取消收藏"
                    onClick={() => removeFavorite(recipe.id)}
                    className="!w-8 !h-8"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Heart size={40} weight="duotone" className="text-primary" />}
            title="还没有收藏任何菜谱"
            description="在菜谱详情页点击心形图标即可收藏"
          />
        )}
      </PageMain>
    </div>
  );
}
