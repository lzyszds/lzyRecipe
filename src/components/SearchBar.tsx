import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { IconButton } from './ui/IconButton';
import { UI_ICON_WEIGHT } from '../lib/icons';

interface SearchBarProps {
  defaultValue?: string;
  className?: string;
  placeholder?: string;
}

export function SearchBar({ defaultValue = '', className, placeholder = '搜索菜谱...' }: SearchBarProps) {
  const [keyword, setKeyword] = useState(defaultValue);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(keyword.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className={clsx('relative', className)}>
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-11 pr-11 rounded-2xl shadow-cozy-sm"
      />
      <MagnifyingGlass
        size={18}
        weight={UI_ICON_WEIGHT}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
      />
      {keyword && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <IconButton
            icon={<X size={16} weight={UI_ICON_WEIGHT} className="text-text-secondary" />}
            label="清除"
            onClick={() => setKeyword('')}
            className="!w-8 !h-8 !shadow-none !bg-transparent"
          />
        </div>
      )}
    </form>
  );
}
