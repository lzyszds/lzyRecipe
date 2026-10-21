import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
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
    <form onSubmit={handleSearch} className={clsx('relative flex-1', className)}>
      <MagnifyingGlass
        size={15}
        weight={UI_ICON_WEIGHT}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-400 pointer-events-none"
      />
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={placeholder}
        className="input-field !bg-white pl-9 pr-9"
      />
      {keyword && (
        <button
          type="button"
          onClick={() => setKeyword('')}
          aria-label="清除"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-cocoa-400 hover:bg-oat-100 transition"
        >
          <X size={13} weight={UI_ICON_WEIGHT} />
        </button>
      )}
    </form>
  );
}
