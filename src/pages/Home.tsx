import { Heart, Plus, Download, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WeeklyPlan } from '../components/WeeklyPlan';
import { RecipeCard } from '../components/RecipeCard';
import { SearchBar } from '../components/SearchBar';
import { CategoryNav } from '../components/CategoryNav';
import { useAllRecipes, getCategoriesWithCounts } from '../lib/recipes';
import { useFavoritesStore } from '../store/favoritesStore';
import { useUIStore } from '../store/uiStore';

export function Home() {
  const navigate = useNavigate();
  const allRecipes = useAllRecipes();
  const favorites = useFavoritesStore((s) => s.favorites);
  const openImportModal = useUIStore((s) => s.openImportModal);
  const categoriesWithCounts = getCategoriesWithCounts(allRecipes);

  const displayRecipes = allRecipes.slice(0, 4);

  return (
    <div className="min-h-screen pb-24">
      <div className="cartoon-header" style={{ top: 'var(--safe-top)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-accent rounded-2xl border-[3px] border-outline shadow-cartoon-sm flex items-center justify-center animate-bounce-soft">
            <span className="text-2xl">🍳</span>
          </div>

          <div className="flex-1">
            <SearchBar placeholder="搜寻今天的食材 🔍" />
          </div>

          <button
            onClick={() => navigate('/favorites')}
            className="cartoon-icon-btn relative"
          >
            <Heart className="w-5 h-5 text-primary" />
            {favorites.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-secondary text-white text-xs font-bold rounded-full border-2 border-outline flex items-center justify-center">
                {favorites.length > 9 ? '9+' : favorites.length}
              </span>
            )}
          </button>

          <button
            onClick={openImportModal}
            className="cartoon-icon-btn"
            title="导入菜谱"
          >
            <Download className="w-5 h-5 text-secondary" />
          </button>

          <button
            onClick={() => navigate('/create')}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-2xl font-bold text-sm border-[3px] border-outline shadow-cartoon-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
          >
            <Plus className="w-4 h-4" />
            写菜谱
          </button>
        </div>
      </div>

      <main className="px-4 py-4 space-y-6">
        <WeeklyPlan />

        <div>
          <h2 className="cartoon-section-title">
            <span className="cartoon-section-bar">🍽️</span>
            分类浏览
          </h2>
          <CategoryNav categories={categoriesWithCounts} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-4 py-4 border-b-[3px] border-outline bg-accent/20">
            <h2 className="font-cartoon text-lg text-text-primary flex items-center gap-2">
              <span className="cartoon-section-bar">📖</span>
              珍藏阁 · 全部菜单
            </h2>
            <button
              onClick={() => navigate('/recipes')}
              className="flex items-center gap-1 text-sm text-primary font-bold hover:animate-wiggle"
            >
              查看全部
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-2 border-b-2 border-outline/20 bg-surface/30">
            <span className="text-sm font-bold text-text-secondary">
              共 {allRecipes.length} 道菜谱 ✨
            </span>
          </div>

          <div className="p-4 space-y-3">
            {displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} compact />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
