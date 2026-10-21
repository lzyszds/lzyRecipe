import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { IconButton } from './IconButton';
import { APP_NAME, APP_TAGLINE } from '../../components/AppLogo';
import { UI_ICON_WEIGHT } from '../../lib/icons';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  showBack = false,
  onBack,
  leading,
  actions,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={clsx('page-header', className)}>
      <div className="page-header-row page-container">
        <div className="page-header-start">
          {showBack && (
            <IconButton
              icon={<ArrowLeft size={18} weight={UI_ICON_WEIGHT} />}
              label="返回"
              onClick={onBack ?? (() => navigate(-1))}
            />
          )}
          {leading}
        </div>
        <h1 className="page-header-title">{title}</h1>
        <div className="page-header-actions">{actions}</div>
      </div>
    </header>
  );
}

interface HomeHeaderProps {
  search: ReactNode;
  actions: ReactNode;
}

export function HomeHeader({ search, actions }: HomeHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-container pt-2 pb-3 space-y-3">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="w-8 h-8 rounded-lg bg-apricot-500 text-white flex items-center justify-center shadow-cozy-sm flex-shrink-0">
              <span className="text-sm font-black">萌</span>
            </span>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-cocoa-900 truncate leading-none">
                {APP_NAME}
              </h1>
              <p className="text-[10px] font-medium text-cocoa-400 mt-1 truncate">
                {APP_TAGLINE}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>
        </div>
        {search}
      </div>
    </header>
  );
}

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ icon, title, action, className }: SectionHeaderProps) {
  return (
    <div className={clsx('section-header', className)}>
      <div className="section-header-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

interface CardHeaderProps {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
  tint?: 'accent' | 'secondary' | 'none';
}

export function CardHeader({ icon, title, action }: CardHeaderProps) {
  return (
    <div className="card-header">
      <div className="section-header-title min-w-0">
        {icon}
        <h2 className="truncate">{title}</h2>
      </div>
      {action}
    </div>
  );
}
