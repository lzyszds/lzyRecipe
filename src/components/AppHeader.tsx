import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CaretDown,
  Check,
  ForkKnife,
  NotePencil,
  Plus,
  ShoppingBag,
  X,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { BottomSheet } from './ui/BottomSheet';
import { APP_NAME } from '../lib/appBrand';
import { useAllRecipes } from '../lib/recipes';
import { useFavoritesStore } from '../store/favoritesStore';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { useWeeklyPlanStore } from '../store/weeklyPlanStore';
import { aggregatePlanIngredients } from '../lib/weeklyPlan';
import { UI_ICON_WEIGHT } from '../lib/icons';

/** 顶部全局导航头：品牌入口 + 采购单（对应网页稿 header） */
export function AppHeader() {
  const navigate = useNavigate();
  const allRecipes = useAllRecipes();
  const favorites = useFavoritesStore((s) => s.favorites);
  const importedCount = useImportedRecipesStore((s) => s.importedRecipes.length);
  const { plans, ensureCurrentWeek } = useWeeklyPlanStore();

  const [cartOpen, setCartOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [extraItems, setExtraItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    ensureCurrentWeek();
  }, [ensureCurrentWeek]);

  const shoppingList = useMemo(
    () => aggregatePlanIngredients(plans, allRecipes),
    [plans, allRecipes]
  );

  const items = useMemo(
    () => [
      ...shoppingList.map((item) => ({
        key: item.name,
        name: item.name,
        amount: item.details || '适量',
      })),
      ...extraItems.map((name) => ({ key: `extra-${name}`, name, amount: '自购' })),
    ],
    [shoppingList, extraItems]
  );

  const checkedCount = items.filter((item) => checked[item.key]).length;
  const progress = items.length ? Math.round((checkedCount / items.length) * 100) : 0;
  const pending = items
    .filter((item) => !checked[item.key])
    .concat(items.filter((item) => checked[item.key]));

  const addExtra = () => {
    const name = draft.trim();
    if (!name) return;
    setExtraItems((prev) => [...prev, name]);
    setDraft('');
  };

  const clearPurchased = () => {
    setChecked({});
  };

  return (
    <>
      <header className="page-header !border-b-0">
        <div className="page-container py-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 min-w-0 active:opacity-75 transition text-left"
          >
            <span className="w-8 h-8 rounded-lg bg-apricot-500 text-white flex items-center justify-center shadow-cozy-sm flex-shrink-0">
              <ForkKnife size={16} weight="bold" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1">
                <span className="text-sm font-bold text-cocoa-900 leading-none truncate">
                  {APP_NAME}
                </span>
                <CaretDown size={13} weight={UI_ICON_WEIGHT} className="text-cocoa-400 shrink-0" />
              </span>
              <span className="text-[10px] text-cocoa-400 block mt-1 truncate">
                收藏 {favorites.length} · 导入 {importedCount} · 设置
              </span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/notes')}
            aria-label="笔记"
            title="笔记"
            className="w-8 h-8 rounded-lg bg-white border border-oat-200/70 card-shadow flex items-center justify-center text-apricot-500 active:scale-95 transition flex-shrink-0"
          >
            <NotePencil size={14} weight={UI_ICON_WEIGHT} />
          </button>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="h-8 px-3 rounded-lg bg-white border border-oat-200/70 card-shadow flex items-center gap-1.5 active:scale-95 transition flex-shrink-0"
          >
            <ShoppingBag size={14} weight={UI_ICON_WEIGHT} className="text-apricot-500" />
            <span className="text-xs font-semibold text-cocoa-900">采购单</span>
            <span className="px-1.5 py-0.5 rounded bg-apricot-100 text-apricot-600 text-[10px] font-bold leading-none">
              {checkedCount}/{items.length}
            </span>
          </button>
          </div>
        </div>
      </header>

      <BottomSheet
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        title="本周合并采购单"
        description={`已购 ${checkedCount} / ${items.length} 项 · 点击条目即可打钩复选`}
        bodyClassName="space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 h-1.5 bg-oat-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-apricot-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={clearPurchased}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-oat-200 text-[11px] text-cocoa-700 font-medium"
          >
            重置勾选
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-xs text-cocoa-400 py-10">
            安排三餐后，这里会自动汇总本周食材
          </p>
        ) : (
          <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-0.5">
            {pending.map((item) => {
              const done = Boolean(checked[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setChecked((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                  }
                  className={clsx(
                    'w-full p-3 rounded-xl border flex items-center justify-between gap-3 text-left transition',
                    done
                      ? 'bg-oat-100/60 border-oat-100 opacity-60'
                      : 'bg-white border-oat-200/80 card-shadow'
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={clsx(
                        'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition',
                        done
                          ? 'bg-apricot-500 text-white'
                          : 'border border-cocoa-400 bg-white text-transparent'
                      )}
                    >
                      <Check size={10} weight="bold" />
                    </span>
                    <span
                      className={clsx(
                        'text-xs font-semibold truncate',
                        done ? 'line-through text-cocoa-400' : 'text-cocoa-900'
                      )}
                    >
                      {item.name}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      'text-[11px] font-medium shrink-0',
                      done ? 'text-cocoa-400' : 'text-apricot-600'
                    )}
                  >
                    {item.amount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addExtra();
            }}
            placeholder="添加其他需购买食材（如：小葱 1把）"
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={addExtra}
            className="px-3.5 py-2 rounded-xl bg-apricot-500 text-white text-xs font-semibold shrink-0 flex items-center gap-1"
          >
            <Plus size={13} weight="bold" />
            添加
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

/** 抽屉右上角的统一关闭按钮（供其它组件复用，避免重复样式） */
export function SheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="关闭"
      className="w-7 h-7 rounded-lg bg-white border border-oat-200 flex items-center justify-center text-cocoa-400"
    >
      <X size={14} weight={UI_ICON_WEIGHT} />
    </button>
  );
}
