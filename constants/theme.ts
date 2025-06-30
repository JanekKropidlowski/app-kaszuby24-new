import { Platform } from 'react-native';

// Helper function to get font family - prioritize custom fonts on all platforms
const getFontFamily = (fontName: string) => {
  // Always try to use custom fonts first
  return fontName;
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
    regular: getFontFamily('Poppins-Regular'),
    medium: getFontFamily('Poppins-Medium'),
    semibold: getFontFamily('Poppins-SemiBold'),
    bold: getFontFamily('Poppins-Bold'),
    light: getFontFamily('Poppins-Light'),
    extralight: getFontFamily('Poppins-ExtraLight'),
    thin: getFontFamily('Poppins-Thin'),
    extrabold: getFontFamily('Poppins-ExtraBold'),
    black: getFontFamily('Poppins-Black'),
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
    regular: getFontFamily('Poppins-Regular'),
    medium: getFontFamily('Poppins-Medium'),
    semibold: getFontFamily('Poppins-SemiBold'),
    bold: getFontFamily('Poppins-Bold'),
    light: getFontFamily('Poppins-Light'),
    extralight: getFontFamily('Poppins-ExtraLight'),
    thin: getFontFamily('Poppins-Thin'),
    extrabold: getFontFamily('Poppins-ExtraBold'),
    black: getFontFamily('Poppins-Black'),
  },
};