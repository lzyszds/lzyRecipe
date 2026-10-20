import { CaretRight } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useWeeklyPlanStore } from '../store/weeklyPlanStore';
import { countPlanMeals } from '../lib/weeklyPlan';
import { useUIStore } from '../store/uiStore';
import { AppLogo, APP_NAME, APP_TAGLINE } from '../components/AppLogo';
import { AppIcons, AppIcon, UI_ICON_WEIGHT } from '../lib/icons';

export function Profile() {
  const navigate = useNavigate();
  const favorites = useFavoritesStore((s) => s.favorites);
  const importedRecipes = useImportedRecipesStore((s) => s.importedRecipes);
  const plans = useWeeklyPlanStore((s) => s.plans);
  const openImportModal = useUIStore((s) => s.openImportModal);

  const { planned: plannedCount } = countPlanMeals(plans);

  const menuItems = [
    { label: '本周烹饪计划', value: `${plannedCount} 餐`, icon: AppIcons.weeklyPlan, onClick: () => navigate('/weekly-plan') },
    { label: '我的收藏', value: `${favorites.length} 道`, icon: AppIcons.favorite, onClick: () => navigate('/favorites') },
    { label: '我的导入', value: `${importedRecipes.length} 道`, icon: AppIcons.imported, onClick: () => navigate('/imported') },
    { label: '导入菜谱', value: '', icon: AppIcons.importFile, onClick: openImportModal },
    { label: '设置', value: '', icon: AppIcons.settings, onClick: () => navigate('/settings') },
    { label: '帮助与反馈', value: '', icon: AppIcons.help, onClick: () => navigate('/help') },
  ];

  return (
    <div className="page-container pb-6">
      <div className="pt-3 pb-4">
        <h1 className="text-lg font-bold text-text-primary">个人中心</h1>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-card grid grid-cols-3 text-center divide-x divide-neutral-100 mb-5">
        {[
          { value: favorites.length, label: '收藏菜谱', highlight: false },
          { value: importedRecipes.length, label: '我的导入', highlight: false },
          { value: plannedCount, label: '本周计划', highlight: true },
        ].map((stat) => (
          <div key={stat.label}>
            <div
              className={clsx(
                'text-xl font-bold',
                stat.highlight ? 'text-primary' : 'text-text-primary'
              )}
            >
              {stat.value}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl overflow-hidden shadow-card divide-y divide-neutral-100 mb-5">
        {menuItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="w-full flex items-center gap-3 px-4 min-h-[3.25rem] text-left transition-colors hover:bg-surface/60 active:bg-surface"
          >
            <AppIcon
              icon={item.icon}
              size={18}
              weight="regular"
              className="text-neutral-400 flex-shrink-0"
            />
            <span className="flex-1 text-sm font-medium text-text-primary">
              {item.label}
            </span>
            {item.value && (
              <span className="text-[11px] text-text-secondary">{item.value}</span>
            )}
            <CaretRight
              size={15}
              weight={UI_ICON_WEIGHT}
              className="text-neutral-300 flex-shrink-0"
            />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2.5 py-4">
        <AppLogo size={28} />
        <div>
          <p className="text-xs font-medium text-text-primary leading-none">{APP_NAME}</p>
          <p className="text-[10px] text-text-secondary mt-1">{APP_TAGLINE}</p>
        </div>
      </div>
    </div>
  );
}
