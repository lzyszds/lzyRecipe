import { useNavigate } from 'react-router-dom';
import { PageHeader } from './ui/PageHeader';
import { IconButton } from './ui/IconButton';
import { Heart } from '@phosphor-icons/react';
import { UI_ICON_WEIGHT } from '../lib/icons';

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
    <PageHeader
      title={title}
      showBack={showBack}
      className={className}
      actions={
        showFavorites ? (
          <IconButton
            icon={<Heart size={20} weight={UI_ICON_WEIGHT} className="text-primary" />}
            label="收藏"
            tone="primary"
            onClick={() => navigate('/favorites')}
          />
        ) : undefined
      }
    />
  );
}
