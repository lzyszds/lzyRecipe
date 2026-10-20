import { useParams, useNavigate } from 'react-router-dom';
import { Heart } from '@phosphor-icons/react';
import { RecipeCard } from '../components/RecipeCard';
import { CategoryNav } from '../components/CategoryNav';
import { PageHeader } from '../components/ui/PageHeader';
import { PageMain, EmptyState } from '../components/ui/PageLayout';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { useAllRecipes, getCategoriesWithCounts } from '../lib/recipes';
import { useFavoritesStore } from '../store/favoritesStore';
import { getCategoryIcon, UI_ICON_WEIGHT } from '../lib/icons';

export function CategoryPage() {
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const allRecipes = useAllRecipes();
  const favorites = useFavoritesStore((s) => s.favorites);

  const decodedName = decodeURIComponent(name ?? '');
  const categoryRecipes = allRecipes.filter((r) => r.category === decodedName);
  const CategoryIconComponent = getCategoryIcon(decodedName);

  return (
    <div>
      <PageHeader
        title={decodedName}
        showBack
        actions={
          <IconButton
            icon={<Heart size={18} weight={UI_ICON_WEIGHT} />}
            label="收藏"
            tone="primary"
            onClick={() => navigate('/favorites')}
            badge={
              favorites.length > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {favorites.length > 9 ? '9+' : favorites.length}
                </span>
              ) : undefined
            }
          />
        }
      />

      <PageMain>
        <CategoryNav
          categories={getCategoriesWithCounts(allRecipes)}
          activeName={decodedName}
        />

        {categoryRecipes.length > 0 ? (
          <div className="space-y-3">
            {categoryRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} compact />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CategoryIconComponent size={36} weight="duotone" />}
            title="该分类暂无菜谱"
            actions={
              <Button variant="primary" onClick={() => navigate('/recipes')}>
                浏览全部菜谱
              </Button>
            }
          />
        )}
      </PageMain>
    </div>
  );
}
