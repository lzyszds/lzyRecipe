import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CircleNotch, Sparkle } from '@phosphor-icons/react';
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
import { RecipeQaSheet } from '../components/RecipeQaSheet';
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
  const [qaOpen, setQaOpen] = useState(false);

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
          <p className="text-cocoa-400 text-xs font-medium">菜谱不存在</p>
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
      <div className="relative h-48 sm:h-60 w-full bg-oat-100">
        <RecipeCoverImage
          recipeId={recipe.id}
          name={recipe.name}
          coverImage={recipe.coverImage}
          category={recipe.category}
          alt={recipe.name}
          priority
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 pt-[calc(1rem+var(--safe-top))]">
          <IconButton
            icon={<ArrowLeft size={16} weight={UI_ICON_WEIGHT} />}
            label="返回"
            onClick={() => navigate(-1)}
            className="!bg-white/90 backdrop-blur-md !text-cocoa-900 !border-transparent !shadow-none"
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
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-cocoa-900/45 px-4">
            <div className="flex flex-col items-center gap-2 text-center text-white">
              {coverRepairing && (
                <CircleNotch size={26} weight="bold" className="animate-spin" />
              )}
              <p className="text-xs font-medium leading-snug">{coverRepairMsg}</p>
              {!coverRepairing && !coverRepairOk && (
                <p className="text-[11px] text-white/75">可尝试「选择图片」手动上传</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="page-container relative z-10 -mt-5 space-y-3">
        <section className="bg-white rounded-xl p-4 card-shadow border border-oat-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base font-bold text-cocoa-900 leading-tight">
                {recipe.name}
              </h1>
              <p className="text-[11px] text-cocoa-400 mt-1">
                {recipe.category} · {recipe.cookTime}分钟 · {difficulty.label}
              </p>
            </div>
            <FavoriteHeart
              active={favorite}
              size={16}
              onClick={() => toggleFavorite(recipe.id)}
              className="!w-8 !h-8"
            />
          </div>

          {recipe.description && (
            <p className="text-xs text-cocoa-700 leading-relaxed mt-3">
              {recipe.description}
            </p>
          )}
        </section>

        <section className="bg-white p-3.5 rounded-xl border border-oat-100 space-y-2">
          <h2 className="text-xs font-bold text-cocoa-900">
            食材清单（点击勾选备菜）
          </h2>
          {recipe.ingredients.map((ingredient, index) => {
            const checked = checkedIngredients.has(index);
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggleIngredient(index)}
                className="w-full p-2 rounded-lg bg-oat-50 flex items-center justify-between gap-3 text-left transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={clsx(
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                      checked
                        ? 'bg-apricot-500 border-apricot-500 text-white'
                        : 'border-cocoa-400 bg-white text-transparent'
                    )}
                  >
                    <Check size={10} weight="bold" />
                  </span>
                  <span
                    className={clsx(
                      'text-xs truncate transition-colors',
                      checked ? 'text-cocoa-400 line-through' : 'text-cocoa-900'
                    )}
                  >
                    {ingredient.name}
                  </span>
                </span>
                <span
                  className={clsx(
                    'text-[11px] flex-shrink-0',
                    checked ? 'text-cocoa-200' : 'text-cocoa-400'
                  )}
                >
                  {ingredient.amount}
                </span>
              </button>
            );
          })}
        </section>

        <section className="bg-white p-3.5 rounded-xl border border-oat-100 space-y-2 leading-relaxed text-cocoa-700">
          <h2 className="text-xs font-bold text-cocoa-900 mb-1">做法步骤</h2>
          {recipe.steps.map((step) => (
            <p key={step.order} className="text-xs text-cocoa-700 leading-relaxed">
              <span className="font-bold text-cocoa-900 mr-1">{step.order}.</span>
              {step.description}
            </p>
          ))}
        </section>

        {recipe.tips && (
          <section className="rounded-xl bg-apricot-50 border border-apricot-200/60 p-3.5">
            <h2 className="text-xs font-bold text-apricot-600 mb-1.5">小贴士</h2>
            <p className="text-xs text-cocoa-700 leading-relaxed">{recipe.tips}</p>
          </section>
        )}

        {/* AI 问答：围绕这道菜回答做法、替换食材等问题 */}
        <button
          type="button"
          onClick={() => setQaOpen(true)}
          className="w-full rounded-xl bg-white border border-oat-100 px-3.5 py-3 flex items-center gap-2.5 text-left active:scale-[0.99] transition card-shadow"
        >
          <span className="w-8 h-8 rounded-lg bg-apricot-50 text-apricot-500 flex items-center justify-center flex-shrink-0">
            <Sparkle size={16} weight="fill" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-cocoa-900">问 AI</span>
            <span className="block text-[11px] text-cocoa-400 mt-0.5 truncate">
              火候、替换食材、调整份量，随时提问
            </span>
          </span>
          <span className="text-[11px] font-medium text-apricot-600 shrink-0">去提问</span>
        </button>
      </div>

      <RecipeQaSheet recipe={recipe} isOpen={qaOpen} onClose={() => setQaOpen(false)} />
    </div>
  );
}
