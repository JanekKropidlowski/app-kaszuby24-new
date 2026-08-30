import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Skale tekstu artykułu — od drobnego po wyraźnie powiększony. */
export const FONT_SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;
export const FONT_SCALE_LABELS = ['S', 'M', 'L', 'XL', 'XXL'] as const;

interface ReaderState {
  fontScaleIndex: number;
  setFontScaleIndex: (index: number) => void;
  increase: () => void;
  decrease: () => void;
}

/** Ustawienia czytania artykułu, pamiętane między uruchomieniami apki. */
export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      fontScaleIndex: 1,
      setFontScaleIndex: (index) =>
        set({ fontScaleIndex: Math.max(0, Math.min(FONT_SCALES.length - 1, index)) }),
      increase: () => get().setFontScaleIndex(get().fontScaleIndex + 1),
      decrease: () => get().setFontScaleIndex(get().fontScaleIndex - 1),
    }),
    {
      name: 'reader-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const useFontScale = () => FONT_SCALES[useReaderStore((s) => s.fontScaleIndex)] ?? 1;
