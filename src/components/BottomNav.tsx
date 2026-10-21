import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarBlank,
  FileCode,
  FilePlus,
  Gear,
  Heart,
  Plus,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { BottomSheet } from './ui/BottomSheet';
import { useUIStore } from '../store/uiStore';
import { UI_ICON_WEIGHT } from '../lib/icons';

const TABS = [
  { path: '/', match: ['/', '/recipes'], label: '菜谱库', icon: BookOpen },
  { path: '/weekly-plan', match: ['/weekly-plan'], label: '三餐周历', icon: CalendarBlank },
];

/** 底部悬浮胶囊导航（对应网页稿 dock）：菜谱库 / 新建 / 三餐周历 */
export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const openImportModal = useUIStore((s) => s.openImportModal);
  const [quickOpen, setQuickOpen] = useState(false);

  const go = (path: string) => {
    setQuickOpen(false);
    navigate(path);
  };

  return (
    <>
      <div className="bottom-nav-shell" aria-label="主导航">
        <nav className="bottom-nav-bar">
          {TABS.map(({ path, match, label, icon: Icon }, index) => {
            const active = match.includes(location.pathname);
            return (
              <div key={path} className="contents">
                {index === 1 && (
                  <button
                    type="button"
                    onClick={() => setQuickOpen(true)}
                    aria-label="新建与导入"
                    title="新建与导入"
                    className="bottom-nav-fab"
                  >
                    <Plus size={16} weight="bold" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(path)}
                  className={clsx('bottom-nav-item', active && 'bottom-nav-item--active')}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={16} weight={active ? 'fill' : UI_ICON_WEIGHT} />
                  <span>{label}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      <BottomSheet
        isOpen={quickOpen}
        onClose={() => setQuickOpen(false)}
        title="新建与批量导入"
        bodyClassName="space-y-3"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => go('/create')}
            className="p-3.5 rounded-xl bg-white border border-oat-100 space-y-1.5 text-left active:scale-[0.98] transition"
          >
            <FilePlus size={16} weight={UI_ICON_WEIGHT} className="text-apricot-500" />
            <span className="block text-xs font-bold text-cocoa-900">写新菜谱</span>
            <span className="block text-[10px] text-cocoa-400">支持无图自动生成封面</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setQuickOpen(false);
              openImportModal();
            }}
            className="p-3.5 rounded-xl bg-white border border-oat-100 space-y-1.5 text-left active:scale-[0.98] transition"
          >
            <FileCode size={16} weight={UI_ICON_WEIGHT} className="text-cocoa-700" />
            <span className="block text-xs font-bold text-cocoa-900">JSON 导入</span>
            <span className="block text-[10px] text-cocoa-400">字段校验与 ID 去重</span>
          </button>
          <button
            type="button"
            onClick={() => go('/favorites')}
            className="p-3.5 rounded-xl bg-white border border-oat-100 space-y-1.5 text-left active:scale-[0.98] transition"
          >
            <Heart size={16} weight={UI_ICON_WEIGHT} className="text-apricot-500" />
            <span className="block text-xs font-bold text-cocoa-900">我的收藏</span>
            <span className="block text-[10px] text-cocoa-400">待做的私房菜单</span>
          </button>
          <button
            type="button"
            onClick={() => go('/settings')}
            className="p-3.5 rounded-xl bg-white border border-oat-100 space-y-1.5 text-left active:scale-[0.98] transition"
          >
            <Gear size={16} weight={UI_ICON_WEIGHT} className="text-cocoa-700" />
            <span className="block text-xs font-bold text-cocoa-900">设置</span>
            <span className="block text-[10px] text-cocoa-400">封面策略与数据管理</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
