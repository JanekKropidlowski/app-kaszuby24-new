import axios from 'axios';

export interface AEDPoint {
    id: string;
    lat: number;
    lon: number;
    location?: string;
    access?: string;
    operator?: string;
    phone?: string;
    opening_hours?: string;
    indoor?: string;
    // Additional GeoJSON properties
    description?: string;
    'defibrillator:location'?: string;
    'defibrillator:brand'?: string;
    model?: string;
    manufacturer?: string;
    addr_street?: string;
    addr_housenumber?: string;
    addr_city?: string;
    addr_postcode?: string;
    addr_full?: string;
    level?: string;
    floor?: string;
    note?: string;
    email?: string;
    website?: string;
    wheelchair?: string;
    name?: string;
    ref?: string;
    room?: string;
    check_date?: string;
    installation_date?: string;
    [key: string]: string | number | undefined; // Allows any other GeoJSON property
}

const CACHE: Record<string, { data: AEDPoint[], timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

export const AedService = {
    // Fetches AED points around a specific coordinate to stay lightweight
    fetchNearbyAed: async (lat: number, lon: number, radiusMeters: number = 10000): Promise<AEDPoint[]> => {
        const cacheKey = `radius_${lat.toFixed(3)}_${lon.toFixed(3)}_${radiusMeters}`;
        if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].timestamp < CACHE_TTL) {
            return CACHE[cacheKey].data;
        }

        try {
            const query = `
                [out:json][timeout:15];
                (
                  node["emergency"="defibrillator"](around:${radiusMeters},${lat},${lon});
                );
                out body;
            `;
            const response = await axios.post('https://overpass-api.de/api/interpreter', query);

            const result = (response.data.elements || []).map((el: any) => ({
                id: el.id.toString(),
                lat: el.lat,
                lon: el.lon,
                location: el.tags?.['description'] || el.tags?.['location'] || 'Punkt AED',
                access: el.tags?.['access'] || 'publiczny'
            }));

            CACHE[cacheKey] = { data: result, timestamp: Date.now() };
            return result;
        } catch (e) {
            console.warn("AED Fetch Error (fallback to empty):", e);
            return [];
        }
    },

    fetchInBbox: async (minLat: number, minLon: number, maxLat: number, maxLon: number): Promise<AEDPoint[]> => {
        const cacheKey = `bbox_${minLat.toFixed(2)}_${minLon.toFixed(2)}_${maxLat.toFixed(2)}_${maxLon.toFixed(2)}`;
        if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].timestamp < CACHE_TTL) {
            return CACHE[cacheKey].data;
        }

        try {
            const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
            const query = `
                [out:json][timeout:15];
                (
                  node["emergency"="defibrillator"](${bbox});
                );
                out body;
            `;
            const response = await axios.post('https://overpass-api.de/api/interpreter', query);

            const result = (response.data.elements || []).map((el: any) => ({
                id: el.id.toString(),
                lat: el.lat,
                lon: el.lon,
                location: el.tags?.['description'] || el.tags?.['location'] || 'Punkt AED',
                access: el.tags?.['access'] || 'publiczny'
            }));

            CACHE[cacheKey] = { data: result, timestamp: Date.now() };
            return result;
        } catch (e) {
            console.warn("AED BBox Fetch Error:", e);
            return [];
        }
    }
};
