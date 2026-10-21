import { Heart } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { WeeklyPlan } from '../components/WeeklyPlan';
import { RecipeCard } from '../components/RecipeCard';
import { SearchBar } from '../components/SearchBar';
import { AppHeader } from '../components/AppHeader';
import { PageMain } from '../components/ui/PageLayout';
import { getCategoriesWithCounts, useAllRecipes } from '../lib/recipes';
import { UI_ICON_WEIGHT } from '../lib/icons';

export function Home() {
  const navigate = useNavigate();
  const allRecipes = useAllRecipes();
  const categories = getCategoriesWithCounts(allRecipes);

  // 首页精选指定菜谱，缺失的自动跳过
  const FEATURED_NAMES = [
    '芥末黄油罗氏虾',
    '小炒黄牛肉',
    '油焖大虾',
    '凉拌肥牛',
    '水煮鱼',
    '咖喱虾鸡堡',
  ];
  const featured = FEATURED_NAMES.map((name) =>
    allRecipes.find((r) => r.name.trim() === name)
  ).filter((r): r is NonNullable<typeof r> => Boolean(r));
  const displayRecipes = featured.length > 0 ? featured : allRecipes.slice(0, 6);

  return (
    <div>
      <AppHeader />

      <PageMain className="space-y-4">
        <WeeklyPlan />

        {/* 搜索栏 + 分类胶囊（吸顶） */}
        <div className="sticky top-[calc(var(--safe-top)+3.25rem)] z-30 -mx-4 px-4 py-1 bg-oat-50/95 backdrop-blur-md space-y-2.5">
          <div className="flex gap-2">
            <SearchBar placeholder="搜索菜名、食材..." />
            <Link
              to="/favorites"
              className="px-3 h-10 rounded-xl bg-white border border-oat-200/70 text-cocoa-700 text-xs font-medium flex items-center gap-1 shrink-0 active:scale-95 transition"
            >
              <Heart size={14} weight={UI_ICON_WEIGHT} className="text-apricot-500" />
              <span>收藏</span>
            </Link>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <Link
              to="/recipes"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-apricot-500 text-white text-xs font-semibold transition"
            >
              全部 ({allRecipes.length})
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/recipes?category=${encodeURIComponent(category.name)}`}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-oat-200/60 text-cocoa-700 text-xs font-medium transition active:scale-95"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold text-cocoa-900">精选菜谱</h2>
            <button
              type="button"
              onClick={() => navigate('/recipes')}
              className="text-[11px] font-medium text-cocoa-400 hover:text-cocoa-700 transition-colors"
            >
              查看全部 {allRecipes.length} 道 →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {allRecipes.length === 0 && (
            <div className="text-center py-14">
              <p className="text-xs text-cocoa-400">还没有菜谱，来写第一道吧</p>
            </div>
          )}
        </section>
      </PageMain>
    </div>
  );
}
