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
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const OPENWEATHER_API_KEY = 'YOUR_API_KEY'; // You'll need to add your API key

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
class WeatherCache {
    private static async getCacheKey(endpoint: string): Promise<string> {
        return `weather_cache_${endpoint}`;
    }

    static async get<T>(endpoint: string): Promise<T | null> {
        try {
            const key = await this.getCacheKey(endpoint);
            const cached = await AsyncStorage.getItem(key);
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            if (now - timestamp > CACHE_DURATION) {
                await AsyncStorage.removeItem(key);
                return null;
            }
            
            return data as T;
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    }

    static async set<T>(endpoint: string, data: T): Promise<void> {
        try {
            const key = await this.getCacheKey(endpoint);
            const cacheData = {
                data,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(key, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }

    static async clear(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const weatherKeys = keys.filter(key => key.startsWith('weather_cache_'));
            await AsyncStorage.multiRemove(weatherKeys);
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }
}

// --- GENERIC API FETCHER WITH CACHE ---
const fetchApi = async <T>(endpoint: string, useCache = true): Promise<T> => {
    try {
        // Check cache first
        if (useCache) {
            const cached = await WeatherCache.get<T>(endpoint);
            if (cached) {
                console.log(`Using cached data for ${endpoint}`);
                return cached;
            }
        }

        console.log(`Fetching fresh data from: ${API_BASE_URL}/${endpoint}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Kaszuby24-App/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Successfully fetched ${endpoint}, data length: ${Array.isArray(data) ? data.length : 'object'}`);
        
        // Cache the response
        if (useCache) {
            await WeatherCache.set(endpoint, data);
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
        
        // Try to return cached data even if expired as fallback
        if (useCache) {
            try {
                const key = `weather_cache_${endpoint}`;
                const cached = await AsyncStorage.getItem(key);
                if (cached) {
                    const { data } = JSON.parse(cached);
                    console.log(`Using expired cached data for ${endpoint} as fallback`);
                    return data as T;
                }
            } catch (cacheError) {
                console.error('Failed to get fallback cache:', cacheError);
            }
        }
        
        throw error;
    }
};

// --- API FETCH FUNCTIONS ---
export const fetchSynopData = () => fetchApi<SynopData[]>('synop');
export const fetchHydroData = () => fetchApi<HydroData[]>('hydro');
export const fetchMeteoData = () => fetchApi<MeteoData[]>('meteo');
export const fetchMeteoWarnings = () => fetchApi<any[]>('warningsmeteo');
export const fetchHydroWarnings = () => fetchApi<any[]>('warningshydro');

export const fetchAllWarnings = async (): Promise<WarningData[]> => {
    const [meteo, hydro] = await Promise.all([fetchMeteoWarnings(), fetchHydroWarnings()]);

    const meteoWarnings: WarningData[] = (meteo || []).map(w => ({
        id: w.id,
        type: 'meteo',
        level: parseInt(w.stopien, 10) || 1,
        title: w.nazwa_zdarzenia || 'Ostrzeżenie meteorologiczne',
        description: w.tresc || '',
        validFrom: w.obowiazuje_od,
        validTo: w.obowiazuje_do,
        validUntil: w.obowiazuje_do, // For backward compatibility
        regions: w.teryt || [],
        probability: parseInt(w.prawdopodobienstwo) || 0,
        comment: w.komentarz
    }));

    const hydroWarnings: WarningData[] = (hydro || []).map(w => ({
        id: w.numer,
        type: 'hydro',
        level: parseInt(w.stopień || w.stopien, 10) || 1,
        title: w.zdarzenie || 'Ostrzeżenie hydrologiczne',
        description: w.przebieg || '',
        validFrom: w.data_od,
        validTo: w.data_do,
        validUntil: w.data_do, // For backward compatibility
        regions: w.obszary?.map((o: any) => o.wojewodztwo) || [],
        obszary: w.obszary,
        probability: parseInt(w.prawdopodobienstwo) || 0,
        comment: w.komentarz
    }));

    return [...meteoWarnings, ...hydroWarnings];
};

// Enhanced forecast with hourly data and UV index
export const fetchForecast = async (coords: { latitude: number; longitude: number; }) => {
    const { latitude, longitude } = coords;
    if (!latitude || !longitude) return null;
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max` +
        `&hourly=temperature_2m,precipitation_probability,precipitation,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m,pressure_msl,visibility` +
        `&current_weather=true&timezone=Europe%2FWarsaw`;
    
    try {
        const cached = await WeatherCache.get<any>(`forecast_${latitude}_${longitude}`);
        if (cached) return cached;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch forecast");
        const data = await response.json();
        
        await WeatherCache.set(`forecast_${latitude}_${longitude}`, data);
        return data;
    } catch(error) {
        console.error("Forecast fetch error:", error);
        return null;
    }
};

// Fetch air quality data (using Open-Meteo Air Quality API)
export const fetchAirQuality = async (coords: { latitude: number; longitude: number; }) => {
    const { latitude, longitude } = coords;
    if (!latitude || !longitude) return null;
    
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
        `&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth,dust` +
        `&timezone=Europe%2FWarsaw`;
    
    try {
        const cached = await WeatherCache.get<any>(`airquality_${latitude}_${longitude}`);
        if (cached) return cached;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch air quality");
        const data = await response.json();
        
        await WeatherCache.set(`airquality_${latitude}_${longitude}`, data);
        return data;
    } catch(error) {
        console.error("Air quality fetch error:", error);
        return null;
    }
};

// --- HELPERS ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
    if (!stations || stations.length === 0) return null;

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
    let nearestStation = SYNOP_STATIONS[0];
    let minDistance = Infinity;
    
    SYNOP_STATIONS.forEach(station => {
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
    if (!stations || stations.length === 0) return [];

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

// Export cache clear for manual refresh
export const clearWeatherCache = WeatherCache.clear;
