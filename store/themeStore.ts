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
    info: string;
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
    info: '#3B82F6',
    subtle: '#F1F5F9',
    shadow: '#000000',
    tabBarBackground: '#FFFFFF',
  },
  fontFamily: {
    regular: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    medium: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    semibold: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    bold: Platform.select({
      default: 'Poppins_Bold',
      android: 'Poppins_Bold',
    }) || 'Poppins_Bold',
    light: Platform.select({
      default: 'Poppins_Light',
      android: 'Poppins_Light',
    }) || 'Poppins_Light',
    extralight: Platform.select({
      default: 'Poppins_ExtraLight',
      android: 'Poppins_ExtraLight',
    }) || 'Poppins_ExtraLight',
    thin: Platform.select({
      default: 'Poppins_Thin',
      android: 'Poppins_Thin',
    }) || 'Poppins_Thin',
    extrabold: Platform.select({
      default: 'Poppins_ExtraBold',
      android: 'Poppins_ExtraBold',
    }) || 'Poppins_ExtraBold',
    black: Platform.select({
      default: 'Poppins_Black',
      android: 'Poppins_Black',
    }) || 'Poppins_Black',
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
    info: '#60A5FA',
    subtle: '#334155',
    shadow: '#000000',
    tabBarBackground: '#1E293B',
  },
  fontFamily: {
    regular: Platform.select({
      default: 'Poppins_Regular',
      android: 'Poppins_Regular',
    }) || 'Poppins_Regular',
    medium: Platform.select({
      default: 'Poppins_Medium',
      android: 'Poppins_Medium',
    }) || 'Poppins_Medium',
    semibold: Platform.select({
      default: 'Poppins_SemiBold',
      android: 'Poppins_SemiBold',
    }) || 'Poppins_SemiBold',
    bold: Platform.select({
      default: 'Poppins_Bold',
      android: 'Poppins_Bold',
    }) || 'Poppins_Bold',
    light: Platform.select({
      default: 'Poppins_Light',
      android: 'Poppins_Light',
    }) || 'Poppins_Light',
    extralight: Platform.select({
      default: 'Poppins_ExtraLight',
      android: 'Poppins_ExtraLight',
    }) || 'Poppins_ExtraLight',
    thin: Platform.select({
      default: 'Poppins_Thin',
      android: 'Poppins_Thin',
    }) || 'Poppins_Thin',
    extrabold: Platform.select({
      default: 'Poppins_ExtraBold',
      android: 'Poppins_ExtraBold',
    }) || 'Poppins_ExtraBold',
    black: Platform.select({
      default: 'Poppins_Black',
      android: 'Poppins_Black',
    }) || 'Poppins_Black',
  },
  logo: {
    header: 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png',
  },
};

export interface ThemeState {
  isDarkMode: boolean;
  autoTheme: boolean;
  theme: typeof lightTheme;
  debugMode: boolean;
  toggleTheme: () => void;
  toggleAutoTheme: () => void;
  setAutoTheme: (enabled: boolean) => void;
  updateThemeByTime: () => void;
  toggleDebugMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: false,
      autoTheme: false,
      theme: lightTheme,
      debugMode: false,
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
      toggleDebugMode: () =>
        set((state) => ({
          debugMode: !state.debugMode,
        })),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        autoTheme: state.autoTheme,
        debugMode: state.debugMode,
      }),
    }
  )
);