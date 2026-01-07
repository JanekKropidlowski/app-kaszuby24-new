import axios from 'axios';

export interface PKSStop {
    id: string;
    name: string;
    lat: number;
    lon: number;
    region?: string;
    agency?: string;
}

export interface PKSTimetableEntry {
    time: string;
    line: string;
    destination: string;
    isRealtime?: boolean;
}

const PKS_PROVIDERS = {
    // PKS Gdynia - już obsługiwany w transportService
    gdynia: {
        name: 'PKS Gdynia',
        api: 'https://pksgdynia.kiedyprzyjedzie.pl',
        region: 'pomorskie'
    },
    // Inne PKS w regionie - przygotowane na przyszłość
    gdansk: {
        name: 'PKS Gdańsk',
        api: null, // Do dodania gdy będzie dostępne API
        region: 'pomorskie'
    },
    wejherowo: {
        name: 'PKS Wejherowo',
        api: null, // Do dodania gdy będzie dostępne API
        region: 'pomorskie'
    },
    slupsk: {
        name: 'PKS Słupsk',
        api: null,
        region: 'pomorskie'
    }
};

const WP_API_BASE = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/transport';

/**
 * Pobiera przystanki PKS dla danego regionu
 */
export const fetchPKSStops = async (region: 'gdynia' | 'gdansk' | 'wejherowo' | 'slupsk' | 'all' = 'all'): Promise<PKSStop[]> => {
    try {
        if (region === 'gdynia') {
            // Używa istniejącego API PKS Gdynia
            const response = await axios.get(`${WP_API_BASE}/stops`, {
                params: { agency: 'pksgdynia' },
                timeout: 30000
            });
            return response.data.map((stop: any) => ({
                ...stop,
                region: 'gdynia',
                agency: 'pksgdynia'
            }));
        }

        if (region === 'all') {
            // Ładuj wszystkie dostępne regiony
            const regions = ['gdynia' as const]; // Na razie tylko gdynia jest dostępna
            const allStops: PKSStop[] = [];

            for (const reg of regions) {
                try {
                    const stops = await fetchPKSStops(reg);
                    allStops.push(...stops);
                } catch (e) {
                    console.warn(`Failed to load PKS stops for ${reg}:`, e);
                }
            }

            return allStops;
        }

        // Dla innych regionów - placeholder na przyszłość
        console.log(`PKS region ${region} not yet implemented`);
        return [];

    } catch (error) {
        console.warn('Error fetching PKS stops:', error);
        return [];
    }
};

/**
 * Pobiera rozkład jazdy dla przystanku PKS
 */
export const fetchPKSTimetable = async (stopId: string, region: string = 'gdynia'): Promise<PKSTimetableEntry[]> => {
    try {
        const response = await axios.get(`${WP_API_BASE}/timetable`, {
            params: {
                agency: region === 'gdynia' ? 'pksgdynia' : region,
                stop_id: stopId
            },
            timeout: 10000
        });
        return response.data || [];
    } catch (error) {
        console.warn(`Error fetching PKS timetable for ${stopId}:`, error);
        return [];
    }
};

/**
 * Pobiera wszystkie przystanki PKS w województwie pomorskim
 */
export const fetchPKSPomorskie = async (): Promise<PKSStop[]> => {
    return await fetchPKSStops('all');
};

/**
 * Znajduje najbliższe przystanki PKS
 */
export const findNearestPKSStops = async (lat: number, lng: number, limit: number = 5): Promise<PKSStop[]> => {
    try {
        const allStops = await fetchPKSPomorskie();
        return allStops
            .map(stop => ({
                ...stop,
                distance: calculateDistance(lat, lng, stop.lat, stop.lon)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);
    } catch (error) {
        console.warn('Error finding nearest PKS stops:', error);
        return [];
    }
};

/**
 * Oblicza odległość między dwoma punktami (w km)
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Promień Ziemi w km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
};
