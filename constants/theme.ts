// import { colors } from './colors';

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const FONT_FAMILY = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semibold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const getTheme = (isDark: boolean) => {
  return {
    colors: isDark ? colors.dark : colors.light,
    spacing: SPACING,
    fontSize: FONT_SIZE,
    fontWeight: FONT_WEIGHT,
    fontFamily: FONT_FAMILY,
    borderRadius: BORDER_RADIUS,
  };
};

export type Theme = ReturnType<typeof getTheme>;

export const colors = {
  light: {
    primary: '#4A6FFF', // Modern blue
    secondary: '#FF9500', // Warm orange accent
    background: '#F9FAFC',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#71727A',
    border: '#E5E7EB',
    notification: '#FF3B30',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FFCC00',
    subtle: '#F2F4F8',
  },
  dark: {
    primary: '#5D7FFF', // Lighter blue for dark mode
    secondary: '#FF9F0A', // Warmer orange for dark mode
    background: '#121214',
    card: '#1E1E20',
    text: '#FFFFFF',
    textSecondary: '#A0A0A8',
    border: '#2C2C30',
    notification: '#FF453A',
    success: '#30D158',
    error: '#FF453A',
    warning: '#FFD60A',
    subtle: '#252529',
  },
};