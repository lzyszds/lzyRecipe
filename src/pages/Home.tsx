import { CaretRight, DownloadSimple, Plus } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { WeeklyPlan } from '../components/WeeklyPlan';
import { RecipeCard } from '../components/RecipeCard';
import { SearchBar } from '../components/SearchBar';
import { IconButton } from '../components/ui/IconButton';
import { HomeHeader } from '../components/ui/PageHeader';
import { PageMain } from '../components/ui/PageLayout';
import { useAllRecipes } from '../lib/recipes';
import { useUIStore } from '../store/uiStore';
import { UI_ICON_WEIGHT } from '../lib/icons';

export function Home() {
  const navigate = useNavigate();
  const allRecipes = useAllRecipes();
  const openImportModal = useUIStore((s) => s.openImportModal);

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
      <HomeHeader
        search={<SearchBar placeholder="搜索菜谱、食材..." />}
        actions={
          <>
            <IconButton
              icon={<Plus size={18} weight={UI_ICON_WEIGHT} />}
              label="写菜谱"
              onClick={() => navigate('/create')}
            />
            <IconButton
              icon={<DownloadSimple size={18} weight={UI_ICON_WEIGHT} />}
              label="导入菜谱"
              onClick={openImportModal}
            />
          </>
        }
      />

      <PageMain className="space-y-6">
        <WeeklyPlan />

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-text-primary">精选菜谱</h2>
            <button
              type="button"
              onClick={() => navigate('/recipes')}
              className="text-xs font-medium text-text-secondary hover:text-text-primary flex items-center gap-0.5 transition-colors"
            >
              共 {allRecipes.length} 道
              <CaretRight size={14} weight={UI_ICON_WEIGHT} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {allRecipes.length === 0 && (
            <div className="text-center py-14">
              <p className="text-sm text-text-secondary">还没有菜谱，来写第一道吧</p>
            </div>
          )}
        </section>
      </PageMain>
    </div>
  );
}
