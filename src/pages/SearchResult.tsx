import { useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { RecipeCard } from '../components/RecipeCard';
import { SearchBar } from '../components/SearchBar';
import { recipes } from '../data/recipes';
import { useImportedRecipesStore } from '../store/importedRecipesStore';

export function SearchResult() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') || '';
  const importedRecipes = useImportedRecipesStore((s) => s.importedRecipes);
  const allRecipes = [...recipes, ...importedRecipes];

  const results = keyword
    ? allRecipes.filter(
        (r) =>
          r.name.toLowerCase().includes(keyword.toLowerCase()) ||
          r.description.toLowerCase().includes(keyword.toLowerCase()) ||
          r.category.toLowerCase().includes(keyword.toLowerCase()) ||
          r.ingredients.some((i) =>
            i.name.toLowerCase().includes(keyword.toLowerCase())
          )
      )
    : [];

  return (
    <div className="min-h-screen">
      <Header title="搜索结果" showBack showFavorites />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <SearchBar defaultValue={keyword} />
        </div>

        {keyword ? (
          <>
            <p className="text-text-secondary mb-6">
              找到 {results.length} 个与 "{keyword}" 相关的菜谱
            </p>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {results.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-text-secondary">
                  没有找到包含 "{keyword}" 的菜谱
                </p>
                <p className="text-text-secondary/70 text-sm mt-2">
                  试试其他关键词
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-text-secondary">请输入搜索关键词</p>
          </div>
        )}
      </main>
    </div>
  );
}
