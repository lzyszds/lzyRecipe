import { getLocalCoverPath } from '../lib/coverRegistry';
import { getDishStyle } from '../lib/coverImage';
import { useRecipeCoverOverridesStore } from '../store/recipeCoverOverridesStore';

interface CoverThumbProps {
  recipeId: string;
  name: string;
  coverImage: string;
  category?: string;
  className?: string;
}

/**
 * 列表缩略图：没有真实图片时用纯 CSS 渐变 + emoji 代替 canvas 生成的封面。
 * 弹窗里一次要渲染上百条列表，canvas.toDataURL 每张都会产生几十 KB 的图片数据，
 * 这里只画出同样的配色与图标，避免打开弹窗时主线程被占满。
 */
export function CoverThumb({ recipeId, name, coverImage, category, className }: CoverThumbProps) {
  const override = useRecipeCoverOverridesStore((s) => s.overrides[recipeId]);
  const local = getLocalCoverPath(name);
  const src =
    override ??
    (coverImage.startsWith('/covers/') && !/\/covers\/default\.(svg|png|jpe?g|webp)$/i.test(coverImage)
      ? coverImage
      : local && !/\/covers\/default\.(svg|png|jpe?g|webp)$/i.test(local)
        ? local
        : null);

  if (src) {
    return <img src={src} alt={name} loading="lazy" decoding="async" className={className} />;
  }

  const { emoji, c1, c2 } = getDishStyle(name.trim(), category);
  return (
    <div
      role="img"
      aria-label={name}
      className={className}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <span className="flex h-full w-full items-center justify-center text-lg" aria-hidden>
        {emoji}
      </span>
    </div>
  );
}
