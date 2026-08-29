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
    isDuty?: boolean;
    dutyHours?: string;
    city?: string;
}

// Primary: kaszuby24.pl static JSON — GIF registry + OSM geocoding + BIP duty hours (daily cron)
// Fallback: Overpass API live query
const KASZUBY24_PHARMACY_URL = 'https://kaszuby24.pl/public/data/apteki-pomorskie.json';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const CACHE: Record<string, { data: PharmacyPoint[]; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60; // 1h — data changes slowly
const K24_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h for static JSON

let _k24All: PharmacyPoint[] | null = null;
let _k24At = 0;

// Convert hours object from kaszuby24 format to OSM-style string
function hoursToOsm(hours: Record<string, string>): string {
    if (!hours || !Object.keys(hours).length) return '';
    const dayMap: Record<string, string> = { pon: 'Mo', wt: 'Tu', sr: 'We', czw: 'Th', pt: 'Fr', sob: 'Sa', nd: 'Su' };
    const val = Object.values(hours)[0];
    if (val === '24h') return '24/7';
    // Group consecutive days with same hours
    const parts: string[] = [];
    const entries = Object.entries(hours);
    let i = 0;
    while (i < entries.length) {
        const [day, h] = entries[i];
        let j = i + 1;
        while (j < entries.length && entries[j][1] === h) j++;
        if (j - i > 1) {
            parts.push(`${dayMap[day] || day}-${dayMap[entries[j-1][0]] || entries[j-1][0]} ${h}`);
        } else {
            parts.push(`${dayMap[day] || day} ${h}`);
        }
        i = j;
    }
    return parts.join('; ');
}

async function fetchFromKaszuby24(): Promise<PharmacyPoint[]> {
    if (_k24All && Date.now() - _k24At < K24_CACHE_TTL) return _k24All;
    try {
        const resp = await fetch(KASZUBY24_PHARMACY_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: any[] = await resp.json();

        _k24All = data
            .filter(p => p.lat && p.lng)
            .map(p => ({
                id: p.id,
                lat: p.lat,
                lon: p.lng,
                name: p.name || 'Apteka',
                address: `${p.street || ''} ${p.num || ''}`.trim() || '',
                city: p.city || '',
                opening_hours: hoursToOsm(p.hours || {}),
                phone: p.phone || undefined,
                is24h: p.is24h || false,
                isDuty: p.isDuty || false,
                dutyHours: p.dutyHours || undefined,
            }));

        _k24At = Date.now();
        return _k24All;
    } catch (e) {
        console.warn('[PharmacyService] kaszuby24.pl fetch failed:', e);
        return [];
    }
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export const PharmacyService = {
    // Returns all Pomeranian pharmacies from kaszuby24.pl (GIF+OSM data, richer than Overpass)
    fetchAll: async (): Promise<PharmacyPoint[]> => {
        return fetchFromKaszuby24();
    },

    // Returns pharmacies near a location — filtered from full kaszuby24.pl dataset
    fetchNearbyPharmacies: async (lat: number, lon: number, radiusMeters: number = 7000): Promise<PharmacyPoint[]> => {
        const cacheKey = `k24_radius_${lat.toFixed(3)}_${lon.toFixed(3)}_${radiusMeters}`;
        if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].timestamp < CACHE_TTL) {
            return CACHE[cacheKey].data;
        }

        // Try kaszuby24.pl first
        const all = await fetchFromKaszuby24();
        if (all.length > 0) {
            const nearby = all
                .filter(p => haversineM(lat, lon, p.lat, p.lon) <= radiusMeters)
                .sort((a, b) => haversineM(lat, lon, a.lat, a.lon) - haversineM(lat, lon, b.lat, b.lon));
            CACHE[cacheKey] = { data: nearby, timestamp: Date.now() };
            return nearby;
        }

        // Fallback: Overpass live
        try {
            const query = `[out:json][timeout:15];(node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon});way["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon}););out center;`;
            const response = await axios.post(OVERPASS_URL, query);
            const result: PharmacyPoint[] = (response.data.elements || []).map((el: any) => ({
                id: el.id.toString(),
                lat: el.lat || el.center?.lat,
                lon: el.lon || el.center?.lon,
                name: el.tags?.name || 'Apteka',
                address: `${el.tags?.['addr:street'] || ''} ${el.tags?.['addr:housenumber'] || ''}`.trim() || 'Adres nieznany',
                opening_hours: el.tags?.opening_hours,
                phone: el.tags?.phone || el.tags?.['contact:phone'],
                is24h: el.tags?.opening_hours === '24/7',
            })).filter((p: any) => p.lat && p.lon);
            CACHE[cacheKey] = { data: result, timestamp: Date.now() };
            return result;
        } catch (e) {
            console.warn('[PharmacyService] Overpass fallback failed:', e);
            return [];
        }
    },

    fetchInBbox: async (minLat: number, minLon: number, maxLat: number, maxLon: number): Promise<PharmacyPoint[]> => {
        const cacheKey = `k24_bbox_${minLat.toFixed(2)}_${minLon.toFixed(2)}_${maxLat.toFixed(2)}_${maxLon.toFixed(2)}`;
        if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].timestamp < CACHE_TTL) {
            return CACHE[cacheKey].data;
        }

        // Try kaszuby24.pl first
        const all = await fetchFromKaszuby24();
        if (all.length > 0) {
            const inBox = all.filter(p =>
                p.lat >= minLat && p.lat <= maxLat && p.lon >= minLon && p.lon <= maxLon
            );
            CACHE[cacheKey] = { data: inBox, timestamp: Date.now() };
            return inBox;
        }

        // Fallback: Overpass
        try {
            const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
            const query = `[out:json][timeout:15];(node["amenity"="pharmacy"](${bbox});way["amenity"="pharmacy"](${bbox}););out center;`;
            const response = await axios.post(OVERPASS_URL, query);
            const result: PharmacyPoint[] = (response.data.elements || []).map((el: any) => ({
                id: el.id.toString(),
                lat: el.lat || el.center?.lat,
                lon: el.lon || el.center?.lon,
                name: el.tags?.name || 'Apteka',
                address: `${el.tags?.['addr:street'] || ''} ${el.tags?.['addr:housenumber'] || ''}`.trim() || 'Adres nieznany',
                opening_hours: el.tags?.opening_hours,
                phone: el.tags?.phone || el.tags?.['contact:phone'],
                is24h: el.tags?.opening_hours === '24/7',
            })).filter((p: any) => p.lat && p.lon);
            CACHE[cacheKey] = { data: result, timestamp: Date.now() };
            return result;
        } catch (e) {
            console.warn('[PharmacyService] Overpass BBox fallback failed:', e);
            return [];
        }
    },
};
