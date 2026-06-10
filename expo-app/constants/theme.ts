// ÆTHERMIND dark palette — OverlayLang violet edition

export const Colors = {
  // Backgrounds
  bg: '#060810',
  bgCard: '#0E1120',
  bgInput: '#111628',
  bgOverlay: '#0A0C18CC',
  border: '#1E2240',
  borderAccent: '#7B2FFF44',

  // Accent — violet
  accent: '#7B2FFF',
  accentDim: '#7B2FFF44',
  accentGlow: '#7B2FFF22',
  accentLight: '#A96FFF',

  // Text
  textPrimary: '#F0EEFF',
  textSecondary: '#8884AA',
  textMuted: '#44405A',
  textAccent: '#A96FFF',

  // Semantic
  success: '#0DFFD4',
  warning: '#FF9F1C',
  error: '#FF4D6D',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  '3xl': 64,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 48,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const FontFamily = {
  // Body text
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',

  // Labels, code, numbers
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const Shadow = {
  accent: {
    shadowColor: '#7B2FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

export const Theme = {
  Colors,
  Spacing,
  Radius,
  FontSize,
  FontWeight,
  FontFamily,
  Shadow,
} as const;

export type ThemeColors = typeof Colors;
export type ThemeSpacing = typeof Spacing;
