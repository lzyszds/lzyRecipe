import { Link } from 'react-router-dom';
import { Recipe, DifficultyLevel } from '../types';
import { clsx } from 'clsx';
import { useFavoritesStore } from '../store/favoritesStore';
import { RecipeCoverImage } from './RecipeCoverImage';
import { FavoriteHeart } from './motion/FavoriteHeart';
import { openAddToMealPlan } from '../lib/addToMealPlan';

interface RecipeCardProps {
  recipe: Recipe;
  className?: string;
  compact?: boolean;
  hideFavorite?: boolean;
}

const difficultyLabel: Record<DifficultyLevel, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export function RecipeCard({ recipe, className, compact, hideFavorite }: RecipeCardProps) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorite = isFavorite(recipe.id);

  /** 「+ 餐盘」：就地弹出选择日期与餐次，不再跳转到周计划页 */
  const openPlanSheet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openAddToMealPlan(recipe);
  };

  if (compact) {
    return (
      <div
        className={clsx(
          'group bg-white rounded-xl border border-oat-100 card-shadow p-2.5 flex items-center gap-3',
          hideFavorite && 'pr-12',
          className
        )}
      >
        <Link to={`/recipe/${recipe.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-oat-100">
            <RecipeCoverImage
              recipeId={recipe.id}
              name={recipe.name}
              coverImage={recipe.coverImage}
              category={recipe.category}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs text-cocoa-900 truncate">{recipe.name}</h3>
            <p className="text-[11px] text-cocoa-400 mt-0.5 line-clamp-1">
              {recipe.description || recipe.ingredients.slice(0, 3).map((i) => i.name).join('、')}
            </p>
            <span className="text-[10px] text-cocoa-400 mt-1 block truncate">
              {recipe.category} · {recipe.cookTime}分钟 · {difficultyLabel[recipe.difficulty]}
            </span>
          </div>
        </Link>

        {!hideFavorite && (
          <FavoriteHeart
            active={favorite}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(recipe.id);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group relative bg-white rounded-xl p-2 border border-oat-100 card-shadow',
        'transition active:scale-[0.98] flex flex-col',
        className
      )}
    >
      <Link to={`/recipe/${recipe.id}`} className="block">
        <div className="relative h-28 rounded-lg overflow-hidden bg-oat-100">
          <RecipeCoverImage
            recipeId={recipe.id}
            name={recipe.name}
            coverImage={recipe.coverImage}
            category={recipe.category}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent" />
        </div>
      </Link>

      {!hideFavorite && (
        <div className="absolute top-4 right-4">
          <FavoriteHeart
            active={favorite}
            size={13}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(recipe.id);
            }}
            className="!w-6 !h-6 !rounded-md"
          />
        </div>
      )}

      <div className="px-1 pt-2 pb-0.5">
        <Link to={`/recipe/${recipe.id}`} className="block">
          <h3 className="font-bold text-xs text-cocoa-900 truncate">{recipe.name}</h3>
        </Link>
        <div className="flex items-center justify-between gap-1 mt-1.5">
          <span className="text-[10px] text-cocoa-400 truncate">
            {recipe.category} · {recipe.cookTime}分钟
          </span>
          <button
            type="button"
            onClick={openPlanSheet}
            className="shrink-0 px-2 py-0.5 rounded-md bg-apricot-50 border border-apricot-200/70 text-apricot-600 text-[10px] font-semibold hover:bg-apricot-500 hover:text-white transition-colors"
          >
            + 餐盘
          </button>
        </div>
      </div>
    </div>
  );
}
