import { CaretRight } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useWeeklyPlanStore } from '../store/weeklyPlanStore';
import { countPlanMeals } from '../lib/weeklyPlan';
import { useUIStore } from '../store/uiStore';
import { AppLogo, APP_NAME, APP_TAGLINE } from '../components/AppLogo';
import { AppHeader } from '../components/AppHeader';
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
    { label: '笔记', value: '', icon: AppIcons.notes, onClick: () => navigate('/notes') },
    { label: '设置', value: '', icon: AppIcons.settings, onClick: () => navigate('/settings') },
    { label: '帮助与反馈', value: '', icon: AppIcons.help, onClick: () => navigate('/help') },
  ];

  return (
    <div>
      <AppHeader />

      <main className="page-main pb-6 space-y-3">
        <section className="bg-white rounded-xl p-4 card-shadow border border-oat-100 flex items-center gap-3">
          <AppLogo size={44} className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-cocoa-900 leading-none">{APP_NAME}</h1>
            <p className="text-[11px] text-cocoa-400 mt-1.5">{APP_TAGLINE}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-2.5 py-1 rounded-lg bg-oat-50 border border-oat-100 text-[11px] font-medium text-cocoa-700"
          >
            设置
          </button>
        </section>

        <section className="bg-white rounded-xl p-3 card-shadow border border-oat-100 grid grid-cols-3 text-center divide-x divide-oat-100">
          {[
            { value: favorites.length, label: '收藏', highlight: true },
            { value: importedRecipes.length, label: '导入', highlight: false },
            { value: plannedCount, label: '本周已排', highlight: false },
          ].map((stat) => (
            <div key={stat.label} className="py-1">
              <div
                className={
                  stat.highlight
                    ? 'text-base font-bold text-apricot-500'
                    : 'text-base font-bold text-cocoa-900'
                }
              >
                {stat.value}
              </div>
              <div className="text-[10px] text-cocoa-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-xl overflow-hidden card-shadow border border-oat-100 divide-y divide-oat-100/70">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="w-full flex items-center gap-2.5 px-3.5 min-h-[3rem] text-left transition-colors hover:bg-oat-50/70 active:bg-oat-100/60"
            >
              <span className="w-7 h-7 rounded-lg bg-oat-50 border border-oat-100 flex items-center justify-center flex-shrink-0">
                <AppIcon
                  icon={item.icon}
                  size={15}
                  weight={UI_ICON_WEIGHT}
                  className="text-apricot-500"
                />
              </span>
              <span className="flex-1 text-xs font-medium text-cocoa-900">
                {item.label}
              </span>
              {item.value && (
                <span className="text-[11px] text-cocoa-400">{item.value}</span>
              )}
              <CaretRight
                size={13}
                weight={UI_ICON_WEIGHT}
                className="text-cocoa-200 flex-shrink-0"
              />
            </button>
          ))}
        </section>

        <p className="text-center text-[10px] text-cocoa-400 pt-2">
          {APP_NAME} · {APP_TAGLINE}
        </p>
      </main>
    </div>
  );
}
