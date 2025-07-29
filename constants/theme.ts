import { Platform } from 'react-native';

// Helper function to get font family with proper fallbacks
const getFontFamily = (fontName: string) => {
  if (Platform.OS === 'android') {
    // On Android, use the full font name without extension
    return fontName.replace('.ttf', '');
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
    tabBarBackground: '#FFFFFF', // Added for tab bar background
  },
  fontFamily: {
    regular: Platform.select({
      default: getFontFamily('Poppins_Regular'),
      android: 'Poppins_Regular',
    }) || getSystemFontFallback('regular'),
    medium: Platform.select({
      default: getFontFamily('Poppins_Medium'),
      android: 'Poppins_Medium',
    }) || getSystemFontFallback('medium'),
    semibold: Platform.select({
      default: getFontFamily('Poppins_SemiBold'),
      android: 'Poppins_SemiBold',
    }) || getSystemFontFallback('bold'),
    bold: Platform.select({
      default: getFontFamily('Poppins_Bold'),
      android: 'Poppins_Bold',
    }) || getSystemFontFallback('bold'),
    light: Platform.select({
      default: getFontFamily('Poppins_Light'),
      android: 'Poppins_Light',
    }) || getSystemFontFallback('light'),
    extralight: Platform.select({
      default: getFontFamily('Poppins_ExtraLight'),
      android: 'Poppins_ExtraLight',
    }) || getSystemFontFallback('light'),
    thin: Platform.select({
      default: getFontFamily('Poppins_Thin'),
      android: 'Poppins_Thin',
    }) || getSystemFontFallback('light'),
    extrabold: Platform.select({
      default: getFontFamily('Poppins_ExtraBold'),
      android: 'Poppins_ExtraBold',
    }) || getSystemFontFallback('bold'),
    black: Platform.select({
      default: getFontFamily('Poppins_Black'),
      android: 'Poppins_Black',
    }) || getSystemFontFallback('bold'),
  },
  logo: {
    header: 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png',
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
    tabBarBackground: '#1E293B', // Added for tab bar background
  },
  fontFamily: {
    regular: Platform.select({
      default: getFontFamily('Poppins_Regular'),
      android: 'Poppins_Regular',
      web: getFontFamily('Poppins_Regular'),
    }) || getSystemFontFallback('regular'),
    medium: Platform.select({
      default: getFontFamily('Poppins_Medium'),
      android: 'Poppins_Medium',
      web: getFontFamily('Poppins_Medium'),
    }) || getSystemFontFallback('medium'),
    semibold: Platform.select({
      default: getFontFamily('Poppins_SemiBold'),
      android: 'Poppins_SemiBold',
      web: getFontFamily('Poppins_SemiBold'),
    }) || getSystemFontFallback('bold'),
    bold: Platform.select({
      default: getFontFamily('Poppins_Bold'),
      android: 'Poppins_Bold',
      web: getFontFamily('Poppins_Bold'),
    }) || getSystemFontFallback('bold'),
    light: Platform.select({
      default: getFontFamily('Poppins_Light'),
      android: 'Poppins_Light',
      web: getFontFamily('Poppins_Light'),
    }) || getSystemFontFallback('light'),
    extralight: Platform.select({
      default: getFontFamily('Poppins_ExtraLight'),
      android: 'Poppins_ExtraLight',
      web: getFontFamily('Poppins_ExtraLight'),
    }) || getSystemFontFallback('light'),
    thin: Platform.select({
      default: getFontFamily('Poppins_Thin'),
      android: 'Poppins_Thin',
      web: getFontFamily('Poppins_Thin'),
    }) || getSystemFontFallback('light'),
    extrabold: Platform.select({
      default: getFontFamily('Poppins_ExtraBold'),
      android: 'Poppins_ExtraBold',
      web: getFontFamily('Poppins_ExtraBold'),
    }) || getSystemFontFallback('bold'),
    black: Platform.select({
      default: getFontFamily('Poppins_Black'),
      android: 'Poppins_Black',
      web: getFontFamily('Poppins_Black'),
    }) || getSystemFontFallback('bold'),
  },
  logo: {
    header: 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png',
  },
};