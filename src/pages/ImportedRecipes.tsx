import { useNavigate } from 'react-router-dom';
import { Plus, Trash, TrayArrowDown } from '@phosphor-icons/react';
import { RecipeCard } from '../components/RecipeCard';
import { PageHeader } from '../components/ui/PageHeader';
import { PageMain, EmptyState } from '../components/ui/PageLayout';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useUIStore } from '../store/uiStore';
import { UI_ICON_WEIGHT } from '../lib/icons';

export function ImportedRecipes() {
  const navigate = useNavigate();
  const { importedRecipes, clearImportedRecipes, removeImportedRecipe } = useImportedRecipesStore();
  const openImportModal = useUIStore((s) => s.openImportModal);

  return (
    <div>
      <PageHeader
        title="我的导入"
        showBack
        actions={
          <>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} weight={UI_ICON_WEIGHT} />}
              onClick={openImportModal}
            >
              导入
            </Button>
            {importedRecipes.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash size={16} weight={UI_ICON_WEIGHT} />}
                onClick={() => {
                  if (confirm('确定要清空所有导入的菜谱吗？')) {
                    clearImportedRecipes();
                  }
                }}
              >
                清空
              </Button>
            )}
          </>
        }
      />

      <PageMain>
        {importedRecipes.length === 0 ? (
          <EmptyState
            icon={<TrayArrowDown size={36} weight="duotone" />}
            title="暂无导入的菜谱"
            description="导入 JSON 菜谱，或手动创建新菜谱"
            actions={
              <>
                <Button variant="primary" onClick={openImportModal}>
                  导入菜谱
                </Button>
                <Button variant="secondary" onClick={() => navigate('/create')}>
                  写菜谱
                </Button>
              </>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {importedRecipes.map((recipe) => (
              <div key={recipe.id} className="relative">
                <RecipeCard recipe={recipe} compact hideFavorite />
                <div className="absolute top-1/2 -translate-y-1/2 right-3 z-20">
                  <IconButton
                    icon={<Trash size={16} weight={UI_ICON_WEIGHT} className="text-red-500" />}
                    label={`删除 ${recipe.name}`}
                    onClick={() => {
                      if (confirm(`确定删除「${recipe.name}」吗？`)) {
                        removeImportedRecipe(recipe.id);
                      }
                    }}
                    className="!w-8 !h-8"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </PageMain>
    </div>
  );
}
