import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-cozy-primary hover:bg-primary-light',
  secondary: 'bg-white text-text-primary shadow-cozy-sm hover:bg-neutral-50',
  ghost: 'bg-transparent text-text-secondary shadow-none hover:bg-neutral-100/70',
  danger: 'bg-red-50 text-red-500 hover:bg-red-100',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'btn',
        size === 'sm' ? 'btn-sm' : 'btn-md',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
