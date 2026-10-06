import { Platform } from 'react-native';

// Tempo: calm surfaces, deep ink and a lime accent for the primary action.
export const JOURNAL = {
  paper: '#F4F6F4', surface: '#FFFFFF', ink: '#152B30', muted: '#64716D',
  accent: '#305948', accentText: '#15392E', line: '#E2E8E4', soft: '#E8EFEA', water: '#345F72',
  lime: '#D1FA7A', onDark: '#C9D8CE', darkTrack: '#3E5454', selected: '#ECF5DF',
  protein: '#527861', carbs: '#A88B36', fats: '#A35F43',
  error: '#A44331', canvas: '#E5E9E3', scrim: 'rgba(21,43,48,0.6)',
};
// Keep shared legacy components on the same palette while they migrate to semantic tokens.
export const PALETTE = {
  50: JOURNAL.paper, 100: JOURNAL.soft, 200: JOURNAL.line, 300: '#C6D9C0',
  400: JOURNAL.muted, 500: JOURNAL.accent, 600: JOURNAL.muted,
  700: JOURNAL.accentText, 800: JOURNAL.accent, 900: JOURNAL.ink, 950: JOURNAL.ink,
  white: JOURNAL.surface,
};

export const FONTS = {
  serif: 'Manrope-ExtraBold', // Compatibility alias for existing display styles.
  sans: 'Manrope-Regular',
  semibold: 'Manrope-SemiBold',
  bold: 'Manrope-ExtraBold',
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
