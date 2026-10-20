import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface PageMainProps {
  children: ReactNode;
  className?: string;
}

export function PageMain({ children, className }: PageMainProps) {
  return <main className={clsx('page-main', className)}>{children}</main>;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {actions && <div className="empty-state-actions">{actions}</div>}
    </div>
  );
}
