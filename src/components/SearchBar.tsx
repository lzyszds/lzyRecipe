import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

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

  const handleClear = () => {
    setKeyword('');
  };

  return (
    <form onSubmit={handleSearch} className={clsx('relative', className)}>
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-11 pr-10"
      />
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
      {keyword && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-surface rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      )}
    </form>
  );
}
