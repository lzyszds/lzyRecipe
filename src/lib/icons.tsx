import type { Icon, IconProps } from '@phosphor-icons/react';
import {
  Pepper,
  CookingPot,
  Fire,
  ForkKnife,
  Pizza,
  IceCream,
  Coffee,
  House,
  Fish,
  Egg,
  BowlFood,
  Knife,
  Carrot,
  Jar,
  BookOpen,
  CalendarBlank,
  GridFour,
  Lightbulb,
  NotePencil,
  ListChecks,
  DownloadSimple,
  Heart,
  TrayArrowDown,
  FileText,
  Gear,
  ChatCircle,
  CookingPot as BrandIcon,
  Sparkle,
  BowlSteam,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';

export type IconWeight = IconProps['weight'];

export const DEFAULT_ICON_WEIGHT: IconWeight = 'duotone';
export const UI_ICON_WEIGHT: IconWeight = 'bold';

/** 分类名 → Phosphor 图标 */
export const CATEGORY_ICONS: Record<string, Icon> = {
  川菜: Pepper,
  粤菜: CookingPot,
  湘菜: Fire,
  鲁菜: ForkKnife,
  西餐: Pizza,
  甜点: IceCream,
  饮品: Coffee,
  家常菜: House,
  海鲜: Fish,
  早餐: Egg,
  汤: BowlSteam,
  肉类: Knife,
  蔬菜: Carrot,
  主食: BowlFood,
  调料: Jar,
};

export function getCategoryIcon(name: string): Icon {
  return CATEGORY_ICONS[name] ?? CookingPot;
}

interface CategoryIconProps {
  name: string;
  size?: number;
  weight?: IconWeight;
  className?: string;
}

export function CategoryIcon({
  name,
  size = 28,
  weight = DEFAULT_ICON_WEIGHT,
  className,
}: CategoryIconProps) {
  const IconComponent = getCategoryIcon(name);
  return <IconComponent size={size} weight={weight} className={className} aria-hidden />;
}

interface IconBoxProps {
  children: React.ReactNode;
  className?: string;
  tint?: 'accent' | 'secondary' | 'primary' | 'white';
}

const tintClass: Record<NonNullable<IconBoxProps['tint']>, string> = {
  accent: 'bg-sage-50 text-primary',
  secondary: 'bg-sage-50 text-primary',
  primary: 'bg-sage-50 text-primary',
  white: 'bg-white text-primary',
};

/** 区块标题 / 菜单项图标容器 */
export function IconBox({ children, className, tint = 'accent' }: IconBoxProps) {
  return (
    <span className={clsx('section-icon', tintClass[tint], className)}>{children}</span>
  );
}

export const AppIcons = {
  brand: BrandIcon,
  categories: GridFour,
  library: BookOpen,
  weeklyPlan: CalendarBlank,
  ingredients: Carrot,
  steps: ListChecks,
  tips: Lightbulb,
  import: DownloadSimple,
  favorite: Heart,
  imported: TrayArrowDown,
  importFile: FileText,
  settings: Gear,
  help: ChatCircle,
  sparkle: Sparkle,
  notes: NotePencil,
};

interface AppIconProps {
  icon: Icon;
  size?: number;
  weight?: IconWeight;
  className?: string;
}

export function AppIcon({ icon: IconComponent, size = 22, weight = DEFAULT_ICON_WEIGHT, className }: AppIconProps) {
  return <IconComponent size={size} weight={weight} className={className} aria-hidden />;
}

/** 在 IconBox 内使用的快捷组件 */
export function SectionIcon({
  icon,
  tint,
  size = 22,
  className,
}: {
  icon: Icon;
  tint?: IconBoxProps['tint'];
  size?: number;
  className?: string;
}) {
  return (
    <IconBox tint={tint} className={className}>
      <AppIcon icon={icon} size={size} />
    </IconBox>
  );
}
