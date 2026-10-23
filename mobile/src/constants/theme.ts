import { Platform } from 'react-native';

export const Palette = {
  // 一体化燕麦暖画布与托盘
  canvas: '#F5F2EB', // 统一底层燕麦暖画布
  sheet: '#FDFBF7', // 右侧主内容托盘底色
  cardBg: '#FFFFFF', // 卡片纯白

  // 焦糖柿子橙（主强调色）
  primary: '#D96B38',
  primarySoft: '#FCEEE6',

  // 难度与状态配色
  sage: '#4E7D63', // 简单难度/健康
  sageSoft: '#EAF3EE',
  amberWarm: '#C87D28', // 家常难度
  amberSoft: '#FDF4E7',
  roseWarm: '#C4514B', // 进阶难度/收藏
  roseSoft: '#FDECEB',

  // 炭棕文字系统
  ink: '#26211E', // 深炭棕主文字
  inkMuted: '#857C74', // 柔和次级文字
  inkLight: '#B5ACA4', // 弱化辅助文字
  tagWarm: '#F3EFE8', // 食材微胶囊底色

  // 底部灵动岛
  dockBg: 'rgba(34, 30, 28, 0.94)',
  dockBorder: 'rgba(255, 255, 255, 0.12)',

  // 兼容旧属性映射
  honey: {
    500: '#E6A84A',
  },
  sand: {
    100: '#F5EBE1',
  },
  oat: {
    50: '#F5F2EB', // 统一为 canvas
    100: '#F3EFE8',
    200: '#E7DFD4',
  },
  apricot: {
    50: '#FDF7F2',
    100: '#FCEEE6',
    200: '#F7D4BC',
    400: '#EDA174',
    500: '#D96B38', // 主色
    600: '#C25725',
  },
  cocoa: {
    900: '#26211E',
    700: '#4E433D',
    400: '#857C74',
    200: '#D5CBC3',
  },
  card: '#FFFFFF',
};

export const Radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const Typography = {
  titleLarge: { fontSize: 20, fontWeight: '800' as const },
  titleMedium: { fontSize: 16, fontWeight: '700' as const },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, color: Palette.inkMuted },
} as const;

export const Colors = {
  light: {
    text: Palette.ink,
    textSecondary: Palette.inkMuted,
    textMuted: Palette.inkMuted,
    background: Palette.canvas,
    backgroundElement: Palette.tagWarm,
    backgroundSelected: Palette.primarySoft,
    primary: Palette.primary,
    card: Palette.cardBg,
    border: '#EAE2D7',
  },
  dark: {
    text: '#F5EFEB',
    textSecondary: '#A89E96',
    textMuted: '#D0C6BE',
    background: '#1F1A17',
    backgroundElement: '#2C2522',
    backgroundSelected: '#4A3428',
    primary: Palette.primary,
    card: '#29221E',
    border: '#3D342E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 88, android: 88 }) ?? 88;
export const MaxContentWidth = 800;
