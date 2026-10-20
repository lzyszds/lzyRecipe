import { useMemo, useRef, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BookOpen } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { RecipeCard } from '../components/RecipeCard';
import { EmptyState } from '../components/ui/PageLayout';
import { Button } from '../components/ui/Button';
import { useAllRecipes, getCategoriesWithCounts } from '../lib/recipes';
import { recipes as builtInRecipes } from '../data/recipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import type { Recipe } from '../types';

const ALL = '全部';

// 模块级缓存：切到菜谱详情再返回时，保留所选分类与滚动位置
let cachedCategory = ALL;
let cachedScrollTop = 0;

type ListRow =
  | { type: 'header'; key: string; category: string; count: number }
  | { type: 'recipe'; key: string; category: string; recipe: Recipe };

export function AllRecipes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const allRecipes = useAllRecipes();
  const importedCount = useImportedRecipesStore((s) => s.importedRecipes.length);
  const categories = useMemo(() => getCategoriesWithCounts(allRecipes), [allRecipes]);

  const queryCategory = searchParams.get('category');
  const activeCategory =
    queryCategory && categories.some((c) => c.name === queryCategory)
      ? queryCategory
      : cachedCategory;

  const listRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  // 每次重新进入页面时恢复上次滚动位置
  const restoredRef = useRef(false);
  // 每次进入时同步一次模块缓存，供离开时（清理阶段）写回
  useEffect(() => {
    cachedCategory = activeCategory;
  }, [activeCategory]);

  // 记录当前列表滚动位置（滚动、离开、回到前台时都会写入，避免依赖清理时机）
  const rememberScroll = () => {
    if (listRef.current) cachedScrollTop = listRef.current.scrollTop;
  };

  useEffect(() => {
    // 离开页面前记录位置：组件卸载或浏览器后退（组件暂未卸载、列表被移出文档时）
    return () => {
      const el = listRef.current;
      if (el && el.isConnected) rememberScroll();
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') rememberScroll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', rememberScroll);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', rememberScroll);
    };
  }, []);

  // 选中具体分类时只显示该分类；全部时按分类分组展示，便于左侧联动高亮
  const rows = useMemo<ListRow[]>(() => {
    if (activeCategory !== ALL) {
      return allRecipes
        .filter((recipe) => recipe.category === activeCategory)
        .map((recipe): ListRow => ({
          type: 'recipe',
          key: recipe.id,
          category: recipe.category,
          recipe,
        }));
    }

    const groups = new Map<string, Recipe[]>();
    categories.forEach((c) => groups.set(c.name, []));
    allRecipes.forEach((recipe) => {
      const list = groups.get(recipe.category);
      if (list) list.push(recipe);
      else groups.set(recipe.category, [recipe]);
    });

    const result: ListRow[] = [];
    groups.forEach((list, name) => {
      if (list.length === 0) return;
      result.push({ type: 'header', key: `header-${name}`, category: name, count: list.length });
      list.forEach((recipe) =>
        result.push({ type: 'recipe', key: recipe.id, category: name, recipe })
      );
    });
    return result;
  }, [allRecipes, categories, activeCategory]);

  // 全部模式下，左侧高亮滚动位置顶部所在的分类
  const [spyCategory, setSpyCategory] = useState(ALL);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current,
    estimateSize: (index) => (rows[index].type === 'header' ? 40 : 104),
    getItemKey: (index) => rows[index].key,
    overscan: 6,
    onChange: (instance) => {
      const offset = instance.scrollOffset ?? 0;
      const top = instance.getVirtualItems().find((item) => item.end > offset);
      setSpyCategory(top ? rows[top.index].category : ALL);
    },
  });

  const highlightCategory = activeCategory === ALL ? spyCategory : activeCategory;

  useEffect(() => {
    asideRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightCategory]);

  // 进入（含浏览器后退返回本页）时恢复滚动位置；组件被复用（popstate）时同样触发
  useEffect(() => {
    const restore = () => {
      const el = listRef.current;
      if (!el) return;
      const target = cachedScrollTop;
      let attempts = 0;
      const tick = () => {
        if (!listRef.current || !listRef.current.isConnected) return;
        if (listRef.current.scrollTop !== target) {
          listRef.current.scrollTop = target;
        }
        // 等退出动画结束、DOM 尺寸稳定前持续校正，最多约 0.6s
        attempts += 1;
        if (attempts < 20) window.setTimeout(tick, 30);
      };
      tick();
    };

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    if (!restoredRef.current) {
      restoredRef.current = true;
      restore();
    }

    const onPopState = () => {
      if (window.location.pathname === '/recipes') restore();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectCategory = (name: string) => {
    // 全部模式下点击分类：滚动到对应分组
    if (activeCategory === ALL) {
      const index =
        name === ALL
          ? 0
          : rows.findIndex((row) => row.type === 'header' && row.category === name);
      if (index >= 0) virtualizer.scrollToIndex(index, { align: 'start' });
      return;
    }

    if (name === activeCategory) return;
    // 切换分类时从列表顶部开始
    cachedCategory = name;
    cachedScrollTop = 0;
    if (name === ALL) {
      navigate('/recipes', { replace: true });
    } else {
      navigate(`/recipes?category=${encodeURIComponent(name)}`, { replace: true });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--size-nav)-1.25rem-var(--safe-bottom))]">
      <div className="page-container pt-3 pb-3 shrink-0">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-lg font-bold text-text-primary">
            全部菜谱 ({allRecipes.length})
          </h1>
          <span className="text-[11px] text-text-secondary">
            内置 {builtInRecipes.length} · 导入 {importedCount}
          </span>
        </div>
      </div>

      <div className="page-container flex flex-1 min-h-0">
        <div className="bg-white rounded-t-3xl shadow-card flex flex-1 min-h-0 overflow-hidden">
          {/* 左侧固定分类栏，只自身滚动 */}
          <aside
            ref={asideRef}
            className="w-20 sm:w-24 md:w-32 shrink-0 h-full overflow-y-auto scrollbar-hide bg-surface/70 py-2"
          >
            {[ALL, ...categories.map((c) => c.name)].map((name) => {
              const active = highlightCategory === name;
              return (
                <button
                  key={name}
                  type="button"
                  data-active={active}
                  onClick={() => selectCategory(name)}
                  className={clsx(
                    'w-full py-3 px-3 sm:px-4 text-left text-xs transition-colors',
                    active
                      ? 'bg-white font-bold text-primary border-r-2 border-primary'
                      : 'text-neutral-500 hover:text-text-primary'
                  )}
                >
                  {name}
                </button>
              );
            })}
          </aside>

          {/* 右侧独立滚动列表（虚拟滚动，只渲染可见区域的菜谱） */}
          <div
            ref={listRef}
            data-scroll-container
            className="flex-1 min-w-0 h-full overflow-y-auto overscroll-contain px-4 pt-4 pb-6"
            onScroll={rememberScroll}
          >
            {rows.length > 0 ? (
              <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((item) => {
                  const row = rows[item.index];
                  return (
                    <div
                      key={item.key}
                      data-index={item.index}
                      ref={virtualizer.measureElement}
                      className="absolute top-0 left-0 w-full"
                      style={{ transform: `translateY(${item.start}px)` }}
                    >
                      {row.type === 'header' ? (
                        <div className="flex items-center justify-between pb-2 pt-1">
                          <h2 className="text-sm font-bold text-text-primary">{row.category}</h2>
                          <span className="text-[11px] text-text-secondary">{row.count} 道</span>
                        </div>
                      ) : (
                        <div className="pb-4">
                          <RecipeCard recipe={row.recipe} compact />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<BookOpen size={36} weight="duotone" />}
                title="暂无菜谱"
                actions={
                  <Button variant="primary" onClick={() => navigate('/create')}>
                    写第一个菜谱
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
