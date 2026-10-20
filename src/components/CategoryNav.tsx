import { Link } from 'react-router-dom';
import { Category } from '../types';
import { clsx } from 'clsx';

interface CategoryNavProps {
  categories: Category[];
  activeName?: string;
  className?: string;
}

export function CategoryNav({ categories, activeName, className }: CategoryNavProps) {
  return (
    <div className={clsx('overflow-x-auto scrollbar-hide -mx-1', className)}>
      <div className="flex gap-2 min-w-max py-0.5 px-1">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/category/${encodeURIComponent(category.name)}`}
            className={clsx(
              'category-pill',
              activeName === category.name && 'category-pill-active'
            )}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
