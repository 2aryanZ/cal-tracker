import { Platform } from 'react-native';

// Everyday food journal: warm paper, charcoal type and a restrained olive accent.
export const JOURNAL = {
  paper: '#F7F4EC', surface: '#FFFDF8', ink: '#252923', muted: '#626757',
  accent: '#667A45', accentText: '#4D6034', line: '#DEDDD1', soft: '#E9EDDE', water: '#386779',
  error: '#A44331', canvas: '#EAE7DE', scrim: 'rgba(37,41,35,0.55)',
};
// Keep shared legacy components on the same palette while they migrate to semantic tokens.
export const PALETTE = {
  50: JOURNAL.paper, 100: JOURNAL.soft, 200: JOURNAL.line, 300: '#BAC8A3',
  400: JOURNAL.muted, 500: JOURNAL.accent, 600: JOURNAL.muted,
  700: '#4D6034', 800: '#3B482F', 900: JOURNAL.ink, 950: JOURNAL.ink,
  white: JOURNAL.surface,
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
