import { ArrowLeft, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showFavorites?: boolean;
  className?: string;
}

export function Header({
  title = '菜谱应用',
  showBack = false,
  showFavorites = false,
  className,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={clsx('cartoon-header', className)}
      style={{ top: 'var(--safe-top)' }}
    >
      <div className="max-w-6xl mx-auto h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="cartoon-icon-btn -ml-1"
              aria-label="返回"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={2.5} />
            </button>
          )}
          <h1 className="font-cartoon text-xl text-text-primary">
            {title}
          </h1>
        </div>

        {showFavorites && (
          <button
            onClick={() => navigate('/favorites')}
            className="cartoon-icon-btn -mr-1"
            aria-label="收藏"
          >
            <Heart className="w-5 h-5 text-primary" />
          </button>
        )}
      </div>
    </header>
  );
}
