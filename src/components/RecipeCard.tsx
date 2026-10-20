import { Link } from 'react-router-dom';
import { Recipe, DifficultyLevel } from '../types';
import { clsx } from 'clsx';
import { useFavoritesStore } from '../store/favoritesStore';
import { RecipeCoverImage } from './RecipeCoverImage';
import { FavoriteHeart } from './motion/FavoriteHeart';

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

  if (compact) {
    return (
      <div
        className={clsx(
          'cartoon-list-item group',
          hideFavorite && 'pr-12',
          className
        )}
      >
        <Link to={`/recipe/${recipe.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-neutral-100">
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
            <h3 className="font-bold text-sm text-text-primary truncate">{recipe.name}</h3>
            <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
              {recipe.description || recipe.ingredients.slice(0, 3).map((i) => i.name).join('、')}
            </p>
            <span className="text-[10px] text-text-secondary mt-1 block">
              {recipe.cookTime} 分钟 · {difficultyLabel[recipe.difficulty]}
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
        'group relative bg-white rounded-2xl overflow-hidden transition-all duration-200 shadow-[0_2px_10px_rgba(0,0,0,0.03)]',
        'hover:shadow-cozy-hover active:scale-[0.98]',
        className
      )}
    >
      <Link to={`/recipe/${recipe.id}`} className="block">
        <div className="relative h-32 md:h-36 bg-neutral-100">
          <RecipeCoverImage
            recipeId={recipe.id}
            name={recipe.name}
            coverImage={recipe.coverImage}
            category={recipe.category}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/15 to-transparent" />
        </div>

        <div className="p-3">
          <h3 className="font-bold text-xs text-text-primary truncate">{recipe.name}</h3>
          <p className="text-[11px] text-text-secondary mt-1 truncate">
            {recipe.category} · {recipe.cookTime} 分钟
          </p>
        </div>
      </Link>

      {!hideFavorite && (
        <div className="absolute top-2.5 right-2.5">
          <FavoriteHeart
            active={favorite}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(recipe.id);
            }}
            className="!bg-white/80 backdrop-blur-md !w-7 !h-7"
          />
        </div>
      )}
    </div>
  );
}
