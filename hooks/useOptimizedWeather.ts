import { useState, useEffect, useCallback, useRef } from 'react';
import { optimizedWeatherService, weatherOptimizations } from '@/services/weatherOptimizations';
import * as Location from 'expo-location';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  timestamp: string;
}

interface ForecastData {
  hourly: Array<{
    time: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
  }>;
  daily: any;
  timestamp: string;
}

interface WeatherState {
  current: WeatherData | null;
  forecast: ForecastData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  loadTime: number | null;
}

export const useOptimizedWeather = () => {
  const [weatherState, setWeatherState] = useState<WeatherState>({
    current: null,
    forecast: null,
    loading: false,
    error: null,
    lastUpdated: null,
    loadTime: null,
  });

  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user location
  const getLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 300000, // 5 minutes
        distanceInterval: 1000, // 1 km
      });

      const newLocation = {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };

      setLocation(newLocation);
      return newLocation;
    } catch (error) {
      console.error('Failed to get location:', error);
      // Fallback to default location (Gdańsk)
      const defaultLocation = { lat: 54.3520, lon: 18.6466 };
      setLocation(defaultLocation);
      return defaultLocation;
    }
  }, []);

  // Load weather data with optimizations
  const loadWeatherData = useCallback(async (
    lat: number, 
    lon: number, 
    forceRefresh = false
  ) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setWeatherState(prev => ({ ...prev, loading: true, error: null }));

      const startTime = Date.now();
      
      const weatherBatch = await optimizedWeatherService.getWeatherBatch(lat, lon, forceRefresh);
      
      const loadTime = Date.now() - startTime;

      setWeatherState({
        current: weatherBatch.current as WeatherData | null,
        forecast: weatherBatch.forecast as ForecastData | null,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        loadTime,
      });

      // Preload next batch for better UX
      if (!forceRefresh) {
        optimizedWeatherService.preloadWeatherData(lat, lon);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Weather request was cancelled');
        return;
      }

      console.error('Failed to load weather data:', error);
      setWeatherState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // Debounced refresh function
  const debouncedRefresh = useCallback(
    weatherOptimizations.debounce((lat: number, lon: number) => {
      loadWeatherData(lat, lon, true);
    }, 1000),
    [loadWeatherData]
  );

  // Throttled refresh function
  const throttledRefresh = useCallback(
    weatherOptimizations.throttle((lat: number, lon: number) => {
      loadWeatherData(lat, lon, true);
    }, 30000), // 30 seconds
    [loadWeatherData]
  );

  // Smart refresh based on location change
  const smartRefresh = useCallback(async (lat: number, lon: number) => {
    try {
      const result = await optimizedWeatherService.refreshIfLocationChanged(lat, lon);
      
      if (result.current || result.forecast) {
        setWeatherState({
          current: result.current as WeatherData | null,
          forecast: result.forecast as ForecastData | null,
          loading: false,
          error: null,
          lastUpdated: new Date(),
          loadTime: result.loadTime,
        });
      }
    } catch (error) {
      console.error('Smart refresh failed:', error);
    }
  }, []);

  // Initialize weather data
  useEffect(() => {
    const initializeWeather = async () => {
      const userLocation = await getLocation();
      if (userLocation) {
        await loadWeatherData(userLocation.lat, userLocation.lon, false);
      }
    };

    initializeWeather();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [getLocation, loadWeatherData]);

  // Auto-refresh weather data every 15 minutes
  useEffect(() => {
    if (!location) return;

    const autoRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          await loadWeatherData(location.lat, location.lon, false);
        } catch (error) {
          console.warn('Auto-refresh failed:', error);
        }
      }, 15 * 60 * 1000); // 15 minutes
    };

    autoRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [location, loadWeatherData]);

  // Manual refresh functions
  const refresh = useCallback(() => {
    if (location) {
      loadWeatherData(location.lat, location.lon, true);
    }
  }, [location, loadWeatherData]);

  const refreshLocation = useCallback(async () => {
    const newLocation = await getLocation();
    if (newLocation) {
      await loadWeatherData(newLocation.lat, newLocation.lon, true);
    }
  }, [getLocation, loadWeatherData]);

  // Performance monitoring
  const getPerformanceMetrics = useCallback(async () => {
    try {
      const metrics = await optimizedWeatherService.getPerformanceMetrics();
      return metrics;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return null;
    }
  }, []);

  // Cache management
  const clearCache = useCallback(async () => {
    try {
      await optimizedWeatherService.cleanupCache();
      console.log('Weather cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, []);

  const getCacheStats = useCallback(async () => {
    try {
      const stats = await optimizedWeatherService.getCacheStats();
      return stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }, []);

  return {
    // Weather data
    current: weatherState.current,
    forecast: weatherState.forecast,
    loading: weatherState.loading,
    error: weatherState.error,
    lastUpdated: weatherState.lastUpdated,
    loadTime: weatherState.loadTime,
    
    // Location
    location,
    
    // Actions
    refresh,
    refreshLocation,
    debouncedRefresh,
    throttledRefresh,
    smartRefresh,
    
    // Performance
    getPerformanceMetrics,
    getCacheStats,
    clearCache,
    
    // Utility
    isLoading: weatherState.loading,
    hasError: !!weatherState.error,
    hasData: !!(weatherState.current || weatherState.forecast),
  };
};
