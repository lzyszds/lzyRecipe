import { Clock, ChefHat, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Recipe, DifficultyLevel } from '../types';
import { clsx } from 'clsx';
import { useFavoritesStore } from '../store/favoritesStore';
import { RecipeCoverImage } from './RecipeCoverImage';

interface RecipeCardProps {
  recipe: Recipe;
  className?: string;
  compact?: boolean;
}

const difficultyConfig: Record<DifficultyLevel, { label: string; className: string }> = {
  easy: { label: '简单', className: 'bg-green-200 text-green-800 border-green-700' },
  medium: { label: '中等', className: 'bg-yellow-200 text-yellow-800 border-yellow-700' },
  hard: { label: '困难', className: 'bg-red-200 text-red-800 border-red-700' },
};

export function RecipeCard({ recipe, className, compact }: RecipeCardProps) {
  const difficulty = difficultyConfig[recipe.difficulty];
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorite = isFavorite(recipe.id);

  if (compact) {
    return (
      <Link
        to={`/recipe/${recipe.id}`}
        className="cartoon-list-item group"
      >
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-outline bg-surface">
          <RecipeCoverImage
            name={recipe.name}
            coverImage={recipe.coverImage}
            category={recipe.category}
            alt={recipe.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute top-1 left-1">
            <span className="cartoon-badge bg-white/90 text-text-secondary scale-90 origin-top-left">
              {recipe.category}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-cartoon text-text-primary truncate">
            {recipe.name}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">{recipe.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-text-secondary flex items-center gap-1 font-bold">
              <Clock className="w-3 h-3" />
              {recipe.cookTime}分钟
            </span>
            <span className={clsx('cartoon-badge', difficulty.className)}>
              {difficulty.label}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(recipe.id);
          }}
          className={clsx(
            'cartoon-icon-btn',
            favorite && 'bg-primary/10 border-primary'
          )}
        >
          <Heart className={clsx('w-5 h-5', favorite ? 'text-primary fill-primary' : 'text-text-secondary')} />
        </button>
      </Link>
    );
  }

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className={clsx('card group block', className)}
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b-[3px] border-outline">
        <RecipeCoverImage
          name={recipe.name}
          coverImage={recipe.coverImage}
          category={recipe.category}
          alt={recipe.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          <span className={clsx('cartoon-badge', difficulty.className)}>
            {difficulty.label}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-cartoon text-lg text-text-primary mb-1 group-hover:text-primary transition-colors">
          {recipe.name}
        </h3>
        <p className="text-sm text-text-secondary line-clamp-2 mb-3 font-medium">
          {recipe.description}
        </p>

        <div className="flex items-center gap-4 text-xs text-text-secondary font-bold">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {recipe.cookTime}分钟
          </span>
          <span className="flex items-center gap-1">
            <ChefHat className="w-3.5 h-3.5" />
            {recipe.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
