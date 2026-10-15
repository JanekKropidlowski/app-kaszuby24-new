// Tryb ciemny dla ekranów z kolorami wpisanymi na sztywno (rozkład jazdy, Niezbędnik).
// W trybie jasnym wszystkie funkcje zwracają kolor bez zmian. W ciemnym mapują tylko
// neutralne kolory (tła, tekst, ramki); akcenty (żółty, niebieski przycisków, czerwień) zostają.
import { StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

let dark = false;

const BG: Record<string, string> = {
  '#FFFFFF': '#1E293B', '#FFF': '#1E293B', '#FAFAFA': '#1E293B', '#F9FAFB': '#1E293B',
  '#F7FAFC': '#273449', '#F8FAFC': '#273449', '#F1F5F9': '#273449', '#F0F4F8': '#273449',
  '#EDF2F7': '#273449', '#EEEEEE': '#273449',
  '#E2E8F0': '#334155', '#E5E7EB': '#1F2937',
  '#F3F4F6': '#0F172A', '#F5F5F5': '#0F172A',
};
const FG: Record<string, string> = {
  '#1A1A1A': '#F1F5F9', '#1A202C': '#F1F5F9', '#2D3748': '#F1F5F9', '#111827': '#F1F5F9',
  '#1E293B': '#F1F5F9', '#374151': '#F1F5F9', // czarny celowo bez mapowania: bywa na żółtych akcentach
  '#212121': '#F1F5F9', '#333333': '#F1F5F9',
  '#4A5568': '#CBD5E1', '#4B5563': '#CBD5E1', '#555555': '#CBD5E1',
  '#718096': '#94A3B8', '#6B7280': '#94A3B8', '#9CA3AF': '#94A3B8', '#A0AEC0': '#94A3B8',
  '#909090': '#94A3B8', '#888888': '#94A3B8', '#999999': '#94A3B8',
  '#CBD5E0': '#64748B',
  '#1A237E': '#93A5FF', '#0066CC': '#60A5FA', '#1A6ADD': '#60A5FA', '#3182CE': '#60A5FA',
  '#388E3C': '#66BB6A', '#D32F2F': '#F87171', '#E53E3E': '#FC8181', '#92400E': '#FCD34D',
};
const BD: Record<string, string> = {
  '#E2E8F0': '#334155', '#EDF2F7': '#334155', '#E5E7EB': '#334155', '#F0F4F8': '#334155',
  '#F3F4F6': '#334155', '#CBD5E0': '#475569', '#F1F5F9': '#334155', '#EEEEEE': '#334155',
};

const pick = (map: Record<string, string>) => (hex: string): string =>
  dark ? map[hex.toUpperCase()] ?? hex : hex;

export const cbg = pick(BG);
export const cfg = pick(FG);
export const cbd = pick(BD);

/** Wołać na początku głównego komponentu ekranu – ustawia paletę przed renderem dzieci. */
export function useDarkSync(): boolean {
  const isDark = useThemeStore((s) => !!s.isDarkMode);
  dark = isDark;
  return isDark;
}

/** StyleSheet przeliczany po zmianie motywu; użycie `styles.x` bez zmian (Proxy). */
export function themedStyles<T extends Record<string, any>>(factory: () => T): T {
  let cache: T | null = null;
  let cacheDark: boolean | null = null;
  const get = (): T => {
    if (cache === null || cacheDark !== dark) {
      cache = factory();
      cacheDark = dark;
    }
    return cache;
  };
  return new Proxy({} as T, { get: (_t, key) => (get() as any)[key] });
}

export { StyleSheet };
