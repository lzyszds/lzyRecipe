import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Clock, ChefHat, Check, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { recipes } from '../data/recipes';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { DifficultyLevel } from '../types';
import { clsx } from 'clsx';
import { RecipeCoverImage } from '../components/RecipeCoverImage';

const difficultyConfig: Record<DifficultyLevel, { label: string; className: string }> = {
  easy: { label: '简单', className: 'bg-green-200 text-green-800 border-green-700' },
  medium: { label: '中等', className: 'bg-yellow-200 text-yellow-800 border-yellow-700' },
  hard: { label: '困难', className: 'bg-red-200 text-red-800 border-red-700' },
};

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  const importedRecipes = useImportedRecipesStore((s) => s.importedRecipes);
  const allRecipes = [...recipes, ...importedRecipes];
  const recipe = allRecipes.find((r) => r.id === id);
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-4">菜谱不存在</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const difficulty = difficultyConfig[recipe.difficulty];
  const favorite = isFavorite(recipe.id);

  const toggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="cartoon-header" style={{ top: 'var(--safe-top)' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="cartoon-icon-btn -ml-1"
          >
            <ArrowLeft className="w-6 h-6 text-text-primary" strokeWidth={2.5} />
          </button>
          <h1 className="font-cartoon text-xl text-text-primary truncate flex-1">
            {recipe.name}
          </h1>
          <button
            onClick={() => toggleFavorite(recipe.id)}
            className={clsx(
              'cartoon-icon-btn',
              favorite && 'bg-primary/10 border-primary'
            )}
          >
            <Heart className={clsx('w-5 h-5', favorite && 'fill-current text-primary')} />
          </button>
        </div>
      </div>

      <main>
        {/* Hero Image */}
        <div className="relative aspect-video max-h-[400px] overflow-hidden border-b-[3px] border-outline">
          <RecipeCoverImage
            name={recipe.name}
            coverImage={recipe.coverImage}
            category={recipe.category}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Favorite Button */}
          <button
            onClick={() => toggleFavorite(recipe.id)}
            className={clsx(
              'absolute bottom-4 right-4 p-3 rounded-full border-[3px] border-outline shadow-cartoon transition-all',
              favorite
                ? 'bg-primary text-white'
                : 'bg-white text-text-secondary hover:-translate-y-0.5'
            )}
          >
            <Heart className={clsx('w-5 h-5', favorite && 'fill-current')} />
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Title & Meta */}
          <div className="mb-6">
            <h1 className="font-cartoon text-3xl text-text-primary mb-3">
              {recipe.name}
            </h1>
            <p className="text-text-secondary mb-4">{recipe.description}</p>

            <div className="flex flex-wrap gap-3">
              <span
                className={clsx(
                  'cartoon-badge text-sm',
                  difficulty.className
                )}
              >
                {difficulty.label}
              </span>
              <span className="cartoon-badge bg-surface text-text-primary flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {recipe.cookTime}分钟
              </span>
              <span className="cartoon-badge bg-accent/40 text-text-primary flex items-center gap-1.5">
                <ChefHat className="w-4 h-4" />
                {recipe.category}
              </span>
            </div>
          </div>

          {/* Ingredients */}
          <section className="mb-8">
            <h2 className="cartoon-section-title">
              <span className="cartoon-section-bar">🥬</span>
              食材清单
            </h2>
            <div className="card p-5">
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>
                    <button
                      onClick={() => toggleIngredient(index)}
                      className={clsx(
                        'w-full flex items-center gap-3 p-2 rounded-xl transition-colors border-2 border-transparent',
                        checkedIngredients.has(index)
                          ? 'bg-green-100 border-green-300'
                          : 'hover:bg-surface/50 hover:border-outline/20'
                      )}
                    >
                      <span
                        className={clsx(
                          'flex-shrink-0 w-6 h-6 rounded-lg border-[3px] border-outline flex items-center justify-center transition-colors shadow-cartoon-sm',
                          checkedIngredients.has(index)
                            ? 'bg-secondary border-outline text-white'
                            : 'bg-white'
                        )}
                      >
                        {checkedIngredients.has(index) && (
                          <Check className="w-3 h-3" />
                        )}
                      </span>
                      <span
                        className={clsx(
                          'flex-1 text-left',
                          checkedIngredients.has(index) &&
                            'line-through text-text-secondary'
                        )}
                      >
                        {ingredient.name}
                      </span>
                      <span className="text-text-secondary text-sm">
                        {ingredient.amount}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Steps */}
          <section className="mb-8">
            <h2 className="cartoon-section-title">
              <span className="cartoon-section-bar">👨‍🍳</span>
              烹饪步骤
            </h2>
            <div className="space-y-4">
              {recipe.steps.map((step) => (
                <div
                  key={step.order}
                  className="card p-5 flex gap-4"
                >
                  <span className="flex-shrink-0 w-11 h-11 rounded-2xl bg-primary text-white border-[3px] border-outline shadow-cartoon-sm flex items-center justify-center font-cartoon text-lg">
                    {step.order}
                  </span>
                  <p className="flex-1 text-text-primary leading-relaxed pt-1">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Tips */}
          {recipe.tips && (
            <section className="mb-8">
              <h2 className="cartoon-section-title">
                <span className="cartoon-section-bar">💡</span>
                小贴士
              </h2>
              <div className="bg-accent/30 border-[3px] border-outline rounded-3xl p-5 shadow-cartoon-sm">
                <p className="text-text-primary leading-relaxed">{recipe.tips}</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
