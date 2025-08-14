import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WeatherConfig {
  showHourlyForecast: boolean;
  showWeeklyForecast: boolean;
  showSpecializedWidgets: boolean;
  showAlerts: boolean;
  // Specialized weather types
  showAgriculturalWeather: boolean;
  showMarineWeather: boolean;
  showDrivingWeather: boolean;
}

export interface Station {
  id: string;
  name: string;
  type: string;
}

interface WeatherConfigState {
  config: WeatherConfig;
  setConfig: (config: WeatherConfig) => void;
  toggleOption: (option: keyof WeatherConfig) => void;
  resetToDefaults: () => void;
  // Specialized widgets
  enabledWidgets: string[];
  toggleWidget: (widgetId: string) => void;
  // Station management
  selectedStation: Station | null;
  setSelectedStation: (station: Station | null) => void;
  favoriteStations: Station[];
  toggleFavoriteStation: (station: Station) => void;
  // Sections order
  sectionOrder: Array<'weekly' | 'alerts' | 'hourly' | 'specialized'>;
  setSectionOrder: (order: Array<'weekly' | 'alerts' | 'hourly' | 'specialized'>) => void;
}

const defaultConfig: WeatherConfig = {
  showHourlyForecast: true,
  showWeeklyForecast: true,
  showSpecializedWidgets: false,
  showAlerts: true,
  showAgriculturalWeather: true,
  showMarineWeather: true,
  showDrivingWeather: true,
};

const defaultSectionOrder: Array<'weekly' | 'alerts' | 'hourly' | 'specialized'> = [
  'weekly',
  'alerts',
  'hourly',
  'specialized',
];

export const useWeatherConfigStore = create<WeatherConfigState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      enabledWidgets: ['agricultural', 'marine', 'driving', 'sports'], // Default enabled widgets
      selectedStation: null,
      favoriteStations: [],
      sectionOrder: defaultSectionOrder,
      
      setConfig: (config: WeatherConfig) => {
        set({ config });
      },
      
      toggleOption: (option: keyof WeatherConfig) => {
        const currentConfig = get().config;
        set({
          config: {
            ...currentConfig,
            [option]: !currentConfig[option],
          },
        });
      },
      
      resetToDefaults: () => {
        set({ config: defaultConfig });
      },
      
      toggleWidget: (widgetId: string) => {
        const currentEnabledWidgets = get().enabledWidgets || [];
        const isEnabled = currentEnabledWidgets.includes(widgetId);
        if (isEnabled) {
          set({ enabledWidgets: currentEnabledWidgets.filter(id => id !== widgetId) });
        } else {
          set({ enabledWidgets: [...currentEnabledWidgets, widgetId] });
        }
      },

      setSectionOrder: (order: Array<'weekly' | 'alerts' | 'hourly' | 'specialized'>) => {
        // Validate to keep only supported keys and preserve unique order
        const allowed = new Set(defaultSectionOrder);
        const sanitized = order.filter((key) => allowed.has(key));
        // Add any missing keys at the end to avoid accidental drops across versions
        defaultSectionOrder.forEach((key) => {
          if (!sanitized.includes(key)) sanitized.push(key);
        });
        set({ sectionOrder: sanitized });
      },

      setSelectedStation: (station: Station | null) => {
        set({ selectedStation: station });
      },

      toggleFavoriteStation: (station: Station) => {
        const currentFavorites = get().favoriteStations || [];
        const isFavorite = currentFavorites.find(s => s.id === station.id);
        
        if (isFavorite) {
          set({ 
            favoriteStations: currentFavorites.filter(s => s.id !== station.id) 
          });
        } else {
          set({ 
            favoriteStations: [...currentFavorites, station] 
          });
        }
      },
    }),
    {
      name: 'weather-config',
      storage: createJSONStorage(() => AsyncStorage),
      version: 11, // Increment version for new fields
      migrate: (persistedState: any, version) => {
        const state = persistedState || {};
        const cfg = { ...(state.config || {}) };
        
        // Ensure all required config options exist with proper defaults
        const normalized: WeatherConfig = {
          showHourlyForecast: cfg.showHourlyForecast ?? defaultConfig.showHourlyForecast,
          showWeeklyForecast: cfg.showWeeklyForecast ?? defaultConfig.showWeeklyForecast,
          showSpecializedWidgets: cfg.showSpecializedWidgets ?? defaultConfig.showSpecializedWidgets,
          showAlerts: cfg.showAlerts ?? defaultConfig.showAlerts,
          showAgriculturalWeather: cfg.showAgriculturalWeather ?? defaultConfig.showAgriculturalWeather,
          showMarineWeather: cfg.showMarineWeather ?? defaultConfig.showMarineWeather,
          showDrivingWeather: cfg.showDrivingWeather ?? defaultConfig.showDrivingWeather,
        };
        
        return {
          ...state,
          config: normalized,
          enabledWidgets: state.enabledWidgets ?? ['agricultural', 'marine', 'driving', 'sports'],
          selectedStation: state.selectedStation ?? null,
          favoriteStations: state.favoriteStations ?? [],
          sectionOrder: state.sectionOrder ?? defaultSectionOrder,
        };
      },
    }
  )
);
