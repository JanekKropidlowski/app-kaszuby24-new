import { Platform } from 'react-native';

// Helper function to get font family with proper Android fallbacks
const getFontFamily = (fontName: string) => {
  if (Platform.OS === 'android') {
    // On Android, ensure we have proper fallbacks
    return fontName;
  }
  return fontName;
};

// System font fallbacks for Android
const getSystemFontFallback = (weight: string) => {
  if (Platform.OS === 'android') {
    switch (weight) {
      case 'light':
        return 'sans-serif-light';
      case 'medium':
        return 'sans-serif-medium';
      case 'bold':
        return 'sans-serif';
      default:
        return 'sans-serif';
    }
  }
  return 'System';
};

export const lightTheme = {
  colors: {
    primary: '#224A96',
    secondary: '#FECC00',
    background: '#FFFFFF',
    card: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    notification: '#EF4444',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    subtle: '#F1F5F9',
    shadow: '#000000',
  },
  fontFamily: {
    regular: Platform.select({
      default: getFontFamily('Poppins-Regular'),
      android: 'Poppins-Regular',
    }),
    medium: Platform.select({
      default: getFontFamily('Poppins-Medium'),
      android: 'Poppins-Medium',
    }),
    semibold: Platform.select({
      default: getFontFamily('Poppins-SemiBold'),
      android: 'Poppins-SemiBold',
    }),
    bold: Platform.select({
      default: getFontFamily('Poppins-Bold'),
      android: 'Poppins-Bold',
    }),
    light: Platform.select({
      default: getFontFamily('Poppins-Light'),
      android: 'Poppins-Light',
    }),
    extralight: Platform.select({
      default: getFontFamily('Poppins-ExtraLight'),
      android: 'Poppins-ExtraLight',
    }),
    thin: Platform.select({
      default: getFontFamily('Poppins-Thin'),
      android: 'Poppins-Thin',
    }),
    extrabold: Platform.select({
      default: getFontFamily('Poppins-ExtraBold'),
      android: 'Poppins-ExtraBold',
    }),
    black: Platform.select({
      default: getFontFamily('Poppins-Black'),
      android: 'Poppins-Black',
    }),
  },
};

export const darkTheme = {
  colors: {
    primary: '#4A7BC8',
    secondary: '#FECC00',
    background: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    notification: '#F87171',
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    subtle: '#334155',
    shadow: '#000000',
  },
  fontFamily: {
    regular: Platform.select({
      default: getFontFamily('Poppins-Regular'),
      android: 'Poppins-Regular',
    }),
    medium: Platform.select({
      default: getFontFamily('Poppins-Medium'),
      android: 'Poppins-Medium',
    }),
    semibold: Platform.select({
      default: getFontFamily('Poppins-SemiBold'),
      android: 'Poppins-SemiBold',
    }),
    bold: Platform.select({
      default: getFontFamily('Poppins-Bold'),
      android: 'Poppins-Bold',
    }),
    light: Platform.select({
      default: getFontFamily('Poppins-Light'),
      android: 'Poppins-Light',
    }),
    extralight: Platform.select({
      default: getFontFamily('Poppins-ExtraLight'),
      android: 'Poppins-ExtraLight',
    }),
    thin: Platform.select({
      default: getFontFamily('Poppins-Thin'),
      android: 'Poppins-Thin',
    }),
    extrabold: Platform.select({
      default: getFontFamily('Poppins-ExtraBold'),
      android: 'Poppins-ExtraBold',
    }),
    black: Platform.select({
      default: getFontFamily('Poppins-Black'),
      android: 'Poppins-Black',
    }),
  },
};