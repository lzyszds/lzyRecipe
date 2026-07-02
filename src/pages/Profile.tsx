import { Heart, Download, Settings, HelpCircle, ChevronRight, User, FileJson } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useWeeklyPlanStore } from '../store/weeklyPlanStore';
import { useUIStore } from '../store/uiStore';

export function Profile() {
  const navigate = useNavigate();
  const favorites = useFavoritesStore((s) => s.favorites);
  const importedRecipes = useImportedRecipesStore((s) => s.importedRecipes);
  const plans = useWeeklyPlanStore((s) => s.plans);
  const openImportModal = useUIStore((s) => s.openImportModal);

  const plannedCount = plans.filter((p) => p.recipeId).length;

  const menuItems = [
    { icon: Heart, label: '我的收藏', value: `${favorites.length} 道`, emoji: '❤️', onClick: () => navigate('/favorites') },
    { icon: Download, label: '我的导入', value: `${importedRecipes.length} 道`, emoji: '📥', onClick: () => navigate('/imported') },
    { icon: FileJson, label: '导入菜谱', value: '', emoji: '📋', onClick: openImportModal },
    { icon: Settings, label: '设置', value: '', emoji: '⚙️', onClick: () => navigate('/settings') },
    { icon: HelpCircle, label: '帮助与反馈', value: '', emoji: '💬', onClick: () => navigate('/help') },
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="relative px-6 pt-12 pb-10 text-white overflow-hidden border-b-[3px] border-outline bg-gradient-to-br from-primary via-primary-light to-secondary">
        <div className="absolute -top-6 -right-6 text-8xl opacity-20 rotate-12">🍳</div>
        <div className="absolute bottom-4 left-4 text-5xl opacity-20 -rotate-12">🥘</div>

        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-3xl border-[3px] border-outline shadow-cartoon flex items-center justify-center">
            <User className="w-8 h-8 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-cartoon text-2xl">菜谱达人 🌟</h1>
            <p className="text-white/90 text-sm mt-1 font-bold">热爱美食，享受烹饪~</p>
          </div>
        </div>

        <div className="relative flex justify-around mt-8 bg-white rounded-3xl py-4 border-[3px] border-outline shadow-cartoon">
          <div className="text-center">
            <p className="text-2xl font-cartoon text-primary">{favorites.length}</p>
            <p className="text-xs text-text-secondary font-bold">收藏菜谱</p>
          </div>
          <div className="w-[3px] bg-outline/20 rounded-full" />
          <div className="text-center">
            <p className="text-2xl font-cartoon text-secondary">{importedRecipes.length}</p>
            <p className="text-xs text-text-secondary font-bold">导入菜谱</p>
          </div>
          <div className="w-[3px] bg-outline/20 rounded-full" />
          <div className="text-center">
            <p className="text-2xl font-cartoon text-primary-dark">{plannedCount}</p>
            <p className="text-xs text-text-secondary font-bold">本周计划</p>
          </div>
        </div>
      </div>

      <div className="card mx-4 -mt-5 relative z-10">
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full flex items-center px-4 py-4 gap-3 transition-all hover:bg-accent/20 hover:-translate-x-0.5 ${
              index !== menuItems.length - 1 ? 'border-b-2 border-outline/15' : ''
            }`}
          >
            <span className="w-10 h-10 rounded-2xl bg-surface border-2 border-outline shadow-cartoon-sm flex items-center justify-center text-lg">
              {item.emoji}
            </span>
            <span className="flex-1 text-left text-text-primary font-bold">
              {item.label}
            </span>
            {item.value && (
              <span className="cartoon-badge bg-secondary/20 text-text-secondary">{item.value}</span>
            )}
            <ChevronRight className="w-5 h-5 text-text-secondary/50" strokeWidth={2.5} />
          </button>
        ))}
      </div>
    </div>
  );
}
