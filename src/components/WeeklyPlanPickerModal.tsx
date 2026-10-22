import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { Recipe } from '../types';
import type { MealSlot } from '../store/weeklyPlanStore';
import { getMealSlotLabel } from '../lib/weeklyPlan';
import { CoverThumb } from './CoverThumb';
import { BottomSheet } from './ui/BottomSheet';
import { UI_ICON_WEIGHT } from '../lib/icons';

type PickerTab = 'all' | 'favorites';

const ROW_HEIGHT = 60;
const LIST_MAX_HEIGHT = 'min(52vh, 420px)';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const pool =
      tab === 'favorites' ? recipes.filter((r) => favoriteIds.includes(r.id)) : recipes;
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    );
  }, [recipes, favoriteIds, tab, query]);

  // 只渲染可视区域的列表项：之前一次性渲染上百条带封面/收藏按钮的卡片，打开弹窗明显卡顿
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
    getItemKey: (index) => filtered[index]?.id ?? index,
  });

  // 换关键词 / 切 tab / 重新打开时回到列表顶部
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setTab('all');
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [query, tab]);

  const handleClose = () => {
    setQuery('');
    setTab('all');
    onClose();
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
          className="input-field !pl-10 bg-white"
          placeholder="搜索菜名或分类"
        />
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white">
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
                ? 'bg-oat-100 text-cocoa-900'
                : 'text-cocoa-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {allRecipesCount !== undefined && recipes.length < allRecipesCount && (
        <p className="text-[11px] text-cocoa-400 text-center">
          已按餐次隐藏部分分类，可在计划页调整「可选品类」
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-cocoa-400 py-8">
          {tab === 'favorites'
            ? '当前范围内没有可用的收藏菜谱'
            : '没有找到匹配的菜谱，可尝试开启更多分类'}
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain -mx-1 px-1"
          style={{ height: LIST_MAX_HEIGHT }}
        >
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((item) => {
              const recipe = filtered[item.index];
              return (
                <div
                  key={item.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: item.size,
                    transform: `translateY(${item.start}px)`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(recipe.id)}
                    className="w-full h-full flex items-center gap-3 rounded-xl px-2 text-left hover:bg-white transition-colors"
                  >
                    <CoverThumb
                      recipeId={recipe.id}
                      name={recipe.name}
                      coverImage={recipe.coverImage}
                      category={recipe.category}
                      className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-oat-100 text-base leading-none"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cocoa-900 truncate">{recipe.name}</p>
                      <p className="text-[11px] text-cocoa-400 mt-0.5">
                        {recipe.category} · {recipe.cookTime} 分钟
                      </p>
                    </div>
                    <span className="text-xs font-medium text-apricot-500 flex-shrink-0">选择</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
