import { Heart, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecipeCard } from '../components/RecipeCard';
import { useFavoritesStore } from '../store/favoritesStore';
import { recipes } from '../data/recipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';

export function Favorites() {
  const navigate = useNavigate();
  const { favorites, removeFavorite } = useFavoritesStore();
  const importedRecipes = useImportedRecipesStore((s) => s.importedRecipes);
  const allRecipes = [...recipes, ...importedRecipes];
  const favoriteRecipes = allRecipes.filter((r) => favorites.includes(r.id));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="cartoon-header" style={{ top: 'var(--safe-top)' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="cartoon-icon-btn -ml-1"
          >
            <ArrowLeft className="w-6 h-6 text-text-primary" strokeWidth={2.5} />
          </button>
          <h1 className="font-cartoon text-xl text-text-primary">我的收藏 ❤️</h1>
        </div>
      </div>

      <main className="px-4 py-6">
        {favoriteRecipes.length > 0 ? (
          <div className="space-y-4">
            {favoriteRecipes.map((recipe) => (
              <div key={recipe.id} className="relative">
                <RecipeCard recipe={recipe} compact />
                <button
                  onClick={() => removeFavorite(recipe.id)}
                  className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-sm
                           hover:bg-white hover:text-red-500 transition-colors z-10"
                  aria-label="取消收藏"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-4 bg-surface rounded-3xl border-[3px] border-outline shadow-cartoon flex items-center justify-center">
              <Heart className="w-12 h-12 text-primary" />
            </div>
            <p className="font-cartoon text-text-primary text-xl mb-2">
              还没有收藏任何菜谱
            </p>
            <p className="text-text-secondary/70 text-sm">
              点击菜谱详情页的心形图标即可收藏
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
