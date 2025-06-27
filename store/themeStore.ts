import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/constants/colors';
import { getTheme, Theme } from '@/constants/theme';

interface ThemeState {
  isDarkMode: boolean;
  theme: Theme;
  toggleTheme: () => void;
  setDarkMode: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      theme: getTheme(false),
      toggleTheme: () => 
        set((state) => ({ 
          isDarkMode: !state.isDarkMode,
          theme: getTheme(!state.isDarkMode)
        })),
      setDarkMode: (isDark: boolean) => 
        set(() => ({ 
          isDarkMode: isDark,
          theme: getTheme(isDark)
        })),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);