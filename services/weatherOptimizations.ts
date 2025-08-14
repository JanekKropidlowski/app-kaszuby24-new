import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache configuration for weather data
const CACHE_EXPIRY = {
  CURRENT_WEATHER: 5 * 60 * 1000, // 5 minutes
  FORECAST: 15 * 60 * 1000, // 15 minutes
  AIR_QUALITY: 30 * 60 * 1000, // 30 minutes
  STATIONS: 10 * 60 * 1000, // 10 minutes
};

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Weather cache manager
class WeatherCacheManager {
  private static instance: WeatherCacheManager;
  
  static getInstance(): WeatherCacheManager {
    if (!WeatherCacheManager.instance) {
      WeatherCacheManager.instance = new WeatherCacheManager();
    }
    return WeatherCacheManager.instance;
  }

  async set<T>(key: string, data: T, expiryMs: number): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + expiryMs,
      };
      await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('Failed to cache weather data:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const cachedData: CachedData<T> = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > cachedData.expiresAt) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.warn('Failed to retrieve cached weather data:', error);
      return null;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const weatherKeys = keys.filter(key => key.startsWith('weather_'));
      await AsyncStorage.multiRemove(weatherKeys);
    } catch (error) {
      console.warn('Failed to clear weather cache:', error);
    }
  }

  async isStale(key: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return true;

      const cachedData: CachedData<any> = JSON.parse(cached);
      return Date.now() > cachedData.expiresAt;
    } catch {
      return true;
    }
  }
}

// Enhanced weather service with optimizations
export class OptimizedWeatherService {
  private cache = WeatherCacheManager.getInstance();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private lastLocation: { lat: number; lon: number } | null = null;

  // Prevent duplicate requests for the same data
  private async deduplicateRequest<T>(
    key: string, 
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (this.pendingRequests.has(key)) {
      console.log('Deduplicating request for:', key);
      return this.pendingRequests.get(key)!;
    }

    const request = requestFn();
    this.pendingRequests.set(key, request);

    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  // Get current weather with caching
  async getCurrentWeather(lat: number, lon: number, forceRefresh = false) {
    const cacheKey = `weather_current_${lat}_${lon}`;
    
    // Return cached data if available and not stale
    if (!forceRefresh) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        console.log('Weather data served from cache');
        return cached;
      }
    }

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const startTime = Date.now();
        
        // Use Open-Meteo API (free, fast)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl&timezone=auto`
        );
        
        if (!response.ok) throw new Error('Weather API error');
        
        const data = await response.json();
        const loadTime = Date.now() - startTime;
        
        console.log(`Weather data loaded in ${loadTime}ms`);
        
        // Transform data to consistent format
        const transformedData = {
          temperature: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          pressure: data.current.pressure_msl,
          timestamp: new Date().toISOString(),
        };
        
        // Cache the result
        await this.cache.set(cacheKey, transformedData, CACHE_EXPIRY.CURRENT_WEATHER);
        
        return transformedData;
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
        throw error;
      }
    });
  }

  // Get forecast with caching
  async getForecast(lat: number, lon: number, forceRefresh = false) {
    const cacheKey = `weather_forecast_${lat}_${lon}`;
    
    if (!forceRefresh) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const startTime = Date.now();
        
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
        );
        
        if (!response.ok) throw new Error('Forecast API error');
        
        const data = await response.json();
        const loadTime = Date.now() - startTime;
        
        console.log(`Forecast data loaded in ${loadTime}ms`);
        
        // Transform to hourly format
        const hourlyData = data.hourly.time.map((time: string, index: number) => ({
          time,
          temperature: data.hourly.temperature_2m[index],
          humidity: data.hourly.relative_humidity_2m[index],
          windSpeed: data.hourly.wind_speed_10m[index],
          precipitation: data.hourly.precipitation_probability[index],
        }));
        
        const transformedData = {
          hourly: hourlyData,
          daily: data.daily,
          timestamp: new Date().toISOString(),
        };
        
        await this.cache.set(cacheKey, transformedData, CACHE_EXPIRY.FORECAST);
        
        return transformedData;
      } catch (error) {
        console.error('Failed to fetch forecast data:', error);
        throw error;
      }
    });
  }

  // Batch multiple weather requests for better performance
  async getWeatherBatch(lat: number, lon: number, forceRefresh = false) {
    const startTime = Date.now();
    
    try {
      const [current, forecast] = await Promise.allSettled([
        this.getCurrentWeather(lat, lon, forceRefresh),
        this.getForecast(lat, lon, forceRefresh),
      ]);

      const batchTime = Date.now() - startTime;
      console.log(`Weather batch loaded in ${batchTime}ms`);

      return {
        current: current.status === 'fulfilled' ? current.value : null,
        forecast: forecast.status === 'fulfilled' ? forecast.value : null,
        loadTime: batchTime,
      };
    } catch (error) {
      console.error('Failed to load weather batch:', error);
      throw error;
    }
  }

  // Preload weather data for better UX
  async preloadWeatherData(lat: number, lon: number) {
    try {
      // Preload in background without blocking UI
      setTimeout(async () => {
        try {
          await this.getWeatherBatch(lat, lon, false);
          console.log('Weather data preloaded successfully');
        } catch (error) {
          console.warn('Weather preload failed:', error);
        }
      }, 100);
    } catch (error) {
      console.warn('Failed to schedule weather preload:', error);
    }
  }

  // Smart refresh based on location change
  async refreshIfLocationChanged(lat: number, lon: number) {
    if (!this.lastLocation || 
        Math.abs(this.lastLocation.lat - lat) > 0.01 || 
        Math.abs(this.lastLocation.lon - lon) > 0.01) {
      
      this.lastLocation = { lat, lon };
      console.log('Location changed, refreshing weather data');
      return this.getWeatherBatch(lat, lon, true);
    }
    
    return this.getWeatherBatch(lat, lon, false);
  }

  // Clear expired cache entries
  async cleanupCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const weatherKeys = keys.filter(key => key.startsWith('weather_'));
      
      for (const key of weatherKeys) {
        if (await this.cache.isStale(key)) {
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const weatherKeys = keys.filter(key => key.startsWith('weather_'));
      
      let totalSize = 0;
      let expiredCount = 0;
      
      for (const key of weatherKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          totalSize += cached.length;
          if (await this.cache.isStale(key)) {
            expiredCount++;
          }
        }
      }
      
      return {
        totalKeys: weatherKeys.length,
        expiredKeys: expiredCount,
        estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return null;
    }
  }

  // Performance monitoring
  async getPerformanceMetrics() {
    try {
      const stats = await this.getCacheStats();
      const pendingRequests = this.pendingRequests.size;
      
      return {
        ...stats,
        pendingRequests,
        cacheHitRate: 'N/A', // Could be implemented with counters
        averageLoadTime: 'N/A', // Could be implemented with timing data
      };
    } catch (error) {
      console.warn('Failed to get performance metrics:', error);
      return null;
    }
  }
}

// Export singleton instance
export const optimizedWeatherService = new OptimizedWeatherService();

// Utility functions for performance optimization
export const weatherOptimizations = {
  // Debounce function calls
  debounce<T extends (...args: any[]) => any>(
    func: T, 
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function calls
  throttle<T extends (...args: any[]) => any>(
    func: T, 
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Retry with exponential backoff
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  },
};
