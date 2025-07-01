import { Platform } from 'react-native';

// Helper function to get font family with proper fallbacks
const getFontFamily = (fontName: string) => {
  if (Platform.OS === 'android') {
    // On Android, ensure we have proper fallbacks to system fonts
    return fontName;
  }
  if (Platform.OS === 'web') {
    // Web fallbacks
    return `${fontName}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  }
  return fontName;
};

// System font fallbacks for when custom fonts fail to load
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
  if (Platform.OS === 'web') {
    return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }
  return 'System';
};

export const lightTheme = {
  colors: {
    primary: '#224A96',
    secondary: '#FECC00',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    notification: '#EF4444',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    subtle: '#F1F5F9',
    shadow: '#000000',
    tabBarBackground: '#FFFFFF', // White background for tab bar gap
  },
  fontFamily: {
    regular: Platform.select({
      default: getFontFamily('Poppins-Regular'),
      android: 'Poppins-Regular',
      web: getFontFamily('Poppins-Regular'),
    }) || getSystemFontFallback('regular'),
    medium: Platform.select({
      default: getFontFamily('Poppins-Medium'),
      android: 'Poppins-Medium',
      web: getFontFamily('Poppins-Medium'),
    }) || getSystemFontFallback('medium'),
    semibold: Platform.select({
      default: getFontFamily('Poppins-SemiBold'),
      android: 'Poppins-SemiBold',
      web: getFontFamily('Poppins-SemiBold'),
    }) || getSystemFontFallback('bold'),
    bold: Platform.select({
      default: getFontFamily('Poppins-Bold'),
      android: 'Poppins-Bold',
      web: getFontFamily('Poppins-Bold'),
    }) || getSystemFontFallback('bold'),
    light: Platform.select({
      default: getFontFamily('Poppins-Light'),
      android: 'Poppins-Light',
      web: getFontFamily('Poppins-Light'),
    }) || getSystemFontFallback('light'),
    extralight: Platform.select({
      default: getFontFamily('Poppins-ExtraLight'),
      android: 'Poppins-ExtraLight',
      web: getFontFamily('Poppins-ExtraLight'),
    }) || getSystemFontFallback('light'),
    thin: Platform.select({
      default: getFontFamily('Poppins-Thin'),
      android: 'Poppins-Thin',
      web: getFontFamily('Poppins-Thin'),
    }) || getSystemFontFallback('light'),
    extrabold: Platform.select({
      default: getFontFamily('Poppins-ExtraBold'),
      android: 'Poppins-ExtraBold',
      web: getFontFamily('Poppins-ExtraBold'),
    }) || getSystemFontFallback('bold'),
    black: Platform.select({
      default: getFontFamily('Poppins-Black'),
      android: 'Poppins-Black',
      web: getFontFamily('Poppins-Black'),
    }) || getSystemFontFallback('bold'),
  },
};

export const darkTheme = {
  colors: {
    primary: '#4A7BC8',
    secondary: '#FECC00',
    background: '#1E293B',
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
    tabBarBackground: '#1E293B', // Dark background for tab bar gap
  },
  fontFamily: {
    regular: Platform.select({
      default: getFontFamily('Poppins-Regular'),
      android: 'Poppins-Regular',
      web: getFontFamily('Poppins-Regular'),
    }) || getSystemFontFallback('regular'),
    medium: Platform.select({
      default: getFontFamily('Poppins-Medium'),
      android: 'Poppins-Medium',
      web: getFontFamily('Poppins-Medium'),
    }) || getSystemFontFallback('medium'),
    semibold: Platform.select({
      default: getFontFamily('Poppins-SemiBold'),
      android: 'Poppins-SemiBold',
      web: getFontFamily('Poppins-SemiBold'),
    }) || getSystemFontFallback('bold'),
    bold: Platform.select({
      default: getFontFamily('Poppins-Bold'),
      android: 'Poppins-Bold',
      web: getFontFamily('Poppins-Bold'),
    }) || getSystemFontFallback('bold'),
    light: Platform.select({
      default: getFontFamily('Poppins-Light'),
      android: 'Poppins-Light',
      web: getFontFamily('Poppins-Light'),
    }) || getSystemFontFallback('light'),
    extralight: Platform.select({
      default: getFontFamily('Poppins-ExtraLight'),
      android: 'Poppins-ExtraLight',
      web: getFontFamily('Poppins-ExtraLight'),
    }) || getSystemFontFallback('light'),
    thin: Platform.select({
      default: getFontFamily('Poppins-Thin'),
      android: 'Poppins-Thin',
      web: getFontFamily('Poppins-Thin'),
    }) || getSystemFontFallback('light'),
    extrabold: Platform.select({
      default: getFontFamily('Poppins-ExtraBold'),
      android: 'Poppins-ExtraBold',
      web: getFontFamily('Poppins-ExtraBold'),
    }) || getSystemFontFallback('bold'),
    black: Platform.select({
      default: getFontFamily('Poppins-Black'),
      android: 'Poppins-Black',
      web: getFontFamily('Poppins-Black'),
    }) || getSystemFontFallback('bold'),
  },
};