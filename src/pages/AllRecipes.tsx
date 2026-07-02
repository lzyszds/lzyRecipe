import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RecipeCard } from '../components/RecipeCard';
import { useAllRecipes } from '../lib/recipes';

export function AllRecipes() {
  const navigate = useNavigate();
  const allRecipes = useAllRecipes();

  return (
    <div className="min-h-screen">
      <Header title="全部菜单" showBack showFavorites />

      <main className="px-4 py-6">
        <p className="text-text-secondary mb-6">共 {allRecipes.length} 道菜谱</p>
        <div className="space-y-4">
          {allRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} compact />
          ))}
        </div>
        {allRecipes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-secondary mb-4">暂无菜谱</p>
            <button onClick={() => navigate('/create')} className="btn-primary">
              写第一个菜谱
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
