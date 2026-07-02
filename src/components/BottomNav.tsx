import { Calendar, Plus, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="cartoon-nav">
      <div className="flex items-center justify-around">
        <button
          onClick={() => navigate('/')}
          className={clsx(
            'flex flex-col items-center gap-1 p-2 rounded-2xl transition-all font-bold',
            isActive('/')
              ? 'text-primary bg-primary/10 border-2 border-outline shadow-cartoon-sm -translate-y-0.5'
              : 'text-text-secondary hover:text-primary'
          )}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-xs">本周计划</span>
        </button>

        <button
          onClick={() => navigate('/create')}
          className="cartoon-fab"
          title="写菜谱"
        >
          <Plus className="w-8 h-8 text-white" strokeWidth={3} />
        </button>

        <button
          onClick={() => navigate('/profile')}
          className={clsx(
            'flex flex-col items-center gap-1 p-2 rounded-2xl transition-all font-bold',
            isActive('/profile')
              ? 'text-primary bg-primary/10 border-2 border-outline shadow-cartoon-sm -translate-y-0.5'
              : 'text-text-secondary hover:text-primary'
          )}
        >
          <User className="w-6 h-6" />
          <span className="text-xs">我的</span>
        </button>
      </div>
    </nav>
  );
}
