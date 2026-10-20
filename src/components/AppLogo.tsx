import { clsx } from 'clsx';
import { APP_NAME } from '../lib/appBrand';

interface AppLogoProps {
  size?: number;
  className?: string;
  showShadow?: boolean;
}

/** 萌厨食光 Logo */
export function AppLogo({ size = 40, className, showShadow = false }: AppLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={APP_NAME}
      width={size}
      height={size}
      className={clsx(
        'object-cover flex-shrink-0 select-none overflow-hidden rounded-2xl',
        showShadow && 'shadow-card',
        className
      )}
      draggable={false}
    />
  );
}

export { APP_NAME, APP_TAGLINE } from '../lib/appBrand';
