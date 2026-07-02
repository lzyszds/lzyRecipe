import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  generateCanvasCover,
  getRecipeDisplayCover,
  isDefaultCoverImage,
} from '../lib/coverImage';

interface RecipeCoverImageProps {
  name: string;
  coverImage: string;
  category?: string;
  alt?: string;
  className?: string;
}

export function RecipeCoverImage({
  name,
  coverImage,
  category,
  alt,
  className,
}: RecipeCoverImageProps) {
  const [src, setSrc] = useState(() => {
    if (!isDefaultCoverImage(coverImage)) return coverImage;
    if (coverImage.startsWith('/covers/')) return coverImage;
    return generateCanvasCover(name, category);
  });

  useEffect(() => {
    let cancelled = false;

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
  }, [name, coverImage, category]);

  return (
    <img
      src={src}
      alt={alt ?? name}
      className={clsx(className)}
      loading="lazy"
    />
  );
}
