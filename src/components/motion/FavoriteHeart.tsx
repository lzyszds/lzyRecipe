import { Heart } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { IconButton } from '../ui/IconButton';
import { UI_ICON_WEIGHT } from '../../lib/icons';

interface FavoriteHeartProps {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  size?: number;
}

export function FavoriteHeart({ active, onClick, className, size = 15 }: FavoriteHeartProps) {
  return (
    <IconButton
      icon={
        <Heart
          size={size}
          weight={active ? 'fill' : UI_ICON_WEIGHT}
          className={clsx(
            'transition-colors duration-150',
            active ? 'text-apricot-500' : 'text-cocoa-200'
          )}
        />
      }
      label={active ? '取消收藏' : '收藏'}
      onClick={onClick}
      className={clsx('!bg-white/90 backdrop-blur-md !border-oat-200/60', className)}
    />
  );
}
