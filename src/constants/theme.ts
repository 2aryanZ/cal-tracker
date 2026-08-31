import { Platform } from 'react-native';

export const PALETTE = {
  50: '#F4F9F8',
  100: '#DAEDEB',
  200: '#B4DBD8',
  300: '#88C2BF',
  400: '#5EA3A2',
  500: '#448888',
  600: '#346C6D',
  700: '#2D5758',
  800: '#274748',
  900: '#243C3D',
  950: '#102123',
  white: '#FFFFFF',
};

export const FONTS = {
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, "Times New Roman", serif',
  }),
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, sans-serif',
  }),
  mono: Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'Courier, monospace',
  }),
};

export const Fonts = FONTS;

export const Spacing = {
  half: 4,
  one: 8,
  two: 16,
  three: 24,
  four: 32,
  five: 40,
  six: 48,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export type ThemeColor =
  | 'text'
  | 'textSecondary'
  | 'background'
  | 'backgroundElement'
  | 'backgroundSelected'
  | 'tint'
  | 'icon'
  | 'tabIconDefault'
  | 'tabIconSelected';

export const Colors = {
  light: {
    text: PALETTE[950],
    textSecondary: PALETTE[600],
    background: PALETTE[50],
    backgroundElement: PALETTE[100],
    backgroundSelected: PALETTE[200],
    tint: PALETTE[950],
    icon: PALETTE[600],
    tabIconDefault: PALETTE[400],
    tabIconSelected: PALETTE[950],
  },
  dark: {
    text: PALETTE[50],
    textSecondary: PALETTE[300],
    background: PALETTE[950],
    backgroundElement: PALETTE[900],
    backgroundSelected: PALETTE[800],
    tint: PALETTE[100],
    icon: PALETTE[300],
    tabIconDefault: PALETTE[600],
    tabIconSelected: PALETTE[100],
  },
};
