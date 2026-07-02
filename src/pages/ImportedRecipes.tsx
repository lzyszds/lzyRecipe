import { useNavigate } from 'react-router-dom';
import { RecipeCard } from '../components/RecipeCard';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useUIStore } from '../store/uiStore';
import { Trash2, Import, ArrowLeft, Plus } from 'lucide-react';

export function ImportedRecipes() {
  const navigate = useNavigate();
  const { importedRecipes, clearImportedRecipes, removeImportedRecipe } = useImportedRecipesStore();
  const openImportModal = useUIStore((s) => s.openImportModal);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-50 px-4 pt-4 pb-3 border-b border-surface/30" style={{ top: 'var(--safe-top)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-xl hover:bg-surface/50 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-text-primary" />
            </button>
            <h1 className="font-serif text-xl font-semibold text-text-primary">我的导入</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openImportModal}
              className="flex items-center gap-1 px-3 py-1.5 text-primary hover:bg-primary/5 rounded-lg transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              导入
            </button>
            {importedRecipes.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('确定要清空所有导入的菜谱吗？')) {
                    clearImportedRecipes();
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="px-4 py-6">
        {importedRecipes.length === 0 ? (
          <div className="text-center py-20">
            <Import className="w-16 h-16 mx-auto mb-4 text-text-secondary/50" />
            <p className="text-text-secondary mb-2">暂无导入的菜谱</p>
            <p className="text-sm text-text-secondary/70 mb-6">
              导入 JSON 菜谱或手动写菜谱
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={openImportModal} className="btn-primary">
                导入菜谱
              </button>
              <button onClick={() => navigate('/create')} className="btn-secondary">
                写菜谱
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {importedRecipes.map((recipe) => (
              <div key={recipe.id} className="relative">
                <RecipeCard recipe={recipe} compact />
                <button
                  onClick={() => {
                    if (confirm(`确定删除「${recipe.name}」吗？`)) {
                      removeImportedRecipe(recipe.id);
                    }
                  }}
                  className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-red-50 text-red-500 rounded-full shadow-sm transition-colors z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
