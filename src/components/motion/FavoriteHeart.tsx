import { Heart } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { IconButton } from '../ui/IconButton';
import { UI_ICON_WEIGHT } from '../../lib/icons';

interface FavoriteHeartProps {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

export function FavoriteHeart({ active, onClick, className }: FavoriteHeartProps) {
  return (
    <IconButton
      icon={
        <Heart
          size={20}
          weight={active ? 'fill' : UI_ICON_WEIGHT}
          className={clsx(
            'transition-colors duration-150',
            active ? 'text-red-400' : 'text-text-secondary'
          )}
        />
      }
      label={active ? '取消收藏' : '收藏'}
      tone={active ? 'primary' : 'default'}
      onClick={onClick}
      className={className}
    />
  );
}
