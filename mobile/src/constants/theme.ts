import { Platform } from 'react-native';

export const Palette = {
  oat: {
    50: '#FCF9F5', // 全局底色
    100: '#F4EFE8', // 卡片/容器底色
    200: '#E6DEC3', // 边框线
  },
  apricot: {
    50: '#FFF8F3',
    100: '#FCEBDF',
    200: '#F7D4BC',
    400: '#EDA174',
    500: '#E58A54', // 品牌主色
    600: '#D1743E',
  },
  cocoa: {
    900: '#332B26', // 主标题
    700: '#544840', // 正文
    400: '#9A8C82', // 辅助提示
    200: '#D5CBC3',
  },
  card: '#FFFFFF',
};

export const Colors = {
  light: {
    text: Palette.cocoa[900],
    textSecondary: Palette.cocoa[400],
    textMuted: Palette.cocoa[700],
    background: Palette.oat[50],
    backgroundElement: Palette.oat[100],
    backgroundSelected: Palette.apricot[100],
    primary: Palette.apricot[500],
    card: Palette.card,
    border: Palette.oat[200],
  },
  dark: {
    text: '#F5EFEB',
    textSecondary: '#A89E96',
    textMuted: '#D0C6BE',
    background: '#1F1A17',
    backgroundElement: '#2C2522',
    backgroundSelected: '#4A3428',
    primary: Palette.apricot[500],
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
