import { useSearchParams } from 'react-router-dom';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { PageHeader } from '../components/ui/PageHeader';
import { PageMain, EmptyState } from '../components/ui/PageLayout';
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
    <div>
      <PageHeader title="搜索结果" showBack />

      <PageMain>
        <SearchBar defaultValue={keyword} placeholder="搜索菜谱、食材..." />

        {keyword ? (
          <>
            <p className="text-xs text-text-secondary">
              找到 {results.length} 个与「{keyword}」相关的菜谱
            </p>

            {results.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {results.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MagnifyingGlass size={36} weight="duotone" />}
                title="没有找到相关菜谱"
                description="试试其他关键词，或按食材名称搜索"
              />
            )}
          </>
        ) : (
          <EmptyState
            icon={<MagnifyingGlass size={36} weight="duotone" />}
            title="请输入搜索关键词"
            description="支持菜名、分类和食材搜索"
          />
        )}
      </PageMain>
    </div>
  );
}
