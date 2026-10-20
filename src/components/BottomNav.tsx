import { CalendarBlank, GridFour, House, User } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { UI_ICON_WEIGHT } from '../lib/icons';

const TABS = [
  { path: '/', label: '首页', icon: House },
  { path: '/recipes', label: '分类', icon: GridFour },
  { path: '/weekly-plan', label: '周计划', icon: CalendarBlank },
  { path: '/profile', label: '我的', icon: User },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav-shell" aria-label="主导航">
      <div className="bottom-nav-bar">
        {TABS.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={clsx('bottom-nav-item', active && 'bottom-nav-item--active')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                size={22}
                weight={active ? 'fill' : UI_ICON_WEIGHT}
                className="transition-colors"
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
