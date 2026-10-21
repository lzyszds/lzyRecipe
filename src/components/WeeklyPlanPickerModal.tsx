import { useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { Recipe } from '../types';
import type { MealSlot } from '../store/weeklyPlanStore';
import { getMealSlotLabel } from '../lib/weeklyPlan';
import { RecipeCoverImage } from './RecipeCoverImage';
import { BottomSheet } from './ui/BottomSheet';
import { UI_ICON_WEIGHT } from '../lib/icons';

type PickerTab = 'all' | 'favorites';

interface WeeklyPlanPickerModalProps {
  isOpen: boolean;
  dayLabel: string;
  mealSlot?: MealSlot;
  recipes: Recipe[];
  /** 全部菜谱数量，用于提示已隐藏的分类 */
  allRecipesCount?: number;
  favoriteIds: string[];
  onClose: () => void;
  onSelect: (recipeId: string) => void;
}

export function WeeklyPlanPickerModal({
  isOpen,
  dayLabel,
  mealSlot,
  recipes,
  allRecipesCount,
  favoriteIds,
  onClose,
  onSelect,
}: WeeklyPlanPickerModalProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<PickerTab>('all');

  const filtered = useMemo(() => {
    const pool =
      tab === 'favorites'
        ? recipes.filter((r) => favoriteIds.includes(r.id))
        : recipes;
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [recipes, favoriteIds, tab, query]);

  const handleClose = () => {
    setQuery('');
    setTab('all');
    onClose();
  };

  const handleSelect = (recipeId: string) => {
    onSelect(recipeId);
    setQuery('');
    setTab('all');
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="选择菜谱"
      description={`${dayLabel}${mealSlot ? ` · 推荐${getMealSlotLabel(mealSlot)}品类` : ''}`}
      bodyClassName="space-y-3"
    >
      <div className="relative">
        <MagnifyingGlass
          size={16}
          weight={UI_ICON_WEIGHT}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field !pl-10 bg-surface"
          placeholder="搜索菜名或分类"
        />
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-surface">
        {(
          [
            ['all', '全部菜谱'],
            ['favorites', '我的收藏'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={clsx(
              'flex-1 h-9 rounded-lg text-xs font-medium transition-all',
              tab === value
                ? 'bg-white text-text-primary shadow-cozy-sm'
                : 'text-text-secondary'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {allRecipesCount !== undefined && recipes.length < allRecipesCount && (
        <p className="text-[11px] text-text-secondary text-center">
          已按餐次隐藏部分分类，可在计划页调整「可选品类」
        </p>
      )}

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-text-secondary py-8">
            {tab === 'favorites'
              ? '当前范围内没有可用的收藏菜谱'
              : '没有找到匹配的菜谱，可尝试开启更多分类'}
          </p>
        ) : (
          filtered.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              onClick={() => handleSelect(recipe.id)}
              className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface transition-colors"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-oat-100">
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
                <p className="text-sm font-medium text-text-primary truncate">
                  {recipe.name}
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {recipe.category} · {recipe.cookTime} 分钟
                </p>
              </div>
              <span className="text-xs font-medium text-primary flex-shrink-0">选择</span>
            </button>
          ))
        )}
      </div>
    </BottomSheet>
  );
}
