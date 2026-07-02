import { Link } from 'react-router-dom';
import { Category } from '../types';
import { clsx } from 'clsx';

interface CategoryNavProps {
  categories: Category[];
  className?: string;
}

export function CategoryNav({ categories, className }: CategoryNavProps) {
  return (
    <div className={clsx('overflow-x-auto pb-2 -mx-4 px-4', className)}>
      <div className="flex gap-3 min-w-max">
        {categories.map((category, index) => (
          <Link
            key={category.id}
            to={`/category/${encodeURIComponent(category.name)}`}
            className={clsx(
              'cartoon-category-chip',
              index % 3 === 0 && 'bg-accent/30',
              index % 3 === 1 && 'bg-secondary/20',
              index % 3 === 2 && 'bg-primary/10'
            )}
          >
            <span className="text-3xl">{category.icon}</span>
            <span className="text-sm font-bold text-text-primary">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
