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

export const colors = {
  light: {
    primary: '#4361EE', // Modern vibrant blue
    secondary: '#F72585', // Vibrant pink accent
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    notification: '#EF4444',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    subtle: '#F3F4F6',
    shadow: '#000000',
  },
  dark: {
    primary: '#4CC9F0', // Lighter blue for dark mode
    secondary: '#F72585', // Vibrant pink for dark mode
    background: '#111827',
    card: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    notification: '#F87171',
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    subtle: '#374151',
    shadow: '#000000',
  },
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