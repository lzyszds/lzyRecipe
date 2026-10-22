import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Heart, MagnifyingGlass, X } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { RecipeCard } from '../components/RecipeCard';
import { EmptyState, PageMain } from '../components/ui/PageLayout';
import { Button } from '../components/ui/Button';
import { AppHeader } from '../components/AppHeader';
import { useAllRecipes, getCategoriesWithCounts } from '../lib/recipes';
import { UI_ICON_WEIGHT } from '../lib/icons';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

const ALL = '全部';

export function AllRecipes() {
  const allRecipes = useAllRecipes();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = getCategoriesWithCounts(allRecipes);
  const [keyword, setKeyword] = useState('');

  const queryCategory = searchParams.get('category');
  const activeCategory =
    queryCategory && categories.some((c) => c.name === queryCategory) ? queryCategory : ALL;

  // 按分类分别记忆滚动位置：详情页返回时停在原来的位置
  useScrollRestoration(
    activeCategory === ALL ? '/recipes' : `/recipes?category=${encodeURIComponent(activeCategory)}`
  );

  const selectCategory = (name: string) => {
    if (name === activeCategory) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (name === ALL) setSearchParams({}, { replace: true });
    else setSearchParams({ category: name }, { replace: true });
  };

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return allRecipes.filter((recipe) => {
      const matchCategory = activeCategory === ALL || recipe.category === activeCategory;
      if (!matchCategory) return false;
      if (!kw) return true;
      return (
        recipe.name.toLowerCase().includes(kw) ||
        recipe.category.toLowerCase().includes(kw) ||
        recipe.ingredients.some((item) => item.name.toLowerCase().includes(kw))
      );
    });
  }, [allRecipes, activeCategory, keyword]);

  return (
    <div>
      <AppHeader />

      <PageMain className="space-y-3">
        {/* 搜索 + 分类胶囊（吸顶，不透明底色避免滚动时与头部/状态栏出现色差） */}
        <div className="sticky top-[calc(var(--safe-top)+3.25rem)] z-30 -mx-4 px-4 py-1 bg-oat-50 space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={15}
                weight={UI_ICON_WEIGHT}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-400 pointer-events-none"
              />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索菜名、食材..."
                className="input-field !bg-white pl-9 pr-9"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  aria-label="清除"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-cocoa-400 hover:bg-oat-100 transition"
                >
                  <X size={13} weight={UI_ICON_WEIGHT} />
                </button>
              )}
            </div>
            <Link
              to="/favorites"
              className="px-3 h-10 rounded-xl bg-white border border-oat-200/70 text-cocoa-700 text-xs font-medium flex items-center gap-1 shrink-0 active:scale-95 transition"
            >
              <Heart size={14} weight={UI_ICON_WEIGHT} className="text-apricot-500" />
              <span>收藏</span>
            </Link>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => selectCategory(ALL)}
              className={clsx(
                'shrink-0 px-3 py-1.5 rounded-lg text-xs transition',
                activeCategory === ALL
                  ? 'bg-apricot-500 text-white font-semibold'
                  : 'bg-white border border-oat-200/60 text-cocoa-700 font-medium'
              )}
            >
              全部 ({allRecipes.length})
            </button>
            {categories.map((category) => {
              const active = activeCategory === category.name;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category.name)}
                  className={clsx(
                    'shrink-0 px-3 py-1.5 rounded-lg text-xs transition',
                    active
                      ? 'bg-apricot-500 text-white font-semibold'
                      : 'bg-white border border-oat-200/60 text-cocoa-700 font-medium'
                  )}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] text-cocoa-400">
            {activeCategory === ALL ? '全部菜谱' : activeCategory} · {filtered.length} 道
          </span>
          {keyword && (
            <span className="text-[11px] text-apricot-600 font-medium">
              搜索「{keyword}」
            </span>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen size={32} weight="duotone" />}
            title={keyword ? '没有找到相关菜谱' : '暂无菜谱'}
            description={keyword ? '试试其他关键词，或按食材名称搜索' : undefined}
            actions={
              keyword ? (
                <Button variant="secondary" size="sm" onClick={() => setKeyword('')}>
                  清除搜索
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => selectCategory(ALL)}>
                  查看全部菜谱
                </Button>
              )
            }
          />
        )}
      </PageMain>
    </div>
  );
}
