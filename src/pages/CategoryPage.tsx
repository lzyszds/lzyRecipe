import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { RecipeCard } from '../components/RecipeCard';
import { useAllRecipes } from '../lib/recipes';
import { useFavoritesStore } from '../store/favoritesStore';

export function CategoryPage() {
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const allRecipes = useAllRecipes();
  const favorites = useFavoritesStore((s) => s.favorites);

  const decodedName = decodeURIComponent(name ?? '');
  const categoryRecipes = allRecipes.filter((r) => r.category === decodedName);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-50 px-4 pt-4 pb-3 border-b border-surface/30" style={{ top: 'var(--safe-top)' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-surface/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-text-primary" />
          </button>
          <h1 className="font-serif text-xl font-semibold text-text-primary">{decodedName}</h1>
          <button
            onClick={() => navigate('/favorites')}
            className="relative ml-auto p-2 rounded-xl hover:bg-surface/50 transition-colors"
          >
            <Heart className="w-5 h-5 text-text-secondary" />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                {favorites.length > 9 ? '9+' : favorites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <main className="px-4 py-6">
        {categoryRecipes.length > 0 ? (
          <div className="space-y-4">
            {categoryRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} compact />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-text-secondary mb-4">该分类暂无菜谱</p>
            <button onClick={() => navigate('/recipes')} className="btn-primary">
              浏览全部菜谱
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
