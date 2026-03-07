import axios from 'axios';

export interface PharmacyPoint {
    id: string;
    lat: number;
    lon: number;
    name: string;
    address: string;
    opening_hours?: string;
    phone?: string;
    is24h?: boolean;
}

const CACHE: Record<string, { data: PharmacyPoint[], timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export const PharmacyService = {
    fetchNearbyPharmacies: async (lat: number, lon: number, radiusMeters: number = 7000): Promise<PharmacyPoint[]> => {
        const cacheKey = `radius_${lat.toFixed(3)}_${lon.toFixed(3)}_${radiusMeters}`;
        if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].timestamp < CACHE_TTL) {
            return CACHE[cacheKey].data;
        }

        try {
            const query = `
                [out:json][timeout:15];
                (
                  node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon});
                  way["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon});
                );
                out center;
            `;
            const response = await axios.post('https://overpass-api.de/api/interpreter', query);

            const result = (response.data.elements || []).map((el: any) => ({
                id: el.id.toString(),
                lat: el.lat || el.center?.lat,
                lon: el.lon || el.center?.lon,
                name: el.tags?.name || 'Apteka',
                address: `${el.tags?.['addr:street'] || ''} ${el.tags?.['addr:housenumber'] || ''}`.trim() || 'Adres nieznany',
                opening_hours: el.tags?.opening_hours,
                phone: el.tags?.phone || el.tags?.['contact:phone']
            })).filter((p: any) => p.lat && p.lon);

            CACHE[cacheKey] = { data: result, timestamp: Date.now() };
            return result;
        } catch (e) {
            console.warn("Pharmacy Fetch Error (fallback to empty):", e);
            return [];
        }
    },

    fetchInBbox: async (minLat: number, minLon: number, maxLat: number, maxLon: number): Promise<PharmacyPoint[]> => {
        const cacheKey = `bbox_${minLat.toFixed(2)}_${minLon.toFixed(2)}_${maxLat.toFixed(2)}_${maxLon.toFixed(2)}`;
        if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].timestamp < CACHE_TTL) {
            return CACHE[cacheKey].data;
        }

        try {
            const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
            const query = `
                [out:json][timeout:15];
                (
                  node["amenity"="pharmacy"](${bbox});
                  way["amenity"="pharmacy"](${bbox});
                );
                out center;
            `;
            const response = await axios.post('https://overpass-api.de/api/interpreter', query);

            const result = (response.data.elements || []).map((el: any) => ({
                id: el.id.toString(),
                lat: el.lat || el.center?.lat,
                lon: el.lon || el.center?.lon,
                name: el.tags?.name || 'Apteka',
                address: `${el.tags?.['addr:street'] || ''} ${el.tags?.['addr:housenumber'] || ''}`.trim() || 'Adres nieznany',
                opening_hours: el.tags?.opening_hours,
                phone: el.tags?.phone || el.tags?.['contact:phone']
            })).filter((p: any) => p.lat && p.lon);

            CACHE[cacheKey] = { data: result, timestamp: Date.now() };
            return result;
        } catch (e) {
            console.warn("Pharmacy BBox Fetch Error:", e);
            return [];
        }
    }
};
