import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    SynopData,
    WarningData,
    HydroData,
    MeteoData,
    StationInfo,
    StationType
} from '@/types/weather';

const API_BASE_URL = 'https://danepubliczne.imgw.pl/api/data';

// Intelligent TTLs per data category
const CACHE_TTL = {
    currentMs: 5 * 60 * 1000, // 5 minutes (current observations)
    forecastMs: 30 * 60 * 1000, // 30 minutes
    warningsMs: 15 * 60 * 1000, // 15 minutes
    historyMs: 24 * 60 * 60 * 1000, // 24 hours
    defaultMs: 10 * 60 * 1000, // fallback: 10 minutes
} as const;
// API key removed - using free Open-Meteo API for weather data

// Cache configuration
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

class WeatherCache {
  private static instance: WeatherCache;
  
  static getInstance(): WeatherCache {
    if (!WeatherCache.instance) {
      WeatherCache.instance = new WeatherCache();
    }
    return WeatherCache.instance;
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

// Enhanced weather service with caching
export class EnhancedWeatherService {
  private cache = WeatherCache.getInstance();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  // Prevent duplicate requests
  private async deduplicateRequest<T>(
    key: string, 
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (this.pendingRequests.has(key)) {
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
        // Show loading state immediately
        const startTime = Date.now();
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY}&units=metric&lang=pl`
        );
        
        if (!response.ok) throw new Error('Weather API error');
        
        const data = await response.json();
        const loadTime = Date.now() - startTime;
        
        console.log(`Weather data loaded in ${loadTime}ms`);
        
        // Cache the result
        await this.cache.set(cacheKey, data, CACHE_EXPIRY.CURRENT_WEATHER);
        
        return data;
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
        throw error;
      }
    });
  }

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
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY}&units=metric&lang=pl`
        );
        
        if (!response.ok) throw new Error('Forecast API error');
        
        const data = await response.json();
        const loadTime = Date.now() - startTime;
        
        console.log(`Forecast data loaded in ${loadTime}ms`);
        
        await this.cache.set(cacheKey, data, CACHE_EXPIRY.FORECAST);
        
        return data;
      } catch (error) {
        console.error('Failed to fetch forecast data:', error);
        throw error;
      }
    });
  }

  async getAirQuality(lat: number, lon: number, forceRefresh = false) {
    const cacheKey = `weather_airquality_${lat}_${lon}`;
    
    if (!forceRefresh) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const startTime = Date.now();
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY}`
        );
        
        if (!response.ok) throw new Error('Air quality API error');
        
        const data = await response.json();
        const loadTime = Date.now() - startTime;
        
        console.log(`Air quality data loaded in ${loadTime}ms`);
        
        await this.cache.set(cacheKey, data, CACHE_EXPIRY.AIR_QUALITY);
        
        return data;
      } catch (error) {
        console.error('Failed to fetch air quality data:', error);
        throw error;
      }
    });
  }

  // Batch multiple weather requests
  async getWeatherBatch(lat: number, lon: number, forceRefresh = false) {
    const startTime = Date.now();
    
    try {
      const [current, forecast, airQuality] = await Promise.allSettled([
        this.getCurrentWeather(lat, lon, forceRefresh),
        this.getForecast(lat, lon, forceRefresh),
        this.getAirQuality(lat, lon, forceRefresh),
      ]);

      const batchTime = Date.now() - startTime;
      console.log(`Weather batch loaded in ${batchTime}ms`);

      return {
        current: current.status === 'fulfilled' ? current.value : null,
        forecast: forecast.status === 'fulfilled' ? forecast.value : null,
        airQuality: airQuality.status === 'fulfilled' ? airQuality.value : null,
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
}

// Export singleton instance
export const weatherService = new EnhancedWeatherService();

// --- STATIONS ---
// Hardcoded lists of main stations for now. This could be fetched from an API in the future.
export const SYNOP_STATIONS: StationInfo[] = [
    // Pomorze
    { id: '12155', name: 'Gdańsk', type: 'synop', lat: 54.3775, lon: 18.4667, region: 'Pomorze' },
    { id: '12135', name: 'Hel', type: 'synop', lat: 54.6083, lon: 18.8011, region: 'Pomorze' },
    { id: '12235', name: 'Chojnice', type: 'synop', lat: 53.7000, lon: 17.5500, region: 'Pomorze' },
    { id: '12125', name: 'Lębork', type: 'synop', lat: 54.5500, lon: 17.7500, region: 'Pomorze' },
    { id: '12120', name: 'Łeba', type: 'synop', lat: 54.7667, lon: 17.5500, region: 'Pomorze' },
    { id: '12115', name: 'Ustka', type: 'synop', lat: 54.5800, lon: 16.8611, region: 'Pomorze' },
    
    // Reszta Polski (przykładowe, można rozbudować)
    { id: '12100', name: 'Szczecin', type: 'synop', lat: 53.3947, lon: 14.6236, region: 'Zachodniopomorskie' },
    { id: '12375', name: 'Warszawa', type: 'synop', lat: 52.1658, lon: 20.9672, region: 'Mazowieckie' },
    { id: '12330', name: 'Poznań', type: 'synop', lat: 52.4211, lon: 16.8300, region: 'Wielkopolskie' },
    { id: '12566', name: 'Kraków', type: 'synop', lat: 50.0814, lon: 19.9850, region: 'Małopolskie' },
    { id: '12424', name: 'Wrocław', type: 'synop', lat: 51.1028, lon: 16.8836, region: 'Dolnośląskie' },
];

// --- CACHE SYSTEM ---

// --- GENERIC API FETCHER WITH CACHE, TTL, RETRY, OFFLINE FALLBACK ---
type FetchOptions<T> = {
    cacheKey?: string;
    ttlMs?: number;
    allowStale?: boolean;
    retries?: number;
    backoffBaseMs?: number;
    transform?: (data: any) => T;
    skipNetwork?: boolean; // offline-mode
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchApi = async <T>(endpoint: string, options: FetchOptions<T> = {}): Promise<T> => {
    const {
        cacheKey = endpoint,
        ttlMs = CACHE_TTL.defaultMs,
        allowStale = true,
        retries = 2,
        backoffBaseMs = 500,
        transform,
        skipNetwork = false,
    } = options;

    // 1) Try fresh-valid cache first
    const cache = WeatherCache.getInstance();
    const cachedFresh = await cache.get<T>(cacheKey);
    if (cachedFresh) {
        console.log(`Using cached data for ${cacheKey}`);
        return cachedFresh;
    }

    // 2) Offline mode: return stale if requested to skip network
    if (skipNetwork) {
        const stale = await cache.get<T>(cacheKey);
        if (stale) {
            console.log(`Offline: using stale cached data for ${cacheKey}`);
            return stale;
        }
        throw new Error(`Offline and no cache for ${cacheKey}`);
    }

    // 3) Network with retry
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const fullUrl = `${API_BASE_URL}/${endpoint}`;
            console.log(`Fetching fresh data from: ${fullUrl} (attempt ${attempt + 1})`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(fullUrl, {
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Kaszuby24-App/1.0',
                },
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No response text');
                
                // Special handling for warnings endpoints that return 404 when no warnings exist
                if (response.status === 404 && (endpoint.includes('warnings') || endpoint.includes('warning'))) {
                    const errorData = errorText ? JSON.parse(errorText) : {};
                    if (errorData.message === 'No products were found') {
                        console.log(`No warnings found for ${endpoint} - this is normal when no warnings are active`);
                        // Return empty array for warnings when none exist
                        const emptyData: T = ([] as any) as T;
                        await cache.set(cacheKey, emptyData, ttlMs);
                        return emptyData;
                    }
                }
                
                console.error(`HTTP error for ${fullUrl}:`, response.status, response.statusText, errorText);
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const raw = await response.json();
            const data: T = transform ? transform(raw) : raw;
            await cache.set(cacheKey, data, ttlMs);
            console.log(`Successfully fetched ${endpoint}${transform ? ' (transformed)' : ''}`);
            return data;
        } catch (error) {
            lastError = error;
            const backoff = backoffBaseMs * Math.pow(2, attempt);
            if (attempt < retries) {
                console.warn(`Fetch ${endpoint} failed (attempt ${attempt + 1}). Retrying in ${backoff}ms...`, error);
                await delay(backoff);
                continue;
            }
        }
    }

    console.error(`Error fetching from ${endpoint}:`, lastError);

    // 4) Stale fallback
    if (allowStale) {
        const stale = await cache.get<T>(cacheKey);
        if (stale) {
            console.log(`Using expired cached data for ${cacheKey} as fallback`);
            return stale;
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

// --- API FETCH FUNCTIONS ---
// Minimal field selection to reduce payload stored/rendered
const transformSynop = (items: any[]): SynopData[] =>
    (Array.isArray(items) ? items : []).map((i) => ({
        id_stacji: i.id_stacji,
        stacja: i.stacja,
        data_pomiaru: i.data_pomiaru,
        godzina_pomiaru: i.godzina_pomiaru,
        temperatura: i.temperatura,
        predkosc_wiatru: i.predkosc_wiatru,
        kierunek_wiatru: i.kierunek_wiatru,
        wilgotnosc_wzgledna: i.wilgotnosc_wzgledna,
        suma_opadu: i.suma_opadu,
        cisnienie: i.cisnienie,
        // include visibility if present in raw (widocznosc)
        // @ts-ignore
        widocznosc: (i as any).widocznosc ?? null,
    }));

const transformMeteo = (items: any[]): MeteoData[] =>
    (Array.isArray(items) ? items : []).map((i) => ({
        kod_stacji: i.kod_stacji,
        nazwa_stacji: i.nazwa_stacji,
        lat: i.lat,
        lon: i.lon,
        temperatura_gruntu: i.temperatura_gruntu ?? null,
        temperatura_gruntu_data: i.temperatura_gruntu_data ?? null,
        temperatura_powietrza: i.temperatura_powietrza ?? null,
        temperatura_powietrza_data: i.temperatura_powietrza_data ?? null,
        wiatr_kierunek: i.wiatr_kierunek ?? null,
        wiatr_kierunek_data: i.wiatr_kierunek_data ?? null,
        wiatr_srednia_predkosc: i.wiatr_srednia_predkosc ?? null,
        wiatr_srednia_predkosc_data: i.wiatr_srednia_predkosc_data ?? null,
        wiatr_predkosc_maksymalna: i.wiatr_predkosc_maksymalna ?? null,
        wiatr_predkosc_maksymalna_data: i.wiatr_predkosc_maksymalna_data ?? null,
        wilgotnosc_wzgledna: i.wilgotnosc_wzgledna ?? null,
        wilgotnosc_wzgledna_data: i.wilgotnosc_wzgledna_data ?? null,
        wiatr_poryw_10min: i.wiatr_poryw_10min ?? null,
        wiatr_poryw_10min_data: i.wiatr_poryw_10min_data ?? null,
        opad_10min: i.opad_10min ?? '0',
        opad_10min_data: i.opad_10min_data ?? new Date().toISOString(),
    }));

const transformHydro = (items: any[]): HydroData[] =>
    (Array.isArray(items) ? items : []).map((i) => ({
        id_stacji: i.id_stacji,
        stacja: i.stacja,
        rzeka: i.rzeka,
        wojewodztwo: i.wojewodztwo ?? '',
        lon: i.lon,
        lat: i.lat,
        stan_wody: i.stan_wody,
        stan_wody_data_pomiaru: i.stan_wody_data_pomiaru,
        temperatura_wody: i.temperatura_wody ?? null,
        temperatura_wody_data_pomiaru: i.temperatura_wody_data_pomiaru ?? null,
        przeplyw: i.przeplyw ?? null,
        przeplyw_data: i.przeplyw_data ?? null,
        zjawisko_lodowe: i.zjawisko_lodowe,
        zjawisko_lodowe_data_pomiaru: i.zjawisko_lodowe_data_pomiaru,
        zjawisko_zarastania: i.zjawisko_zarastania,
        zjawisko_zarastania_data_pomiaru: i.zjawisko_zarastania_data_pomiaru,
    }));

export const fetchSynopData = (options: Partial<FetchOptions<SynopData[]>> = {}) =>
    fetchApi<SynopData[]>('synop', {
        cacheKey: 'synop',
        ttlMs: CACHE_TTL.currentMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        transform: transformSynop,
        ...options,
    });

// Fetch SYNOP by station id
export const fetchSynopById = (id: string, options: Partial<FetchOptions<SynopData[]>> = {}) =>
    fetchApi<SynopData[]>(`synop/id/${encodeURIComponent(id)}`, {
        cacheKey: `synop_id_${id}`,
        ttlMs: CACHE_TTL.currentMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        transform: transformSynop,
        ...options,
    });

// Fetch SYNOP by station name (ASCII, without diacritics)
export const fetchSynopByStation = (nameAscii: string, options: Partial<FetchOptions<SynopData[]>> = {}) =>
    fetchApi<SynopData[]>(`synop/station/${encodeURIComponent(nameAscii)}`, {
        cacheKey: `synop_station_${nameAscii}`,
        ttlMs: CACHE_TTL.currentMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        transform: transformSynop,
        ...options,
    });

export const fetchHydroData = (options: Partial<FetchOptions<HydroData[]>> = {}) =>
    fetchApi<HydroData[]>('hydro', {
        cacheKey: 'hydro',
        ttlMs: CACHE_TTL.forecastMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        transform: transformHydro,
        ...options,
    });

// Fetch HYDRO by station id
export const fetchHydroById = (id: string, options: Partial<FetchOptions<HydroData[]>> = {}) =>
    fetchApi<HydroData[]>(`hydro/id/${encodeURIComponent(id)}`, {
        cacheKey: `hydro_id_${id}`,
        ttlMs: CACHE_TTL.forecastMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        transform: transformHydro,
        ...options,
    });

export const fetchMeteoData = (options: Partial<FetchOptions<MeteoData[]>> = {}) =>
    fetchApi<MeteoData[]>('meteo', {
        cacheKey: 'meteo',
        ttlMs: CACHE_TTL.forecastMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        transform: transformMeteo,
        ...options,
    });

// Fetch METEO by station code
export const fetchMeteoByCode = (code: string, options: Partial<FetchOptions<MeteoData[]>> = {}) =>
    fetchApi<MeteoData[]>(`meteo/kod_stacji/${encodeURIComponent(code)}`, {
        cacheKey: `meteo_code_${code}`,
        ttlMs: CACHE_TTL.forecastMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        transform: transformMeteo,
        ...options,
    });

export const fetchMeteoWarnings = (options: Partial<FetchOptions<any[]>> = {}) =>
    fetchApi<any[]>('warningsmeteo', {
        cacheKey: 'warningsmeteo',
        ttlMs: CACHE_TTL.warningsMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        ...options,
    });

export const fetchHydroWarnings = (options: Partial<FetchOptions<any[]>> = {}) =>
    fetchApi<any[]>('warningshydro', {
        cacheKey: 'warningshydro',
        ttlMs: CACHE_TTL.warningsMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        ...options,
    });

export const fetchAllWarnings = async (options?: { skipNetwork?: boolean }): Promise<WarningData[]> => {
    try {
        const [meteo, hydro] = await Promise.allSettled([
            fetchMeteoWarnings({ skipNetwork: options?.skipNetwork }),
            fetchHydroWarnings({ skipNetwork: options?.skipNetwork }),
        ]);

        console.log('Warnings fetch results:', {
            meteo: meteo.status,
            hydro: hydro.status,
            meteoData: meteo.status === 'fulfilled' ? meteo.value?.length : 'error',
            hydroData: hydro.status === 'fulfilled' ? hydro.value?.length : 'error'
        });

        const meteoWarnings: WarningData[] = (meteo.status === 'fulfilled' && Array.isArray(meteo.value) ? meteo.value : []).map((w: any) => {
            const levelRaw = w.stopien ?? w["stopień"] ?? w.level;
            const level = parseInt(levelRaw, 10);
            const regions = Array.isArray(w.teryt)
                ? w.teryt
                : typeof w.teryt === 'string' && w.teryt.length > 0
                    ? [w.teryt]
                    : [];
            const id = w.id || w.identyfikator || `${w.nazwa_zdarzenia ?? 'meteo'}_${w.obowiazuje_od ?? ''}_${w.obowiazuje_do ?? ''}`;
            return {
                id: id || 'unknown',
                type: 'meteo',
                level: Number.isFinite(level) ? level : 1,
                title: w.nazwa_zdarzenia || 'Ostrzeżenie meteorologiczne',
                description: w.tresc || '',
                validFrom: w.obowiazuje_od || '',
                validTo: w.obowiazuje_do || '',
                validUntil: w.obowiazuje_do || '',
                regions,
                probability: parseInt(w.prawdopodobienstwo, 10) || 0,
                comment: w.komentarz || '',
                published: w.opublikowano || '',
                office: w.biuro || '',
                // Additional fields for detailed view
                rawData: w
            } as WarningData;
        });

        const hydroWarnings: WarningData[] = (hydro.status === 'fulfilled' && Array.isArray(hydro.value) ? hydro.value : []).map((w: any) => {
            const levelRaw = w["stopień"] ?? w.stopien ?? w.level;
            const level = parseInt(levelRaw, 10);
            const id = w.numer || w.id || `${w.zdarzenie ?? 'hydro'}_${w.data_od ?? ''}_${w.data_do ?? ''}`;
            
            // Extract regions from obszary array
            const regions = Array.isArray(w.obszary) 
                ? w.obszary.map((o: any) => o.wojewodztwo).filter(Boolean)
                : [];
            
            return {
                id: id || 'unknown',
                type: 'hydro',
                level: Number.isFinite(level) ? level : 1,
                title: w.zdarzenie || 'Ostrzeżenie hydrologiczne',
                description: w.przebieg || '',
                validFrom: w.data_od || '',
                validTo: w.data_do || '',
                validUntil: w.data_do || '',
                regions,
                // pass-through full areas if present
                obszary: w.obszary || [],
                probability: parseInt(w.prawdopodobienstwo, 10) || 0,
                comment: w.komentarz || '',
                published: w.opublikowano || '',
                office: w.biuro || '',
                // Additional fields for detailed view
                rawData: w
            } as WarningData;
        });

        // Log any errors (but not when no warnings exist - that's normal)
        if (meteo.status === 'rejected') {
            const reason = meteo.reason;
            // Don't log as error if it's just "no warnings found"
            if (reason && typeof reason === 'object' && 'message' in reason && reason.message === 'No products were found') {
                console.log('No meteo warnings found - this is normal when no warnings are active');
            } else {
                console.error('Meteo warnings fetch failed:', reason);
            }
        }
        if (hydro.status === 'rejected') {
            const reason = hydro.reason;
            // Don't log as error if it's just "no warnings found"
            if (reason && typeof reason === 'object' && 'message' in reason && reason.message === 'No products were found') {
                console.log('No hydro warnings found - this is normal when no warnings are active');
            } else {
                console.error('Hydro warnings fetch failed:', reason);
            }
        }

        // Deduplicate by id+type and prefer higher level or longer validity
        const combined = [...meteoWarnings, ...hydroWarnings];
        const uniqueMap = new Map<string, WarningData>();
        for (const w of combined) {
            const key = `${w.type}:${w.id}`;
            const existing = uniqueMap.get(key);
            if (!existing) {
                uniqueMap.set(key, w);
                continue;
            }
            const shouldReplace = (w.level > existing.level) || (w.validTo > existing.validTo);
            if (shouldReplace) uniqueMap.set(key, w);
        }

        // Sort by severity descending then by validTo ascending (soonest first)
        return Array.from(uniqueMap.values()).sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            return (a.validTo || '').localeCompare(b.validTo || '');
        });
    } catch (error) {
        console.error('Error in fetchAllWarnings:', error);
        return [];
    }
};

// Filter warnings specifically for Pomeranian Voivodeship (województwo pomorskie)
export const filterWarningsForPomeranianVoivodeship = (warnings: WarningData[]): WarningData[] => {
    if (!Array.isArray(warnings)) {
        return [];
    }
    
    const pomeranianKeywords = [
        'pomorskie',
        'pomorsk',
        'województwo pomorskie',
        'wojewodztwo pomorskie',
        'gdańsk',
        'gdansk',
        'słupsk',
        'slupsk',
        'starogard',
        'chojnice',
        'kartuzy',
        'kościerzyna',
        'koscierzyna',
        'kwidzyn',
        'malbork',
        'nowy dwór gdański',
        'nowy dwor gdanski',
        'puck',
        'sopot',
        'tczew',
        'tczew',
        'wejherowo',
        'bytów',
        'bytow',
        'człuchów',
        'czluchow',
        'lębork',
        'lebork',
        'słupsk',
        'slupsk',
        'pomorskie województwo',
        'pomorskie wojewodztwo',
        // Dodatkowe lokalizacje z przykładu API
        'iławka',
        'dziarny',
        'drwęca',
        'wel',
        'pisa',
        'bałtyk',
        'morze bałtyckie',
        'hel',
        'jastarnia',
        'władysławowo',
        'krynica morska',
        'stegna',
        'nowy dwór gdański',
        'pruszcz gdański',
        'rumia',
        'reda',
        'wejherowo',
        'kartuzy',
        'żukowo',
        'zukowo',
        'sierakowice',
        'kartuzy',
        'kościerzyna',
        'koscierzyna',
        'lipusz',
        'dziemiany',
        'stężyca',
        'stężyca',
        'sulęczyno',
        'suleczyno',
        'linia',
        'lębork',
        'lebork',
        'słupsk',
        'slupsk',
        'ustka',
        'smołdzino',
        'smoldzino',
        'czarna dąbrówka',
        'czarna dabrowka',
        'potęgowo',
        'potegowo',
        'damnica',
        'dębnica kaszubska',
        'debnica kaszubska',
        'słupsk',
        'slupsk',
        'kobylnica',
        'główczyce',
        'glowczyce',
        'smołdzino',
        'smoldzino',
        'ustka',
        'słupsk',
        'slupsk',
        'bytów',
        'bytow',
        'miastko',
        'trzebielino',
        'człuchów',
        'czluchow',
        'debrzno',
        'przechlewo',
        'rzechlewo',
        'człuchów',
        'czluchow',
        'brusy',
        'konarzyny',
        'lipnica',
        'dąbrowa',
        'dabrowa',
        'chojnice',
        'brusy',
        'czersk',
        'chociński',
        'chocinski',
        'człuchów',
        'czluchow',
        'debrzno',
        'przechlewo',
        'rzechlewo',
        'człuchów',
        'czluchow',
        'brusy',
        'konarzyny',
        'lipnica',
        'dąbrowa',
        'dabrowa',
        'chojnice',
        'brusy',
        'czersk',
        'chociński',
        'chocinski'
    ];

    return warnings.filter(warning => {
        // If no regions specified, show the warning (general warnings)
        if (!warning.regions || !Array.isArray(warning.regions) || warning.regions.length === 0) {
            return true;
        }

        // Check if any of the warning regions match Pomeranian Voivodeship keywords
        return warning.regions.some(region => {
            if (!region || typeof region !== 'string') return false;
            const regionLower = region.toLowerCase();
            return pomeranianKeywords.some(keyword => 
                regionLower.includes(keyword.toLowerCase())
            );
        });
    });
};

// Enhanced forecast with hourly data and UV index
export const fetchForecast = async (
    coords: { latitude: number; longitude: number },
    options?: { skipNetwork?: boolean; ttlMs?: number }
) => {
    const { latitude, longitude } = coords;
    if (!latitude || !longitude) {
        console.log("No coordinates provided for forecast");
        return null;
    }
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset,windspeed_10m_max` +
        `&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m,pressure_msl,visibility,uv_index,dew_point_2m,cloudcover,wind_gusts_10m` +
        `&current_weather=true&timezone=Europe%2FWarsaw`;
    
    const cacheKey = `forecast_${latitude}_${longitude}`;
    const ttlMs = options?.ttlMs ?? CACHE_TTL.forecastMs;
    const cache = WeatherCache.getInstance();
    
    try {
        // Fresh-valid cache fast-path
        const cached = await cache.get<any>(cacheKey);
        if (cached) {
            console.log('Using cached forecast data');
            return cached;
        }

        if (options?.skipNetwork) {
            const stale = await cache.isStale(cacheKey) ? null : await cache.get<any>(cacheKey);
            if (stale) {
                console.log('Offline: using stale cached forecast');
                return stale;
            }
            return null;
        }

        console.log(`Fetching forecast from: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Kaszuby24-App/1.0',
            },
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Successfully fetched forecast data');
        await cache.set(cacheKey, data, ttlMs);
        return data;
    } catch (error) {
        console.error('Forecast fetch error:', error);
        const cacheKey = `forecast_${latitude}_${longitude}`;
        const stale = await cache.isStale(cacheKey) ? null : await cache.get<any>(cacheKey);
        if (stale) {
            console.log('Using expired cached forecast data as fallback');
            return stale;
        }
        return null;
    }
};

// Fetch air quality data (using Open-Meteo Air Quality API)
export const fetchAirQuality = async (
    coords: { latitude: number; longitude: number },
    options?: { skipNetwork?: boolean; ttlMs?: number }
) => {
    const { latitude, longitude } = coords;
    if (!latitude || !longitude) {
        console.log("No coordinates provided for air quality");
        return null;
    }
    
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
        `&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust` +
        `&timezone=Europe%2FWarsaw`;
    
    const cacheKey = `airquality_${latitude}_${longitude}`;
    const ttlMs = options?.ttlMs ?? CACHE_TTL.forecastMs;
    const cache = WeatherCache.getInstance();
    
    try {
        const cached = await cache.get<any>(cacheKey);
        if (cached) {
            console.log('Using cached air quality data');
            return cached;
        }

        if (options?.skipNetwork) {
            const stale = await cache.isStale(cacheKey) ? null : await cache.get<any>(cacheKey);
            if (stale) {
                console.log('Offline: using stale cached air quality');
                return stale;
            }
            return null;
        }

        console.log(`Fetching air quality from: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Kaszuby24-App/1.0',
            },
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Successfully fetched air quality data');
        await cache.set(cacheKey, data, ttlMs);
        return data;
    } catch (error) {
        console.error('Air quality fetch error:', error);
        const cacheKey = `airquality_${latitude}_${longitude}`;
        const stale = await cache.isStale(cacheKey) ? null : await cache.get<any>(cacheKey);
        if (stale) {
            console.log('Using expired cached air quality data as fallback');
            return stale;
        }
        return null;
    }
};

// Fetch marine forecast (Open-Meteo Marine API)
export const fetchMarineForecast = async (
    coords: { latitude: number; longitude: number },
    options?: { skipNetwork?: boolean; ttlMs?: number }
) => {
    const { latitude, longitude } = coords;
    if (!latitude || !longitude) {
        console.log("No coordinates provided for marine forecast");
        return null;
    }
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}` +
        `&hourly=wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period` +
        `&timezone=Europe%2FWarsaw`;

    const cacheKey = `marine_${latitude}_${longitude}`;
    const ttlMs = options?.ttlMs ?? CACHE_TTL.forecastMs;
    const cache = WeatherCache.getInstance();

    try {
        const cached = await cache.get<any>(cacheKey);
        if (cached) {
            console.log('Using cached marine forecast data');
            return cached;
        }

        if (options?.skipNetwork) {
            const stale = await cache.isStale(cacheKey) ? null : await cache.get<any>(cacheKey);
            if (stale) return stale;
            return null;
        }

        console.log(`Fetching marine forecast from: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: 'application/json', 'User-Agent': 'Kaszuby24-App/1.0' },
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        const data = await response.json();
        await cache.set(cacheKey, data, ttlMs);
        return data;
    } catch (error) {
        console.error('Marine forecast fetch error:', error);
        const stale = await cache.isStale(cacheKey) ? null : await cache.get<any>(cacheKey);
        if (stale) return stale;
        return null;
    }
};

// Fetch IMGW Product list (radar and other products)
export const fetchProductsList = (options: Partial<FetchOptions<any[]>> = {}) =>
    fetchApi<any[]>(`product`, {
        cacheKey: 'product_list',
        ttlMs: CACHE_TTL.historyMs,
        allowStale: true,
        retries: 2,
        backoffBaseMs: 400,
        ...options,
    });

// Test function to check available IMGW API endpoints
export const testIMGWEndpoints = async () => {
    const endpoints = [
        'warningsmeteo',
        'warningshydro',
        'warnings/meteo',
        'warnings/hydro',
        'meteo/warnings',
        'hydro/warnings',
        'meteo',
        'hydro',
        'synop'
    ];
    
    console.log('Testing IMGW API endpoints...');
    
    for (const endpoint of endpoints) {
        try {
            const url = `${API_BASE_URL}/${endpoint}`;
            console.log(`Testing: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Kaszuby24-App/1.0',
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${endpoint}: OK (${Array.isArray(data) ? data.length : 'object'} items)`);
            } else {
                console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint}: Error - ${error}`);
        }
    }
};

// --- HELPERS ---
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        return Infinity;
    }
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const findNearestStation = <T extends { lat: string | number, lon: string | number }>(
    userCoords: Location.LocationObjectCoords,
    stations: T[]
): T | null => {
    if (!stations || !Array.isArray(stations) || stations.length === 0) return null;

    let nearestStation: T | null = null;
    let minDistance = Infinity;

    stations.forEach(station => {
        const stationLat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat;
        const stationLon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon;

        if (!isNaN(stationLat) && !isNaN(stationLon)) {
            const distance = calculateDistance(
                userCoords.latitude,
                userCoords.longitude,
                stationLat,
                stationLon
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestStation = station;
            }
        }
    });

    return nearestStation;
};

export const findNearestSynopStation = (userCoords: Location.LocationObjectCoords): StationInfo & { distance?: number } => {
    if (!userCoords || isNaN(userCoords.latitude) || isNaN(userCoords.longitude)) {
        return { ...SYNOP_STATIONS[0], distance: 0 };
    }
    
    let nearestStation = SYNOP_STATIONS[0];
    let minDistance = Infinity;
    
    SYNOP_STATIONS.forEach(station => {
        if (isNaN(station.lat) || isNaN(station.lon)) return;
        
        const distance = calculateDistance(
            userCoords.latitude,
            userCoords.longitude,
            station.lat,
            station.lon
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestStation = station;
        }
    });
    
    console.log(`Nearest station: ${nearestStation.name} at ${minDistance.toFixed(1)} km`);
    return { ...nearestStation, distance: minDistance };
}

// Find multiple nearest stations sorted by distance
export const findNearestStations = <T extends { lat: string | number, lon: string | number }>(
    userCoords: Location.LocationObjectCoords,
    stations: T[],
    limit: number = 5
): T[] => {
    if (!stations || !Array.isArray(stations) || stations.length === 0) return [];

    const stationsWithDistance = stations.map(station => {
        const stationLat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat;
        const stationLon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon;
        
        const distance = calculateDistance(
            userCoords.latitude,
            userCoords.longitude,
            stationLat,
            stationLon
        );
        
        return { ...station, distance };
    });

    // Sort by distance and return top N
    return stationsWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)
        .map(({ distance, ...station }) => station as unknown as T);
};

// Find nearest stations and include distance in results
export const findNearestStationsWithDistance = <T extends { lat: string | number, lon: string | number }>(
    userCoords: Location.LocationObjectCoords,
    stations: T[],
    limit: number = 5
): Array<T & { distance: number }> => {
    if (!stations || !Array.isArray(stations) || stations.length === 0) return [];

    const stationsWithDistance = stations.map(station => {
        const stationLat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat;
        const stationLon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon;
        const distance = calculateDistance(
            userCoords.latitude,
            userCoords.longitude,
            stationLat as number,
            stationLon as number
        );
        return { ...(station as any), distance } as T & { distance: number };
    });

    return stationsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, limit);
};

// Export cache clear for manual refresh
export const clearWeatherCache = () => WeatherCache.getInstance().clear();
