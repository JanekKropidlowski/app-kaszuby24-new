import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface Theme {
  isDarkMode?: boolean;
  colors: {
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
    shadow: string;
    tabBarBackground: string;
  };
  fontFamily: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
    light: string;
    extralight: string;
    thin: string;
    extrabold: string;
    black: string;
  };
  logo: {
    header: string;
  };
}

const lightTheme: Theme = {
  isDarkMode: false,
  colors: {
    primary: '#224A96',
    secondary: '#FECC00',
    background: '#F8FAFC',
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
    tabBarBackground: '#FFFFFF',
  },
  fontFamily: {
    regular: Platform.select({
      default: 'Poppins-Regular',
      android: 'Poppins-Regular',
    }) || 'Poppins-Regular',
    medium: Platform.select({
      default: 'Poppins-Medium',
      android: 'Poppins-Medium',
    }) || 'Poppins-Medium',
    semibold: Platform.select({
      default: 'Poppins-SemiBold',
      android: 'Poppins-SemiBold',
    }) || 'Poppins-SemiBold',
    bold: Platform.select({
      default: 'Poppins-Bold',
      android: 'Poppins-Bold',
    }) || 'Poppins-Bold',
    light: Platform.select({
      default: 'Poppins-Light',
      android: 'Poppins-Light',
    }) || 'Poppins-Light',
    extralight: Platform.select({
      default: 'Poppins-ExtraLight',
      android: 'Poppins-ExtraLight',
    }) || 'Poppins-ExtraLight',
    thin: Platform.select({
      default: 'Poppins-Thin',
      android: 'Poppins-Thin',
    }) || 'Poppins-Thin',
    extrabold: Platform.select({
      default: 'Poppins-ExtraBold',
      android: 'Poppins-ExtraBold',
    }) || 'Poppins-ExtraBold',
    black: Platform.select({
      default: 'Poppins-Black',
      android: 'Poppins-Black',
    }) || 'Poppins-Black',
  },
  logo: {
    header: 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png',
  },
};

const darkTheme: Theme = {
  isDarkMode: true,
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
    tabBarBackground: '#1E293B',
  },
  fontFamily: {
    regular: Platform.select({
      default: 'Poppins-Regular',
      android: 'Poppins-Regular',
    }) || 'Poppins-Regular',
    medium: Platform.select({
      default: 'Poppins-Medium',
      android: 'Poppins-Medium',
    }) || 'Poppins-Medium',
    semibold: Platform.select({
      default: 'Poppins-SemiBold',
      android: 'Poppins-SemiBold',
    }) || 'Poppins-SemiBold',
    bold: Platform.select({
      default: 'Poppins-Bold',
      android: 'Poppins-Bold',
    }) || 'Poppins-Bold',
    light: Platform.select({
      default: 'Poppins-Light',
      android: 'Poppins-Light',
    }) || 'Poppins-Light',
    extralight: Platform.select({
      default: 'Poppins-ExtraLight',
      android: 'Poppins-ExtraLight',
    }) || 'Poppins-ExtraLight',
    thin: Platform.select({
      default: 'Poppins-Thin',
      android: 'Poppins-Thin',
    }) || 'Poppins-Thin',
    extrabold: Platform.select({
      default: 'Poppins-ExtraBold',
      android: 'Poppins-ExtraBold',
    }) || 'Poppins-ExtraBold',
    black: Platform.select({
      default: 'Poppins-Black',
      android: 'Poppins-Black',
    }) || 'Poppins-Black',
  },
  logo: {
    header: 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png',
  },
};

interface ThemeState {
  isDarkMode: boolean;
  autoTheme: boolean; // Nowa opcja automatycznego przełączania
  theme: Theme;
  toggleTheme: () => void;
  toggleAutoTheme: () => void;
  setAutoTheme: (enabled: boolean) => void;
  updateThemeByTime: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: false,
      autoTheme: false, // Domyślnie wyłączone
      theme: lightTheme, // Ensure default theme is always set
      toggleTheme: () =>
        set((state) => ({
          isDarkMode: !state.isDarkMode,
          theme: !state.isDarkMode ? darkTheme : lightTheme,
        })),
      toggleAutoTheme: () =>
        set((state) => ({
          autoTheme: !state.autoTheme,
        })),
      setAutoTheme: (enabled: boolean) =>
        set({ autoTheme: enabled }),
      updateThemeByTime: () => {
        const state = get();
        if (!state.autoTheme) return;
        
        const now = new Date();
        const hour = now.getHours();
        const isNight = hour < 6 || hour >= 20; // 20:00 - 6:00
        
        if (isNight !== state.isDarkMode) {
          set({
            isDarkMode: isNight,
            theme: isNight ? darkTheme : lightTheme,
          });
        }
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Add onRehydrateStorage to ensure theme is properly set after loading
      onRehydrateStorage: () => (state) => {
        if (state && !state.theme) {
          state.theme = state.isDarkMode ? darkTheme : lightTheme;
        }
      },
    }
  )
);