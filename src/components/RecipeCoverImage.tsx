import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  generateCanvasCover,
  getRecipeDisplayCover,
  isDefaultCoverImage,
} from '../lib/coverImage';
import { useRecipeCoverOverridesStore } from '../store/recipeCoverOverridesStore';

interface RecipeCoverImageProps {
  recipeId?: string;
  name: string;
  coverImage: string;
  category?: string;
  alt?: string;
  className?: string;
  /** 详情页首屏封面：立即加载，避免 lazy 引发滚动跳动 */
  priority?: boolean;
}

export function RecipeCoverImage({
  recipeId,
  name,
  coverImage,
  category,
  alt,
  className,
  priority = false,
}: RecipeCoverImageProps) {
  const coverOverride = useRecipeCoverOverridesStore((s) =>
    recipeId ? s.overrides[recipeId] : undefined
  );
  const resolvedCover = coverOverride ?? coverImage;

  const [src, setSrc] = useState(() => {
    if (!isDefaultCoverImage(resolvedCover)) return resolvedCover;
    if (resolvedCover.startsWith('/covers/')) return resolvedCover;
    return generateCanvasCover(name, category);
  });

  useEffect(() => {
    let cancelled = false;

    if (coverOverride) {
      setSrc(coverOverride);
      return () => {
        cancelled = true;
      };
    }

    getRecipeDisplayCover(name, coverImage).then((url) => {
      if (cancelled) return;
      if (url && !isDefaultCoverImage(url)) {
        setSrc(url);
      } else if (isDefaultCoverImage(coverImage)) {
        setSrc(generateCanvasCover(name, category));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [name, coverImage, category, coverOverride]);

  // React 18 只认小写 fetchpriority，写成 camelCase 会触发“未知属性”警告
  const imgAttrs = { fetchpriority: priority ? 'high' : 'auto' } as Record<string, string>;

  return (
    <img
      src={src}
      alt={alt ?? name}
      className={clsx('block', className)}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      {...imgAttrs}
    />
  );
}
