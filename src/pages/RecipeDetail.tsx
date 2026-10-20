import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CircleNotch } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { recipes } from '../data/recipes';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { DifficultyLevel } from '../types';
import { clsx } from 'clsx';
import { RecipeCoverImage } from '../components/RecipeCoverImage';
import { IconButton } from '../components/ui/IconButton';
import { FavoriteHeart } from '../components/motion/FavoriteHeart';
import { Button } from '../components/ui/Button';
import { CoverRepairButton } from '../components/CoverRepairButton';
import { AddToWeeklyPlanButton } from '../components/AddToWeeklyPlanButton';
import { UI_ICON_WEIGHT } from '../lib/icons';

const difficultyConfig: Record<DifficultyLevel, { label: string }> = {
  easy: { label: '简单' },
  medium: { label: '中等' },
  hard: { label: '困难' },
};

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [coverRepairing, setCoverRepairing] = useState(false);
  const [coverRepairMsg, setCoverRepairMsg] = useState('');
  const [coverRepairOk, setCoverRepairOk] = useState(true);

  const importedRecipes = useImportedRecipesStore((s) => s.importedRecipes);
  const allRecipes = [...recipes, ...importedRecipes];
  const recipe = allRecipes.find((r) => r.id === id);
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setCoverRepairMsg('');
    setCoverRepairing(false);
  }, [id]);

  if (!recipe) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-text-secondary font-medium">菜谱不存在</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  const difficulty = difficultyConfig[recipe.difficulty];
  const favorite = isFavorite(recipe.id);

  const toggleIngredient = (index: number) => {
    const next = new Set(checkedIngredients);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setCheckedIngredients(next);
  };

  return (
    <div className="pb-10">
      <div className="relative h-60 sm:h-72 w-full bg-neutral-100">
        <RecipeCoverImage
          recipeId={recipe.id}
          name={recipe.name}
          coverImage={recipe.coverImage}
          category={recipe.category}
          alt={recipe.name}
          priority
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/10" />

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 pt-[calc(1rem+var(--safe-top))]">
          <IconButton
            icon={<ArrowLeft size={18} weight={UI_ICON_WEIGHT} />}
            label="返回"
            onClick={() => navigate(-1)}
            className="!bg-black/40 !text-white backdrop-blur-md !shadow-none"
          />
          <div className="flex items-center gap-2">
            <AddToWeeklyPlanButton recipeId={recipe.id} recipeName={recipe.name} />
            <CoverRepairButton
              recipeId={recipe.id}
              recipeName={recipe.name}
              category={recipe.category}
              onRepairingChange={setCoverRepairing}
              onProgress={setCoverRepairMsg}
              onResult={(message, ok) => {
                setCoverRepairMsg(message);
                setCoverRepairOk(ok);
                if (ok) window.setTimeout(() => setCoverRepairMsg(''), 2400);
              }}
            />
          </div>
        </div>

        {(coverRepairing || coverRepairMsg) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 px-4">
            <div className="flex flex-col items-center gap-2 text-center text-white">
              {coverRepairing && (
                <CircleNotch size={26} weight="bold" className="animate-spin" />
              )}
              <p className="text-sm font-medium leading-snug">{coverRepairMsg}</p>
              {!coverRepairing && !coverRepairOk && (
                <p className="text-xs text-white/75">可尝试「选择图片」手动上传</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="page-container relative z-10 -mt-6 space-y-5">
        <section className="bg-white rounded-3xl p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-text-primary leading-tight">
                {recipe.name}
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                {recipe.category} · {recipe.cookTime} 分钟 · {difficulty.label}
              </p>
            </div>
            <FavoriteHeart
              active={favorite}
              onClick={() => toggleFavorite(recipe.id)}
            />
          </div>

          {recipe.description && (
            <p className="text-sm text-neutral-500 leading-relaxed mt-3">
              {recipe.description}
            </p>
          )}
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-card">
          <h2 className="text-sm font-bold text-text-primary mb-2">食材清单</h2>
          <ul className="divide-y divide-neutral-100">
            {recipe.ingredients.map((ingredient, index) => {
              const checked = checkedIngredients.has(index);
              return (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => toggleIngredient(index)}
                    className="w-full flex items-center gap-2.5 min-h-[2.75rem] py-2.5 text-left"
                  >
                    <span
                      className={clsx(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                        checked
                          ? 'bg-primary border-primary'
                          : 'border-neutral-300 bg-white'
                      )}
                    >
                      {checked && <Check size={11} weight="bold" className="text-white" />}
                    </span>
                    <span
                      className={clsx(
                        'flex-1 text-sm transition-colors',
                        checked
                          ? 'text-neutral-400 line-through'
                          : 'text-text-primary'
                      )}
                    >
                      {ingredient.name}
                    </span>
                    <span
                      className={clsx(
                        'text-xs flex-shrink-0',
                        checked ? 'text-neutral-300' : 'text-neutral-500'
                      )}
                    >
                      {ingredient.amount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-card">
          <h2 className="text-sm font-bold text-text-primary mb-3">做法步骤</h2>
          <div className="space-y-3">
            {recipe.steps.map((step) => (
              <p
                key={step.order}
                className="text-sm text-neutral-600 leading-relaxed"
              >
                <span className="font-bold text-text-primary mr-1.5">
                  {step.order}.
                </span>
                {step.description}
              </p>
            ))}
          </div>
        </section>

        {recipe.tips && (
          <section className="rounded-3xl bg-sage-50 p-5">
            <h2 className="text-sm font-bold text-sage-600 mb-2">小贴士</h2>
            <p className="text-sm text-sage-600/90 leading-relaxed">{recipe.tips}</p>
          </section>
        )}
      </div>
    </div>
  );
}
