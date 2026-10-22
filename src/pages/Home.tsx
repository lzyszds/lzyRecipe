import { Heart } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { WeeklyPlan } from '../components/WeeklyPlan';
import { RecipeCard } from '../components/RecipeCard';
import { SearchBar } from '../components/SearchBar';
import { AppHeader } from '../components/AppHeader';
import { UpdateBanner } from '../components/UpdateBanner';
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

  // 抵消 .page-shell 的 min-h-screen 与底部导航留白，首页正好占满可视区
  return (
    <div className="h-[100dvh] -mb-[calc(var(--size-nav)+2.25rem+var(--safe-bottom))] overflow-hidden flex flex-col">
      <AppHeader />

      {/* 首页整体不滚动：纵向空间不足时由精选区内部滚动 */}
      <main className="page-container flex-1 min-h-0 flex flex-col gap-3 pt-3 pb-[calc(var(--size-nav)+1.75rem+var(--safe-bottom))]">
        <UpdateBanner />
        <WeeklyPlan />

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

        <section className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
            <h2 className="text-xs font-bold text-cocoa-900">
              精选菜谱
              <span className="ml-1.5 font-medium text-cocoa-400">{categories.length} 类</span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('/recipes')}
              className="text-[11px] font-medium text-cocoa-400 hover:text-cocoa-700 transition-colors"
            >
              查看全部 {allRecipes.length} 道 →
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
            <div className="grid grid-cols-2 gap-3 pb-1">
              {displayRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            {allRecipes.length === 0 && (
              <div className="text-center py-14">
                <p className="text-xs text-cocoa-400">还没有菜谱，来写第一道吧</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
