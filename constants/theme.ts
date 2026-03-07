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
        return 'Roboto-Light';
      case 'medium':
        return 'Roboto-Medium';
      case 'bold':
        return 'Roboto-Bold';
      default:
        return 'Roboto-Regular';
    }
  }
  return 'System';
};

// Helper function to get optimized font sizes for Android
const getAndroidOptimizedFontSize = (baseSize: number) => {
  if (Platform.OS === 'android') {
    // Android needs larger fonts for better readability
    return Math.round(baseSize * 1.08); // Increased from 1.05 to 1.08
  }
  return baseSize;
};

// Helper function to get optimized padding for Android
const getAndroidOptimizedPadding = (basePadding: number) => {
  if (Platform.OS === 'android') {
    // Android needs larger touch targets
    return Math.round(basePadding * 1.15); // Increased from 1.1 to 1.15
  }
  return basePadding;
};

// Helper function to get optimized line height for Android
const getAndroidOptimizedLineHeight = (baseLineHeight: number) => {
  if (Platform.OS === 'android') {
    // Android needs larger line height for better readability
    return Math.round(baseLineHeight * 1.1);
  }
  return baseLineHeight;
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
  // Android-specific optimizations
  androidOptimizations: {
    fontSize: {
      small: getAndroidOptimizedFontSize(12),
      regular: getAndroidOptimizedFontSize(14),
      medium: getAndroidOptimizedFontSize(16),
      large: getAndroidOptimizedFontSize(18),
      xlarge: getAndroidOptimizedFontSize(20),
      title: getAndroidOptimizedFontSize(22),
      heading: getAndroidOptimizedFontSize(24),
    },
    lineHeight: {
      small: getAndroidOptimizedLineHeight(16),
      regular: getAndroidOptimizedLineHeight(20),
      medium: getAndroidOptimizedLineHeight(22),
      large: getAndroidOptimizedLineHeight(24),
      xlarge: getAndroidOptimizedLineHeight(28),
      title: getAndroidOptimizedLineHeight(30),
      heading: getAndroidOptimizedLineHeight(32),
    },
    padding: {
      small: getAndroidOptimizedPadding(8),
      regular: getAndroidOptimizedPadding(12),
      medium: getAndroidOptimizedPadding(16),
      large: getAndroidOptimizedPadding(20),
      xlarge: getAndroidOptimizedPadding(24),
    },
    height: {
      button: Platform.OS === 'android' ? 52 : 44, // Increased from 48 to 52
      input: Platform.OS === 'android' ? 52 : 44, // Increased from 48 to 52
      touchTarget: Platform.OS === 'android' ? 48 : 40, // Increased from 44 to 48
      tabBar: Platform.OS === 'android' ? 64 : 56, // New for tab bar
    },
    spacing: {
      xs: Platform.OS === 'android' ? 4 : 4,
      sm: Platform.OS === 'android' ? 8 : 8,
      md: Platform.OS === 'android' ? 16 : 12,
      lg: Platform.OS === 'android' ? 24 : 20,
      xl: Platform.OS === 'android' ? 32 : 28,
    },
  },
  logo: {
    primary: 'https://kaszuby24.pl/wp-content/uploads/2020/03/logo-e1584093147599.png',
    header: 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png',
    compact: 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png',
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
  // Android-specific optimizations
  androidOptimizations: {
    fontSize: {
      small: getAndroidOptimizedFontSize(12),
      regular: getAndroidOptimizedFontSize(14),
      medium: getAndroidOptimizedFontSize(16),
      large: getAndroidOptimizedFontSize(18),
      xlarge: getAndroidOptimizedFontSize(20),
      title: getAndroidOptimizedFontSize(22),
      heading: getAndroidOptimizedFontSize(24),
    },
    lineHeight: {
      small: getAndroidOptimizedLineHeight(16),
      regular: getAndroidOptimizedLineHeight(20),
      medium: getAndroidOptimizedLineHeight(22),
      large: getAndroidOptimizedLineHeight(24),
      xlarge: getAndroidOptimizedLineHeight(28),
      title: getAndroidOptimizedLineHeight(30),
      heading: getAndroidOptimizedLineHeight(32),
    },
    padding: {
      small: getAndroidOptimizedPadding(8),
      regular: getAndroidOptimizedPadding(12),
      medium: getAndroidOptimizedPadding(16),
      large: getAndroidOptimizedPadding(20),
      xlarge: getAndroidOptimizedPadding(24),
    },
    height: {
      button: Platform.OS === 'android' ? 52 : 44, // Increased from 48 to 52
      input: Platform.OS === 'android' ? 52 : 44, // Increased from 48 to 52
      touchTarget: Platform.OS === 'android' ? 48 : 40, // Increased from 44 to 48
      tabBar: Platform.OS === 'android' ? 64 : 56, // New for tab bar
    },
    spacing: {
      xs: Platform.OS === 'android' ? 4 : 4,
      sm: Platform.OS === 'android' ? 8 : 8,
      md: Platform.OS === 'android' ? 16 : 12,
      lg: Platform.OS === 'android' ? 24 : 20,
      xl: Platform.OS === 'android' ? 32 : 28,
    },
  },
  logo: {
    primary: 'https://kaszuby24.pl/wp-content/uploads/2020/03/logo-e1584093147599.png',
    header: 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png',
    compact: 'https://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png',
  },
};