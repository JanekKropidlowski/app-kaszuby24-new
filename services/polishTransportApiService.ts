import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PolishTransportStop {
    id: string;
    name: string;
    lat: number;
    lon: number;
    agency: string;
    lines?: string[];
}

export interface PolishTransportDeparture {
    line: string;
    destination: string;
    time: string;
    delay?: number;
    isRealtime?: boolean;
}

// Known Polish transport APIs
const POLISH_APIS = {
    // ZTM Gdańsk (Gdańsk Transport Authority) - CONFIRMED WORKING
    ztm_gdansk: {
        baseUrl: 'https://ckan2.multimediagdansk.pl',
        stopsEndpoint: '/stops',
        departuresEndpoint: '/stopArrivals',
        vehiclesEndpoint: '/gpsPositions',
        stopsParams: { date: new Date().toISOString().split('T')[0] },
        departuresParams: (stopId: string) => ({ stopId })
    },

    // ZKM Gdynia - GTFS available but no direct API
    zkm_gdynia: {
        baseUrl: 'https://zkmgdynia.pl',
        stopsEndpoint: '/api/stops',
        departuresEndpoint: '/api/departures',
        gtfsUrl: 'https://gtfs.zkmgdynia.pl/gtfs.zip'
    },

    // MZK Wejherowo - GTFS available
    mzk_wejherowo: {
        baseUrl: 'https://mzkwejherowo.pl',
        stopsEndpoint: '/api/stops',
        departuresEndpoint: '/api/departures',
        gtfsUrl: 'https://gtfs.mzkwejherowo.pl/gtfs.zip'
    },

    // Polregio (Regional trains) - API may exist
    polregio: {
        baseUrl: 'https://polregio.pl',
        stopsEndpoint: '/api/stations',
        departuresEndpoint: '/api/departures'
    },

    // PKP Intercity (Long distance trains)
    pkp_intercity: {
        baseUrl: 'https://www.intercity.pl',
        stopsEndpoint: '/api/stations',
        departuresEndpoint: '/api/departures'
    },

    // Additional Polish APIs that might exist
    warsaw_ztm: {
        baseUrl: 'https://api.um.warszawa.pl',
        stopsEndpoint: '/api/action/dbstore_get',
        departuresEndpoint: '/api/action/dbtimetable_get'
    },

    krakow_mpz: {
        baseUrl: 'https://www.mpk.krakow.pl',
        stopsEndpoint: '/api/stops',
        departuresEndpoint: '/api/departures'
    }
};

const CACHE_PREFIX = 'polish_transport_';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

/**
 * Polish Transport API Service
 * Provides access to various Polish public transport APIs
 */
export class PolishTransportApiService {

    /**
     * Fetch stops from a specific agency
     */
    static async fetchStops(agency: keyof typeof POLISH_APIS, bbox?: {
        minLat: number,
        minLon: number,
        maxLat: number,
        maxLon: number
    }): Promise<PolishTransportStop[]> {
        const cacheKey = `${CACHE_PREFIX}stops_${agency}`;
        const cached = await AsyncStorage.getItem(cacheKey);

        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
                return data;
            }
        }

        try {
            const api = POLISH_APIS[agency];
            let params: any = {};

            // Handle special parameters for different APIs
            if (agency === 'ztm_gdansk' && api.stopsParams) {
                params = { ...api.stopsParams };
            }

            if (bbox) {
                params.minLat = bbox.minLat;
                params.minLon = bbox.minLon;
                params.maxLat = bbox.maxLat;
                params.maxLon = bbox.maxLon;
            }

            const response = await axios.get(`${api.baseUrl}${api.stopsEndpoint}`, {
                params,
                timeout: 10000,
                headers: {
                    'User-Agent': 'Kaszuby24-App/1.0',
                    'Accept': 'application/json'
                }
            });

            const stops = this.normalizeStops(response.data, agency);

            // Cache the results
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                data: stops,
                timestamp: Date.now()
            }));

            return stops;
        } catch (error) {
            console.warn(`Error fetching stops for ${agency}:`, error);
            return [];
        }
    }

    /**
     * Fetch departures for a specific stop
     */
    static async fetchDepartures(agency: keyof typeof POLISH_APIS, stopId: string): Promise<PolishTransportDeparture[]> {
        const cacheKey = `${CACHE_PREFIX}departures_${agency}_${stopId}`;
        const cached = await AsyncStorage.getItem(cacheKey);

        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY / 2) { // Shorter cache for departures
                return data;
            }
        }

        try {
            const api = POLISH_APIS[agency];
            const url = `${api.baseUrl}${api.departuresEndpoint}/${stopId}`;

            const response = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Kaszuby24-App/1.0',
                    'Accept': 'application/json'
                }
            });

            const departures = this.normalizeDepartures(response.data, agency);

            // Cache the results
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                data: departures,
                timestamp: Date.now()
            }));

            return departures;
        } catch (error) {
            console.warn(`Error fetching departures for ${agency}/${stopId}:`, error);
            return [];
        }
    }

    /**
     * Fetch real-time vehicle positions
     */
    static async fetchVehicles(agency: keyof typeof POLISH_APIS): Promise<any[]> {
        try {
            const api = POLISH_APIS[agency];
            if (!api.vehiclesEndpoint) {
                return [];
            }

            const url = `${api.baseUrl}${api.vehiclesEndpoint}?v=2`;

            const response = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Kaszuby24-App/1.0',
                    'Accept': 'application/json'
                }
            });

            return response.data || [];
        } catch (error) {
            console.warn(`Error fetching vehicles for ${agency}:`, error);
            return [];
        }
    }

    /**
     * Normalize stops data from different APIs to common format
     */
    private static normalizeStops(data: any, agency: string): PolishTransportStop[] {
        // Handle different response formats
        let stopsArray = data;
        if (data && data.stops && Array.isArray(data.stops)) {
            stopsArray = data.stops; // ZTM Gdańsk format
        }
        if (!Array.isArray(stopsArray)) return [];

        return stopsArray.map(stop => ({
            id: `${agency}_${stop.stopId || stop.id || stop.code}`,
            name: stop.stopName || stop.name || stop.stationName,
            lat: parseFloat((stop.stopLat || stop.lat || stop.latitude || '0').replace(',', '.')),
            lon: parseFloat((stop.stopLon || stop.lon || stop.longitude || '0').replace(',', '.')),
            agency: agency,
            lines: stop.lines || stop.routes || []
        })).filter(stop =>
            stop.name &&
            !isNaN(stop.lat) &&
            !isNaN(stop.lon) &&
            stop.lat !== 0 &&
            stop.lon !== 0
        );
    }

    /**
     * Normalize departures data from different APIs to common format
     */
    private static normalizeDepartures(data: any, agency: string): PolishTransportDeparture[] {
        if (!Array.isArray(data)) return [];

        return data.map(dep => ({
            line: dep.line || dep.route || dep.trainNumber,
            destination: dep.destination || dep.direction || dep.headsign,
            time: dep.time || dep.departureTime || dep.scheduledTime,
            delay: dep.delay || 0,
            isRealtime: dep.isRealtime || false
        })).filter(dep =>
            dep.line && dep.destination && dep.time
        );
    }

    /**
     * Search stops across multiple agencies
     */
    static async searchStops(query: string, agencies: (keyof typeof POLISH_APIS)[] = ['ztm_gdansk', 'zkm_gdynia']): Promise<PolishTransportStop[]> {
        const q = query.toLowerCase().trim();
        if (q.length < 2) return [];

        const allStops: PolishTransportStop[] = [];

        // Fetch stops from selected agencies in parallel
        const promises = agencies.map(agency => this.fetchStops(agency));
        const results = await Promise.all(promises);

        results.forEach(stops => allStops.push(...stops));

        // Filter by query
        return allStops.filter(stop =>
            stop.name.toLowerCase().includes(q)
        ).slice(0, 10); // Limit results
    }

    /**
     * Get combined departures for a stop across multiple agencies
     */
    static async getCombinedDepartures(stopName: string, agencies: (keyof typeof POLISH_APIS)[] = ['ztm_gdansk', 'zkm_gdynia']): Promise<{
        stop: PolishTransportStop | null,
        departures: PolishTransportDeparture[]
    }> {
        // First find the stop
        const stops = await this.searchStops(stopName, agencies);
        if (stops.length === 0) {
            return { stop: null, departures: [] };
        }

        const stop = stops[0];
        const departures = await this.fetchDepartures(stop.agency as keyof typeof POLISH_APIS, stop.id.split('_')[1]);

        return { stop, departures };
    }

    /**
     * Check API availability
     */
    static async checkApiStatus(agency: keyof typeof POLISH_APIS): Promise<boolean> {
        try {
            const api = POLISH_APIS[agency];
            await axios.get(`${api.baseUrl}${api.stopsEndpoint}`, {
                timeout: 5000,
                headers: { 'User-Agent': 'Kaszuby24-App/1.0' }
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get all available agencies
     */
    static getAvailableAgencies(): (keyof typeof POLISH_APIS)[] {
        return Object.keys(POLISH_APIS) as (keyof typeof POLISH_APIS)[];
    }

    /**
     * Clear cache for specific agency or all
     */
    static async clearCache(agency?: keyof typeof POLISH_APIS): Promise<void> {
        const keys = await AsyncStorage.getAllKeys();
        let pksKeys: string[];

        if (agency) {
            pksKeys = keys.filter(key => key.startsWith(`${CACHE_PREFIX}${agency}`));
        } else {
            pksKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
        }

        await AsyncStorage.multiRemove(pksKeys);
    }
}
