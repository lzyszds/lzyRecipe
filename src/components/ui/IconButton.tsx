import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonTone = 'default' | 'primary' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  tone?: IconButtonTone;
  badge?: ReactNode;
}

const toneClass: Record<IconButtonTone, string> = {
  default: 'btn-icon',
  primary: 'btn-icon btn-icon-primary',
  danger: 'btn-icon btn-icon-danger',
};

export function IconButton({
  icon,
  label,
  tone = 'default',
  badge,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(toneClass[tone], badge && 'relative', className)}
      {...props}
    >
      {icon}
      {badge}
    </button>
  );
}
