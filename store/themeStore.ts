import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface FontFamily {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  notification: string;
  success: string;
  error: string;
  warning: string;
  subtle: string;
}

interface Theme {
  colors: ThemeColors;
  fontFamily: FontFamily;
}

interface ThemeState {
  isDarkMode: boolean;
  theme: Theme;
  toggleTheme: () => void;
}

const fontFamily: FontFamily = {
  regular: Platform.select({
    ios: 'Poppins-Regular',
    android: 'Poppins-Regular',
    default: 'Poppins, system-ui, -apple-system, sans-serif'
  }),
  medium: Platform.select({
    ios: 'Poppins-Medium',
    android: 'Poppins-Medium',
    default: 'Poppins, system-ui, -apple-system, sans-serif'
  }),
  semibold: Platform.select({
    ios: 'Poppins-SemiBold',
    android: 'Poppins-SemiBold',
    default: 'Poppins, system-ui, -apple-system, sans-serif'
  }),
  bold: Platform.select({
    ios: 'Poppins-Bold',
    android: 'Poppins-Bold',
    default: 'Poppins, system-ui, -apple-system, sans-serif'
  }),
};

const lightTheme: Theme = {
  colors: {
    primary: '#2563EB',
    secondary: '#7C3AED',
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
  },
  fontFamily,
};

const darkTheme: Theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
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
  },
  fontFamily,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: false,
      theme: lightTheme,
      
      toggleTheme: () => {
        const { isDarkMode } = get();
        const newIsDarkMode = !isDarkMode;
        set({
          isDarkMode: newIsDarkMode,
          theme: newIsDarkMode ? darkTheme : lightTheme,
        });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);