import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PKSScraperService } from './pksScraperService';
import { PolishTransportApiService } from './polishTransportApiService';
import { tileCache } from './tileCache';

// Simple Polyline Decoder
const decodePolyline = (encoded: string) => {
    if (!encoded) return [];
    try {
        const poly = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
        }
        return poly;
    } catch (e) {
        console.warn('Polyline Decode Error', e);
        return [];
    }
};

// Simple Polyline Decoder functionality restored above...

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const findNearestIndex = (path: { latitude: number, longitude: number }[], lat: number, lon: number) => {
    let minIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < path.length; i++) {
        const d = getDistance(path[i].latitude, path[i].longitude, lat, lon);
        if (d < minDist) {
            minDist = d;
            minIdx = i;
        }
    }
    return minIdx;
};

const slicePolyline = (path: { latitude: number, longitude: number }[], start: { lat: number, lon: number }, end: { lat: number, lon: number }) => {
    if (!path || path.length < 2) return path;
    const iA = findNearestIndex(path, start.lat, start.lon);
    const iB = findNearestIndex(path, end.lat, end.lon);
    const startIdx = Math.min(iA, iB);
    const endIdx = Math.max(iA, iB);
    let result = path.slice(startIdx, endIdx + 1);
    if (iA > iB) result.reverse();
    return result;
};

export interface GdanskVehicle {
    generated: string;
    routeShortName: string;
    tripId: number | null;
    routeId: number;
    headsign: string;
    vehicleCode: string;
    vehicleService: string;
    vehicleId: number;
    speed: number;
    direction: number;
    delay: number;
    scheduledTripStartTime: string | null;
    lat: number;
    lon: number;
    gpsQuality: number;
    agency?: string;
    isRealtime?: boolean;
}

export interface TransportStop {
    id: string;
    name: string;
    lat: number;
    lon: number;
    agency?: string;
    agencyIds?: Record<string, string>;
    desc?: string;
    wheelchair?: string;
    distance?: number;
    platform?: string;
    subtext?: string;
    attributes?: any;
}
// ... TripResult interface ...

export interface TripStep {
    mode: 'walking' | 'bus' | 'train';
    instruction: string;
    duration: number;
    line?: string;
}

export interface TripResult {
    type: 'direct' | 'transfer' | 'walking';
    from: { name: string; lat: number; lon: number };
    to: { name: string; lat: number; lon: number };
    duration: number; // minutes
    transfers: number;
    agency: string;
    lines: string[];
    // Segments explain the route structure (Ride -> Walk -> Ride)
    segments?: {
        from: TransportStop;
        to: TransportStop;
        mode: 'walking' | 'bus' | 'train';
        line?: string;
        time?: string; // Departure time for this segment
        duration: number;
        path?: { latitude: number; longitude: number }[];
        tripId?: string;
    }[];
    // Steps are text instructions
    steps: TripStep[];
    path?: { latitude: number; longitude: number }[];
    price?: string;
}

const GDANSK_API_URL = 'https://ckan2.multimediagdansk.pl/gpsPositions?v=2';
const WP_API_BASE = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/transport';
const OSRM_API_BASE = 'https://router.project-osrm.org/route/v1';

const STOPS_CACHE_PREFIX = 'transport_stops_v5_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours (refresh daily)
const TIMETABLE_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes (timetables change)

// Request deduplication - prevent multiple simultaneous calls to same endpoint
const pendingRequests: Map<string, Promise<any>> = new Map();

// Request cancellation - "latest wins" strategy
let currentBboxController: AbortController | null = null;

export const TransportService = {

    // --- IN-MEMORY CACHE FOR OFFLINE-FIRST STRATEGY ---
    _stopsCache: [] as TransportStop[],
    _lastFetch: 0,

    async getAllStops(forceRefresh = false): Promise<TransportStop[]> {
        // Return memory cache if fresh (< 24h)
        const CACHE_AGE = Date.now() - this._lastFetch;
        if (!forceRefresh && this._stopsCache.length > 0 && CACHE_AGE < 24 * 60 * 60 * 1000) {
            return this._stopsCache;
        }

        // Try load from disk first
        try {
            const diskCache = await AsyncStorage.getItem(STOPS_CACHE_PREFIX + 'all_v5');
            if (diskCache) {
                const { data, timestamp } = JSON.parse(diskCache);
                const hasPKS = data.some((s: any) => (s.agency || '').toLowerCase().includes('pks'));

                if (data && data.length > 500 && (Date.now() - timestamp) < 24 * 60 * 60 * 1000 && !forceRefresh && hasPKS) {
                    this._stopsCache = data;
                    this._lastFetch = timestamp;
                    return data;
                } else if (!hasPKS) {
                }
            }
        } catch (e) { }

        const results: any[] = [];
        // Fetch fresh from API
        try {
            // Aggregation: Fetch each source explicitly
            const requestConfigs = [
                { id: 'mevo', label: 'mevo' }, // Priority fetch
                { id: 'gdansk', label: 'ztm_gdansk' },
                { id: 'gdynia', label: 'zkm_gdynia' },
                { id: 'pksgdynia', label: 'pks_gdynia' },
                { id: 'wejherowo', label: 'mzk_wejherowo' },
                { id: 'skm', label: 'skm_rail' },
                { id: 'polregio', label: 'regio_rail' },
                { id: 'intercity', label: 'ic_rail' }
            ];

            for (const config of requestConfigs) {
                try {
                    const useV2 = config.id === 'skm' || config.id === 'polregio';
                    const url = useV2
                        ? `https://kaszuby24.pl/wp-json/kaszuby24/v2/stops?agency=${config.id}`
                        : `${WP_API_BASE}/stops?agency=${config.id}`;

                    const res = await axios.get(url, {
                        timeout: 60000,
                        transformResponse: [(data) => this.safeJsonParse(data)]
                    });

                    // Flatten V2 GeoJSON to flat list of properties
                    let stops = [];
                    if (useV2 && res.data && res.data.features) {
                        stops = res.data.features.map((f: any) => ({
                            ...f.properties,
                            lat: f.geometry.coordinates[1],
                            lon: f.geometry.coordinates[0]
                        }));
                    } else {
                        stops = Array.isArray(res.data) ? res.data : [];
                    }

                    const normalized = stops.map((s: any) => ({
                        ...s,
                        api_source: config.label,
                        agency: (s.agency && s.agency !== 'all' && s.agency !== 'unknown') ? s.agency : config.label
                    }));
                    results.push(normalized);
                    // Add a tiny delay to breathe
                    await new Promise(r => setTimeout(r, 100));
                } catch (e: any) {
                    console.warn(`[API] Failed to fetch ${config.id}:`, e.message);
                }
            }

            // Also fetch 'all' as fallback for any missed data (lightly)
            const resFallback = await axios.get(`${WP_API_BASE}/stops?agency=all`, {
                timeout: 15000,
                transformResponse: [(data) => this.safeJsonParse(data)]
            }).catch(() => ({ data: [] }));
            const stopsFallback = (Array.isArray(resFallback.data) ? resFallback.data : []).filter((s: any) => s.agency && s.agency !== 'all');

            // Flatten all results
            let rawStops = [...results.flat(), ...stopsFallback];
            const pksCountRaw = rawStops.filter(s => (s.agency || '').toLowerCase().includes('pks') || s.api_source === 'pks_gdynia').length;

            // 1. NORMALIZE & CLEAN
            rawStops = rawStops.map(s => {
                let name = String(s.name || 'Przystanek Bez Nazwy');
                // Remove directional suffixes like " 01", " 02", " (01)", " 01A", " nż" etc.
                name = name.replace(/\s\(?\d{2}[A-Za-z]?\)?$/, '').replace(/\snż\.?$/i, '').replace(/\s(PKP|SKM|PKM|MZK|ZKM|ZTM)$/i, '').trim();

                // Correct agency if it's MEVO (sometimes comes as different case)
                let agency = String(s.agency || s.api_source || 'unknown').toLowerCase();
                if (agency === 'mevo' || agency === 'rowermevo') agency = 'mevo';

                // CRITICAL FIX: Match all PKS variants
                if (agency.includes('pks') || s.api_source === 'pks_gdynia') agency = 'pks_gdynia';

                return {
                    ...s,
                    normalizedName: name,
                    lat: parseFloat(String(s.lat)),
                    lon: parseFloat(String(s.lon)),
                    agency: agency
                };
            }).filter(s => !isNaN(s.lat) && !isNaN(s.lon) && s.lat !== 0);


            // 2. SMART MERGE (Clustering)
            // Group stops by name and location (rounded to ~150m for merging directions)
            const mergedMap = new Map<string, TransportStop>();

            rawStops.forEach(s => {
                // Key: Name + Lat/Lon rounded to 4 decimal places (~11m) - Higher precision to avoid over-merging
                const latKey = Math.round(s.lat * 10000) / 10000;
                const lonKey = Math.round(s.lon * 10000) / 10000;
                const mergeKey = `${s.normalizedName}_${latKey}_${lonKey}`.toLowerCase();

                if (mergedMap.has(mergeKey)) {
                    const existing = mergedMap.get(mergeKey)!;
                    // Merge agencies if they differ
                    const existingAgencies = (existing.agency || '').split(',');
                    if (!existingAgencies.includes(s.agency)) {
                        existing.agency = [...existingAgencies, s.agency].join(',');
                    }
                    // Keep track of all IDs
                    if (!existing.agencyIds) existing.agencyIds = { [existingAgencies[0]]: existing.id };
                    existing.agencyIds[s.agency] = String(s.id);
                } else {
                    const newStop: TransportStop = {
                        id: String(s.id),
                        name: s.normalizedName, // Use the clean name
                        lat: s.lat,
                        lon: s.lon,
                        agency: s.agency,
                        agencyIds: { [s.agency]: String(s.id) }
                    };
                    mergedMap.set(mergeKey, newStop);
                }
            });

            // Sort stops by priority: 🚆 SKM > 🚂 POLREGIO > � PKS Gdynia > 🚌 MZK Wejherowo > others
            const HUBS = ['gdynia główna', 'gdańsk główny', 'gdańsk wrzeszcz', 'sopot', 'reda', 'rumia', 'wejherowo'];
            const allStops = Array.from(mergedMap.values()).sort((a, b) => {
                const aAg = (a.agency || '').toLowerCase();
                const bAg = (b.agency || '').toLowerCase();
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();

                // Priority hierarchy: 🚆 SKM > 🚂 POLREGIO > 🚍 PKS Gdynia > 🚌 MZK Wejherowo > other rail > buses
                // This is the MOST IMPORTANT sorting criterion!
                const getPriority = (ag: string) => {
                    if (ag.includes('skm')) return 1000;        // 🚆 SKM - HIGHEST
                    if (ag.includes('polregio') || ag.includes('regio') || ag === 'regio_rail') return 900;  // 🚂 POLREGIO
                    if (ag.includes('pks') || ag.includes('pksgdynia')) return 850;  // 🚍 PKS Gdynia
                    if (ag.includes('mzk') || ag.includes('wejherowo')) return 800;  // 🚌 MZK Wejherowo
                    if (ag.includes('rail') || ag.includes('pkp') || ag.includes('ic_rail')) return 700;
                    if (ag.includes('mevo')) return 500;
                    return 0;
                };

                const aPriority = getPriority(aAg);
                const bPriority = getPriority(bAg);

                // Priority is the main sorting criterion
                if (aPriority !== bPriority) return bPriority - aPriority;

                // Secondary: Major Hubs (only if same agency priority)
                const aIsHub = HUBS.some(h => aName.includes(h));
                const bIsHub = HUBS.some(h => bName.includes(h));
                if (aIsHub && !bIsHub) return -1;
                if (!aIsHub && bIsHub) return 1;

                return 0;
            });

            // Save to caches
            this._stopsCache = allStops;
            this._lastFetch = Date.now();
            AsyncStorage.setItem(STOPS_CACHE_PREFIX + 'all_v5', JSON.stringify({
                data: allStops,
                timestamp: this._lastFetch
            })).catch(e => console.warn('Cache save failed', e));

            return allStops;

        } catch (error) {
            console.error('Failed to fetch all stops:', error);
            if (this._stopsCache.length > 0) return this._stopsCache;
        }
        return [];
    },

    /**
     * SYNC MODE: Fetches ALL static stops at once (cached for 24h).
     * Used for offline-first feeling and instant filtering.
     * Excludes heavy dynamic sources (Mevo, Live Vehicles).
     */
    async getStaticStops(): Promise<TransportStop[]> {
        const CACHE_KEY = 'transport_static_stops_v1';
        const TTL = 24 * 60 * 60 * 1000; // 24 hours

        try {
            // 1. Try Cache
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < TTL) {
                    return data;
                }
            }

            // 2. Network Request
            const response = await axios.get(`${WP_API_BASE}/stops_lite`, {
                params: { agency: 'all_static' }
            });

            // 3. Map lightweight keys (n->name, a->agency) to full objects
            const stops: TransportStop[] = response.data.map((s: any) => ({
                id: s.id,
                name: s.n || s.name,
                agency: s.a || s.agency,
                lat: Number(s.lat),
                lon: Number(s.lon),
                type: 'bus_stop' // Default
            }));

            // 4. Save to Cache
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                data: stops,
                timestamp: Date.now()
            }));

            return stops;

        } catch (error) {
            console.warn('[SYNC] Failed to sync stops, trying stale cache', error);
            // Fallback to stale cache if available
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                return JSON.parse(cached).data;
            }
            return [];
        }
    },

    /**
     * NEW: Bbox-based fetching with request cancellation and caching
     * - Only fetches stops in visible viewport
     * - Implements "latest wins" strategy (cancels previous requests)
     * - Uses tile-based cache for performance
     * - Applies zoom-based limits
     */
    async getStopsInBbox(
        bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number },
        agency: string = 'all',
        latitudeDelta: number = 0.1
    ): Promise<TransportStop[]> {
        // Cancel previous request (latest wins)
        if (currentBboxController) {
            currentBboxController.abort();
        }

        // Create new controller for this request
        currentBboxController = new AbortController();
        const signal = currentBboxController.signal;

        // Calculate zoom-based limit
        const limit = this.getMarkerLimit(latitudeDelta);

        // Generate cache key based on rounded bbox
        const cacheKey = this.getBboxCacheKey(bbox, agency, latitudeDelta);

        try {
            // Try cache first
            const cached = await tileCache.get<TransportStop[]>(cacheKey);
            if (cached) {
                return cached.data.slice(0, limit);
            }


            // Fetch from backend with bbox parameters
            const response = await axios.get(`${WP_API_BASE}/stops_lite`, {
                params: {
                    agency,
                    min_lat: bbox.minLat,
                    max_lat: bbox.maxLat,
                    min_lon: bbox.minLon,
                    max_lon: bbox.maxLon,
                    limit: limit + 50 // Fetch extra for cache, limit on client
                },
                timeout: 10000,
                signal,
                transformResponse: [(data) => this.safeJsonParse(data)]
            });

            let stops = Array.isArray(response.data) ? response.data : [];

            // Fallback to standard /stops if /stops_lite doesn't exist yet
            if (stops.length === 0 || response.status === 404) {
                const fallbackResponse = await axios.get(`${WP_API_BASE}/stops`, {
                    params: {
                        agency,
                        min_lat: bbox.minLat,
                        max_lat: bbox.maxLat,
                        min_lon: bbox.minLon,
                        max_lon: bbox.maxLon
                    },
                    timeout: 10000,
                    signal
                });
                stops = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [];
            }

            // Ensure agency field exists
            stops = stops.map(s => ({
                ...s,
                agency: s.agency || agency
            }));

            // Cache the result
            await tileCache.set(cacheKey, stops);

            // Return limited results
            return stops.slice(0, limit);

        } catch (error: any) {
            // Don't log abort errors (expected when "latest wins")
            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
                return [];
            }

            console.warn('[BBOX] Error fetching stops:', error.message);
            return [];
        }
    },

    /**
     * Calculate marker limit based on zoom level (latitudeDelta)
     */
    getMarkerLimit(latitudeDelta: number): number {
        if (latitudeDelta > 0.2) return 60;   // Very zoomed out (city level)
        if (latitudeDelta > 0.1) return 100;  // Zoomed out (district level)
        if (latitudeDelta > 0.05) return 150; // Medium zoom (neighborhood level)
        return 250;                            // Zoomed in (street level)
    },

    /**
     * Generate cache key for bbox (tile-based)
     */
    getBboxCacheKey(
        bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number },
        agency: string,
        latitudeDelta: number
    ): string {
        // Round to 2 decimals (~1km precision) for cache key
        const precision = 100;
        const minLat = Math.round(bbox.minLat * precision) / precision;
        const minLon = Math.round(bbox.minLon * precision) / precision;

        // Include zoom level in key for different limits
        const zoomCategory = latitudeDelta > 0.2 ? 'far' :
            latitudeDelta > 0.1 ? 'medium' :
                latitudeDelta > 0.05 ? 'close' : 'veryclose';

        return `${minLat}_${minLon}_${agency}_${zoomCategory}`;
    },

    getAgencyLabel(agency: string | null | undefined): string {
        const agStr = (agency || '').toLowerCase();
        const agencies = agStr.split(',').map(a => a.trim());

        // STRICT priority ranking for display label - No overlaps!
        if (agencies.some(a => a === 'ic_rail' || a === 'pkp' || a === 'intercity')) return 'IC';
        if (agencies.some(a => a === 'regio_rail' || a === 'polregio' || a === 'regio')) return 'PR';
        if (agencies.some(a => a === 'skm_rail' || a === 'skm')) return 'SKM';

        if (agencies.some(a => a === 'ztm_gdansk' || a === 'gdansk' || a === 'ztm')) return 'ZTM';
        if (agencies.some(a => a === 'zkm_gdynia' || a === 'gdynia' || a === 'zkm')) return 'ZKM';
        if (agencies.some(a => a === 'mzk_wejherowo' || a === 'wejherowo' || a === 'mzk')) return 'MZK';
        if (agencies.some(a => a === 'pks_gdynia' || a === 'pksgdynia' || a === 'pks')) return 'PKS';
        if (agencies.some(a => a === 'mevo' || a === 'mevo_free')) return 'MEVO';

        return agencies[0]?.toUpperCase() || 'BUS';
    },

    getAgencyColor(agency: string | null | undefined): string {
        const agStr = (agency || '').toLowerCase();
        const agencies = agStr.split(',').map(a => a.trim());
        const matches = (list: string[]) => agencies.some(a => list.includes(a));

        if (matches(['regio_rail', 'polregio', 'regio'])) return '#1E40AF'; // Polregio - Blue
        if (matches(['ic_rail', 'pkp', 'intercity'])) return '#003399'; // PKP - Dark Blue
        if (matches(['skm_rail', 'skm'])) return '#FBBC05'; // SKM - Yellow
        if (matches(['ztm_gdansk', 'gdansk', 'ztm'])) return '#E11D48'; // Gdansk - Rose
        if (matches(['zkm_gdynia', 'gdynia', 'zkm'])) return '#2563EB'; // Gdynia - Blue
        if (matches(['mzk_wejherowo', 'wejherowo', 'mzk'])) return '#047857'; // Wejherowo - Green
        if (matches(['pks_gdynia', 'pksgdynia', 'pks'])) return '#10B981'; // PKS - Emerald
        if (matches(['mevo', 'mevo_free'])) return '#DC2626'; // MEVO - Red
        return '#6B7280'; // Default gray
    },

    async fetchByViewport(minLat: number, minLon: number, maxLat: number, maxLon: number, agency: string = 'all'): Promise<TransportStop[]> {
        const bbox = { minLat, minLon, maxLat, maxLon };
        try {
            const stops = await this.fetchStops(agency, bbox);
            return stops;
        } catch (error) {
            console.error('fetchByViewport Error:', error);
            return [];
        }
    },

    async fetchTimetable(agency: string, stopId: string, agencyIds?: Record<string, string>, allDay = false): Promise<any[]> {
        // Unique agencies to avoid duplicate requests for merged stops
        const rawAgencies = (agency || '').split(',').map(a => {
            const ag = a.trim().toLowerCase();
            if (ag === 'mzk_wejherowo') return 'wejherowo';
            if (ag === 'ztm_gdansk') return 'gdansk';
            if (ag === 'zkm_gdynia') return 'gdynia';
            if (ag === 'pksgdynia' || ag === 'pks_gdynia') return 'pks_gdynia';
            if (ag === 'skm_rail') return 'skm';
            if (ag === 'regio_rail') return 'polregio';
            return ag;
        }).filter(Boolean);
        const agencies = Array.from(new Set(rawAgencies));

        if (agencies.length === 0) return [];

        // Single agency case
        if (agencies.length === 1) {
            const ag = agencies[0];
            const realId = (agencyIds && agencyIds[ag]) ? agencyIds[ag] : stopId;

            // Map internal tags to API IDs
            let apiAgency = ag;
            if (ag === 'mzk_wejherowo') apiAgency = 'wejherowo';
            else if (ag === 'ztm_gdansk') apiAgency = 'gdansk';
            else if (ag === 'zkm_gdynia') apiAgency = 'gdynia';
            else if (ag === 'pks_gdynia') apiAgency = 'pksgdynia';
            else if (ag === 'skm_rail') apiAgency = 'skm';
            else if (ag === 'regio_rail') apiAgency = 'polregio';
            else if (ag === 'ic_rail' || ag === 'intercity') apiAgency = 'pkp'; // Intercity uses PKP endpoint often

            try {

                // Use V2 for agencies fixed on backend (OOM fix)
                const useV2 = apiAgency === 'skm' || apiAgency === 'polregio';
                const endpoint = useV2 ? 'https://kaszuby24.pl/wp-json/kaszuby24/v2/timetable' : `${WP_API_BASE}/timetable`;

                const response = await axios.get<any[]>(endpoint, {
                    params: {
                        agency: apiAgency,
                        stop_id: realId,
                        all_day: allDay ? '1' : '0'
                    },
                    timeout: 8000,
                    transformResponse: [(data) => this.safeJsonParse(data)]
                });

                let data = response.data || [];

                if (data.length === 0 && (apiAgency === 'gdynia' || apiAgency === 'zkm')) {
                    const directDeps = await this.fetchPolishDepartures('zkm_gdynia', realId);
                    if (directDeps.length > 0) {
                        data = directDeps.map(d => ({
                            time: d.time,
                            line: d.line,
                            destination: d.destination,
                            isRealtime: d.isRealtime,
                            attributes: { is_realtime: d.isRealtime }
                        }));
                    }
                }


                return data;
            } catch (error: any) {
                console.warn(`[DEBUG_TT] Error fetching ${apiAgency}/${realId}:`, error.message);
                if (error.response) console.warn('[DEBUG_TT] Server Response:', error.response.status, error.response.data);
                return [];
            }
        }

        // Multi-agency case (Parallel Fetch)
        try {
            const promises = agencies.map(ag => {
                const realId = (agencyIds && agencyIds[ag]) ? agencyIds[ag] : stopId;
                // Recursive call for single agency
                return this.fetchTimetable(ag, realId, undefined, allDay);
            });

            const results = await Promise.all(promises);
            let combined: any[] = [];
            results.forEach(r => combined = [...combined, ...r]);

            // Deduplicate (especially for rail where multiple agencies might overlap)
            const seen = new Set();
            const deduplicated = combined.filter(item => {
                const datePart = item.date || item.target_date || '';
                const key = `${datePart}|${item.time}|${item.line}|${item.destination || item.direction}`.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            // Sort by date then time
            return deduplicated.sort((a, b) => {
                const dA = a.date || a.target_date || '';
                const dB = b.date || b.target_date || '';
                if (dA !== dB) return dA.localeCompare(dB);

                const tA = a.time || a.departureTime || '23:59';
                const tB = b.time || b.departureTime || '23:59';
                return tA.localeCompare(tB);
            });
        } catch (e) {
            return [];
        }
    },

    async fetchGdanskLive(): Promise<GdanskVehicle[]> {
        try {
            const response = await axios.get(`${WP_API_BASE}/live`, { params: { agency: 'gdansk' }, timeout: 8000 });
            return (response.data || []).map((v: any) => ({ ...v, agency: 'gdansk', isRealtime: true }));
        } catch (error) { return []; }
    },

    /**
     * Fetch the physical path for a trip
     * Uses shape_id if available, otherwise falls back to connecting stops
     */
    async fetchTripShape(agency: string, tripId: string): Promise<{ latitude: number, longitude: number }[]> {
        try {
            // 1. Get Trip Details to find shape_id
            const details = await this.fetchTripDetails(agency, tripId) as any;

            // 2. If we have actual shape_id, try fetching it
            if (details && details.shape_id) {
                const shape = await this.fetchShapes(agency, details.shape_id);
                if (shape && shape.length > 0) {
                    return shape.map((p: any) => ({
                        latitude: parseFloat(p.lat || p.latitude),
                        longitude: parseFloat(p.lon || p.longitude)
                    })).filter(p => !isNaN(p.latitude) && !isNaN(p.longitude));
                }
            }

            // 3. Fallback: construct path from stops list
            const stops = details.stops || (Array.isArray(details) ? details : []);
            if (stops && stops.length > 0) {
                return stops.map((s: any) => ({
                    latitude: parseFloat(s.stop_lat || s.lat || s.latitude),
                    longitude: parseFloat(s.stop_lon || s.lon || s.longitude)
                })).filter((p: any) => !isNaN(p.latitude) && !isNaN(p.longitude));
            }
        } catch (e) {
            console.warn(`Error fetching shape for trip ${tripId}:`, e);
        }
        return [];
    },

    async fetchTrainDetails(agency: string, tripId: string): Promise<any> {
        try {
            const response = await axios.get(`${WP_API_BASE}/train_details`, {
                params: { agency, trip_id: tripId },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            console.error('fetchTrainDetails error:', error);
            return null;
        }
    },

    async fetchShapes(agency: string, shapeId: string): Promise<any[]> {
        try {
            const response = await axios.get(`${WP_API_BASE}/shapes`, {
                params: { agency, shape_id: shapeId },
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.error('fetchShapes error:', error);
            return [];
        }
    },

    async fetchAgencyInfo(agency: string): Promise<any> {
        try {
            const response = await axios.get(`${WP_API_BASE}/agency`, {
                params: { agency },
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.error('fetchAgencyInfo error:', error);
            return null;
        }
    },

    // PKS functionality removed (carrier no longer supported)

    // PKS functionality removed
    async fetchStops(agency: string, bbox?: { minLat: number, minLon: number, maxLat: number, maxLon: number }): Promise<TransportStop[]> {
        // CONSISTENCY: If fetching ALL stops, use the same smart-merged dataset as the Map
        if (agency === 'all' && !bbox) {
            return this.getAllStops();
        }

        const cacheKey = `${STOPS_CACHE_PREFIX}${agency}`;
        const requestKey = `stops_${agency}_${bbox ? JSON.stringify(bbox) : 'all'}`;

        // Check for pending request (deduplication)
        if (pendingRequests.has(requestKey)) {
            return pendingRequests.get(requestKey)!;
        }

        if (!bbox) {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    const age = Date.now() - timestamp;

                    // Invalid cache if too old OR strictly too few stops for major agencies
                    const isTooOld = age > CACHE_EXPIRY;
                    const isSuspiciouslyEmpty = data.length < 5 && agency !== 'place_search';

                    if (!isTooOld && !isSuspiciouslyEmpty) {
                        return data;
                    } else {
                    }
                } catch (e) {
                    console.warn('[CACHE] Failed to parse cached stops', e);
                }
            }
        }

        const perfKey = `fetchStops_${agency}_${Date.now()}`;
        console.time(perfKey);

        const fetchPromise = (async () => {
            try {
                const params: any = { agency };
                if (bbox) {
                    params.min_lat = bbox.minLat;
                    params.min_lon = bbox.minLon;
                    params.max_lat = bbox.maxLat;
                    params.max_lon = bbox.maxLon;
                }

                const response = await axios.get<TransportStop[]>(`${WP_API_BASE}/stops`, { params, timeout: 15000 });
                console.timeEnd(perfKey);
                let data = (response.data || []).map(s => ({ ...s, agency: s.agency || agency }));

                // CRITICAL FALLBACK for Gdynia (if backend proxy fails/empty)
                if (data.length === 0 && (agency === 'gdynia' || agency === 'zkm' || agency === 'all')) {
                    try {
                        const directStops = await this.fetchPolishStops('zkm_gdynia', bbox);
                        if (directStops.length > 0) {
                            // Ensure agency field is set for all stops to satisfy TS
                            const normalizedStops = directStops.map(s => ({ ...s, agency: s.agency || 'gdynia' }));
                            data = agency === 'all' ? [...data, ...normalizedStops] : normalizedStops;
                        }
                    } catch (err) {
                        console.warn('[FALLBACK] Direct Gdynia fetch failed:', err);
                    }
                }

                if (data.length > 0 && !bbox) {
                    AsyncStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() })).catch(e => {
                        console.warn('[CACHE] Failed to save stops to cache', e);
                    });
                }

                return data;
            } catch (error: any) {
                console.error(`fetchStops Error for ${agency}:`, error.message);
                if (error.response) {
                    console.error('Response data:', error.response.data);
                    console.error('Response status:', error.response.status);
                }
                return [];
            } finally {
                pendingRequests.delete(requestKey);
            }
        })();

        pendingRequests.set(requestKey, fetchPromise);
        return fetchPromise;
    },
    /**
     * Powerful fuzzy search for stops
     */
    async searchStops(query: string, allStops?: TransportStop[]): Promise<TransportStop[]> {
        if (!query || query.length < 2) return [];
        const q = query.toLowerCase().trim();

        let source = allStops;
        if (!source || source.length === 0) {
            try {
                source = await this.fetchStops('all');
            } catch (e) {
                return [];
            }
        }
        if (!source) return [];

        const candidates = source.filter(s => s && s.name && typeof s.name === 'string');

        // Scoring system with AGENCY PRIORITY
        // Priority: 🚆 SKM (highest) > 🚂 POLREGIO > � PKS Gdynia > 🚌 MZK Wejherowo > others
        const scored = candidates.map(s => {
            const name = s.name.toLowerCase();
            let score = 0;
            if (name === q) score += 100;
            else if (name.startsWith(q)) score += 50;
            else if (name.includes(` ${q}`)) score += 30; // Starts word
            else if (name.includes(q)) score += 10;

            // AGENCY PRIORITY BONUS - HIGH VALUES to ensure trains appear first!
            const agency = (s.agency || '').toLowerCase();
            if (agency.includes('skm')) score += 10000;        // 🚆 SKM - HIGHEST
            else if (agency.includes('polregio') || agency.includes('regio') || agency === 'regio_rail') score += 9000;  // 🚂 POLREGIO
            else if (agency.includes('pks') || agency.includes('pksgdynia')) score += 8500;  // 🚍 PKS Gdynia
            else if (agency.includes('mzk') || agency.includes('wejherowo')) score += 8000;  // 🚌 MZK Wejherowo
            else if (agency.includes('rail') || agency.includes('pkp')) score += 7000;

            return { s, score };
        });

        // Sort by score DESC (agency priority first!), then by Name Length ASC
        const sorted = scored
            .filter(i => i.score > 0)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.s.name.length - b.s.name.length;
            })
            .slice(0, 10);

        // DEBUG: Log top results with scores

        return sorted.map(i => i.s);
    },

    async geocodeAddress(query: string) {
        if (!query || query.length < 3) return null;
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=3&countrycodes=pl`;
            const res = await axios.get(url, { headers: { 'User-Agent': 'Kaszuby24-App/1.0' }, timeout: 4000 });
            if (res.data && res.data.length > 0) {
                return res.data.map((item: any) => ({
                    name: item.display_name.split(',')[0],
                    fullName: item.display_name,
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    type: 'address'
                }));
            }
        } catch (e) {
            console.warn('Geocoding error:', e);
        }
        return null;
    },

    async fetchRoadPath(fromLat: number, fromLon: number, toLat: number, toLon: number, mode: 'driving' | 'walking' = 'driving') {
        try {
            const profile = mode === 'walking' ? 'walking' : 'driving';
            // walking profile is usually on port 5000 or different endpoint project-osrm public
            // BUT for simplicity and since public OSRM might not have walking enabled everywhere,
            // we use 'walking' profile in URL if available, or fallback to driving/5

            // Using standard OSRM public for driving. verify if walking is available.
            // If not, we estimate: walking speed ~5km/h = 1.4 m/s.

            const baseUrl = mode === 'walking'
                ? 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'
                : OSRM_API_BASE + '/driving';

            const url = `${baseUrl}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=polyline`;
            const res = await axios.get(url, { timeout: 3000 });
            if (res.data.routes?.[0]) {
                const route = res.data.routes[0];
                // Add 10% buffer to walking for more realistic "Za ile" calculations
                const finalDuration = mode === 'walking' ? route.duration * 1.1 : route.duration;

                return {
                    path: decodePolyline(route.geometry),
                    distance: route.distance, // meters
                    duration: finalDuration // seconds
                };
            }
        } catch (e) { }

        // Fallback or straight line
        return {
            path: [{ latitude: fromLat, longitude: fromLon }, { latitude: toLat, longitude: toLon }],
            distance: 0,
            duration: 0
        };
    },

    async fetchTripDetails(agency: string, tripId: string): Promise<any[]> {
        // Cache key for trip details
        const cacheKey = `trip_${agency}_${tripId}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);

        try {
            const res = await axios.get(`${WP_API_BASE}/train_details?agency=${agency}&trip_id=${tripId}`, { timeout: 5000 });
            if (res.data && Array.isArray(res.data)) {
                AsyncStorage.setItem(cacheKey, JSON.stringify(res.data)).catch(() => { });
                return res.data;
            }
        } catch (e) {
            console.warn(`[TripDetails] Failed for ${agency}/${tripId}`);
        }
        return [];
    },

    async planTrip(from: string, to: string, allStops: TransportStop[], startTime?: string): Promise<TripResult[]> {
        if (!allStops || allStops.length === 0) return [];

        let startStop: TransportStop | undefined;
        let endStop: TransportStop | undefined;
        let userLat: number | null = null;
        let userLon: number | null = null;

        // 1. Resolve Start/End
        if (from.includes(',')) {
            const parts = from.split(',');
            userLat = parseFloat(parts[0]);
            userLon = parseFloat(parts[1]);
            const nearest = await this.findNearestStops(userLat, userLon, 1);
            startStop = nearest[0];
        } else {
            const s = await this.searchStops(from, allStops);
            startStop = s[0];
        }

        const e = await this.searchStops(to, allStops);
        endStop = e[0];

        if (!startStop || !endStop) return [];


        const results: TripResult[] = [];
        const HUBS = ['Gdynia Główna', 'Gdańsk Główny', 'Gdańsk Wrzeszcz', 'Sopot', 'Reda', 'Rumia', 'Wejherowo'];

        // Helper: Check connectivity via actual trip inspection
        const findDirectConnection = async (s: TransportStop, e: TransportStop, startTimeVal: string): Promise<any | null> => {
            try {
                // Fetch departures for start stop
                const timetable = await this.fetchTimetable(s.agency || 'unknown', s.id, s.agencyIds);
                if (!timetable || timetable.length === 0) return null;

                // Group by Line+Direction to avoid checking same route 10 times
                const uniqueRoutes = new Map<string, any>();
                timetable.forEach(dep => {
                    const key = `${dep.line}_${dep.destination}`;
                    if (!uniqueRoutes.has(key)) {
                        uniqueRoutes.set(key, dep);
                    }
                });

                // Check specifically for rails first (more reliable GTFS)
                const candidates = Array.from(uniqueRoutes.values()).slice(0, 8); // Check top 8 diverse routes

                for (const cand of candidates) {
                    if (!cand.trip_id) continue;

                    // Optimization: Check destination name match first
                    const destName = cand.destination.toLowerCase();
                    const endName = e.name.toLowerCase();

                    // Heuristic: If destination IS the end stop, or contains it
                    let matches = destName.includes(endName) || endName.includes(destName);

                    // Deep Check: Fetch stops for this trip
                    // Only fetch if we are not sure, OR if it's a rail/long route
                    // To save bandwidth, we only deep check if we haven't found a match OR if it's a potential hit
                    let tripStops = [];
                    if (!matches) {
                        tripStops = await this.fetchTripDetails(s.agency || 'unknown', cand.trip_id);
                        if (tripStops.some(ts => ts.stop_name?.toLowerCase().includes(endName) || endName.includes(ts.stop_name?.toLowerCase()))) {
                            matches = true;
                        }
                    }

                    if (matches) {
                        // FOUND!
                        const duration = Math.max(15, parseInt(cand.attributes?.delay_desc || '25')); // Rough estimate if no real time
                        return {
                            type: 'direct',
                            from: { name: s.name, lat: s.lat, lon: s.lon },
                            to: { name: e.name, lat: e.lat, lon: e.lon },
                            duration: duration,
                            transfers: 0,
                            agency: this.getAgencyLabel(s.agency),
                            lines: [cand.line],
                            path: [], // Will be filled with shape if available
                            segments: [{
                                from: s,
                                to: e,
                                mode: (cand.line.match(/\d/) ? 'bus' : 'train'),
                                line: cand.line,
                                time: cand.time,
                                duration: duration,
                                tripId: cand.trip_id
                            }],
                            steps: [
                                { mode: 'walking', instruction: `Idź na przystanek ${s.name}`, duration: 5 },
                                { mode: 'bus', instruction: `Linia ${cand.line} kierunek ${cand.destination}`, duration: duration, line: cand.line },
                                { mode: 'walking', instruction: 'Dojście do celu', duration: 2 }
                            ]
                        };
                    }
                }
            } catch (err) {
                console.warn('[Router] Direct check failed', err);
            }
            return null;
        };


        // A. Try Direct
        const direct = await findDirectConnection(startStop, endStop, startTime || '');
        if (direct) {
            results.push(direct);
        }

        // B. Try via Hubs (if Direct failed or just to have alternatives)
        if (results.length === 0 || getDistance(startStop.lat, startStop.lon, endStop.lat, endStop.lon) > 5000) {
            // Find closest Hub to Start and End
            const hubs = allStops.filter(s => HUBS.some(h => s.name.includes(h) && (s.agency?.includes('rail') || s.agency?.includes('skm'))));

            // Sort hubs by proximity to Start + End
            hubs.sort((a, b) => {
                const da = getDistance(startStop!.lat, startStop!.lon, a.lat, a.lon) + getDistance(a.lat, a.lon, endStop!.lat, endStop!.lon);
                const db = getDistance(startStop!.lat, startStop!.lon, b.lat, b.lon) + getDistance(b.lat, b.lon, endStop!.lat, endStop!.lon);
                return da - db;
            });

            const bestHub = hubs[0];
            if (bestHub) {
                // Leg 1: Start -> Hub
                const leg1 = await findDirectConnection(startStop, bestHub, startTime || '');
                // Leg 2: Hub -> End
                if (leg1) {
                    // We need to assume a transfer time
                    // In a real router we'd check arrival time of leg1, but here we just check connectivity
                    const leg2 = await findDirectConnection(bestHub, endStop, startTime || '');

                    if (leg2) {
                        results.push({
                            type: 'transfer',
                            from: { name: startStop.name, lat: startStop.lat, lon: startStop.lon },
                            to: { name: endStop.name, lat: endStop.lat, lon: endStop.lon },
                            duration: leg1.duration + leg2.duration + 15,
                            transfers: 1,
                            agency: 'MIESZANY',
                            lines: [leg1.lines[0], leg2.lines[0]],
                            path: [],
                            segments: [
                                ...leg1.segments,
                                ...leg2.segments
                            ],
                            steps: [
                                ...leg1.steps,
                                { mode: 'walking', instruction: `Przesiadka: ${bestHub.name}`, duration: 15 },
                                ...leg2.steps.slice(1) // Skip "Walk to start" of second leg
                            ]
                        });
                    }
                }
            }
        }

        // B.5 Try Mevo (Alternative: Bike)
        const totalDist = getDistance(startStop.lat, startStop.lon, endStop.lat, endStop.lon);
        if (totalDist > 800 && totalDist < 8000) {
            try {
                const bikes = await this.fetchMevoLive();
                // Find nearest bike to startStop
                const nearestBike = bikes
                    .map((b: any) => ({ ...b, dist: getDistance(startStop.lat, startStop.lon, b.lat, b.lon) }))
                    .sort((a, b) => a.dist - b.dist)[0];

                if (nearestBike && nearestBike.dist < 500) {
                    results.push({
                        type: 'direct',
                        from: { name: startStop.name, lat: startStop.lat, lon: startStop.lon },
                        to: { name: endStop.name, lat: endStop.lat, lon: endStop.lon },
                        duration: Math.ceil(totalDist / 250) + 5, // ~15km/h + 5min
                        transfers: 0,
                        agency: 'Rowery Mevo',
                        lines: ['MEVO'],
                        path: [{ latitude: startStop.lat, longitude: startStop.lon }, { latitude: endStop.lat, longitude: endStop.lon }],
                        segments: [],
                        steps: [
                            { mode: 'walking', instruction: `Podejdź do roweru Mevo (${Math.round(nearestBike.dist)}m)`, duration: 5 },
                            { mode: 'bus', instruction: 'Jedź rowerem Mevo do celu', duration: Math.ceil(totalDist / 250), line: 'MEVO' }
                        ]
                    });
                }
            } catch (e) {
                console.warn('[Router] Mevo check failed', e);
            }
        }

        // C. Fallback: Road Path (if everything fails)
        if (results.length === 0) {
            const road = await this.fetchRoadPath(startStop.lat, startStop.lon, endStop.lat, endStop.lon);
            results.push({
                type: 'direct', // Fake direct
                from: { name: startStop.name, lat: startStop.lat, lon: startStop.lon },
                to: { name: endStop.name, lat: endStop.lat, lon: endStop.lon },
                duration: Math.ceil(road.duration / 60 * 1.5),
                transfers: 0,
                agency: 'AUTO',
                lines: ['BUS/AUTO'],
                path: road.path,
                segments: [],
                steps: [{ mode: 'bus', instruction: 'Brak bezpośredniego połączenia w systemie. Trasa drogowa.', duration: Math.ceil(road.duration / 60) }]
            });
        }

        // Enrich with Shapes if possible
        for (const res of results) {
            if (res.segments) {
                let fullPath: any[] = [];
                for (const seg of res.segments) {
                    if (seg.tripId && seg.mode !== 'walking') {
                        const shape = await this.fetchTripShape(seg.from.agency || 'unknown', seg.tripId);
                        if (shape.length > 0) fullPath = [...fullPath, ...shape];
                        else fullPath = [...fullPath, { latitude: seg.from.lat, longitude: seg.from.lon }, { latitude: seg.to.lat, longitude: seg.to.lon }];
                    }
                }
                if (fullPath.length > 0) res.path = fullPath;
            }
        }

        return results;
    },

    // Enhanced method to find nearest stops with agency filter
    async findNearestStops(lat: number, lon: number, limit: number = 5, agency: string = 'ALL') {
        let source: TransportStop[] = [];
        try {
            source = await this.fetchStops(agency);
        } catch (e) {
            return [];
        }

        const withDist = source.map(s => {
            if (!s.lat || !s.lon) return { ...s, distance: 999999 };
            return { ...s, distance: getDistance(lat, lon, s.lat, s.lon) };
        });
        return withDist.sort((a, b) => a.distance - b.distance).slice(0, limit);
    },

    async getApiStatus() {
        return [{ id: 'core', name: 'Transport API', status: 'OK', url: WP_API_BASE }];
    },

    // === PKS SCRAPER METHODS ===

    /**
     * Fetch PKS routes using web scraper
     */
    async fetchPKSRoutes(): Promise<any[]> {
        try {
            return await PKSScraperService.fetchAllRoutes();
        } catch (error) {
            console.warn('Error fetching PKS routes:', error);
            return [];
        }
    },

    /**
     * Fetch PKS timetable for a specific route
     */
    async fetchPKSTimetable(routeUrl: string, routeName: string): Promise<string[]> {
        try {
            return await PKSScraperService.fetchTimetable(routeUrl, routeName);
        } catch (error) {
            console.warn(`Error fetching PKS timetable for ${routeName}:`, error);
            return [];
        }
    },

    /**
     * Fetch PKS stops
     */
    async fetchPKSStops(): Promise<any[]> {
        try {
            return await PKSScraperService.fetchStops();
        } catch (error) {
            console.warn('Error fetching PKS stops:', error);
            return [];
        }
    },

    /**
     * Search PKS routes
     */
    async searchPKSRoutes(query: string): Promise<any[]> {
        try {
            return await PKSScraperService.searchRoutes(query);
        } catch (error) {
            console.warn('Error searching PKS routes:', error);
            return [];
        }
    },

    // === POLISH TRANSPORT API METHODS ===

    /**
     * Fetch stops from Polish transport APIs
     */
    async fetchPolishStops(agency: string, bbox?: any): Promise<TransportStop[]> {
        try {
            const stops = await PolishTransportApiService.fetchStops(agency as any, bbox);
            return stops.map(stop => ({
                id: stop.id,
                name: stop.name,
                lat: stop.lat,
                lon: stop.lon,
                agency: stop.agency
            }));
        } catch (error) {
            console.warn(`Error fetching Polish stops for ${agency}:`, error);
            return [];
        }
    },

    /**
     * Fetch departures from Polish transport APIs
     */
    async fetchPolishDepartures(agency: string, stopId: string): Promise<any[]> {
        try {
            return await PolishTransportApiService.fetchDepartures(agency as any, stopId);
        } catch (error) {
            console.warn(`Error fetching Polish departures for ${agency}/${stopId}:`, error);
            return [];
        }
    },

    /**
     * Search stops across Polish transport APIs
     */
    async searchPolishStops(query: string, agencies: string[] = ['ztm_gdansk', 'zkm_gdynia']): Promise<TransportStop[]> {
        try {
            const stops = await PolishTransportApiService.searchStops(query, agencies as any);
            return stops.map(stop => ({
                id: stop.id,
                name: stop.name,
                lat: stop.lat,
                lon: stop.lon,
                agency: stop.agency
            }));
        } catch (error) {
            console.warn('Error searching Polish stops:', error);
            return [];
        }
    },

    /**
     * Get combined departures for a stop
     */
    async getCombinedDepartures(stopName: string, agencies: string[] = ['ztm_gdansk', 'zkm_gdynia']): Promise<any> {
        try {
            return await PolishTransportApiService.getCombinedDepartures(stopName, agencies as any);
        } catch (error) {
            console.warn('Error getting combined departures:', error);
            return { stop: null, departures: [] };
        }
    },

    /**
     * Check Polish API status
     */
    async checkPolishApiStatus(agency: string): Promise<boolean> {
        try {
            return await PolishTransportApiService.checkApiStatus(agency as any);
        } catch (error) {
            return false;
        }
    },

    /**
     * Get available Polish agencies
     */
    getAvailablePolishAgencies(): string[] {
        return PolishTransportApiService.getAvailableAgencies();
    },

    // === ENHANCED PKS METHODS ===

    /**
     * Enhanced PKS timetable fetching with fallback to scraper
     */
    async fetchEnhancedPKSTimetable(stopId: string): Promise<any[]> {
        // First try the existing WordPress API
        try {
            const wpData = await this.fetchTimetable('pksgdynia', stopId);
            if (wpData && wpData.length > 0) {
                return wpData;
            }
        } catch (error) {
            console.warn('WordPress PKS API failed, trying scraper:', error);
        }

        // Fallback to web scraper
        try {
            const routes = await this.fetchPKSRoutes();
            const stopSchedule = await PKSScraperService.getStopSchedule(stopId);
            return stopSchedule;
        } catch (error) {
            console.warn('PKS scraper also failed:', error);
            return [];
        }
    },

    /**
     * Enhanced PKS stops fetching with multiple sources
     */
    async fetchEnhancedPKSStops(): Promise<TransportStop[]> {
        // Try existing WordPress API first
        try {
            const wpStops = await this.fetchStops('pksgdynia');
            if (wpStops && wpStops.length > 0) {
                return wpStops;
            }
        } catch (error) {
            console.warn('WordPress PKS stops API failed:', error);
        }

        // Fallback to scraper with comprehensive PKS data
        try {
            const scrapedStops = await PKSScraperService.fetchStops();
            return scrapedStops.map(stop => ({
                id: stop.id,
                name: stop.name,
                lat: stop.lat || 0,
                lon: stop.lon || 0,
                agency: 'pks_gdynia'
            }));
        } catch (error) {
            console.warn('PKS stops scraper failed:', error);
            return [];
        }
    },

    /**
     * Search PKS stops by name
     */
    async searchPKSStops(query: string): Promise<TransportStop[]> {
        try {
            const allStops = await this.fetchEnhancedPKSStops();
            const q = query.toLowerCase().trim();

            return allStops.filter(stop =>
                stop.name.toLowerCase().includes(q)
            ).slice(0, 10); // Limit results
        } catch (error) {
            console.warn('Error searching PKS stops:', error);
            return [];
        }
    },

    /**
     * Get PKS stops near location
     */
    async findNearestPKSStops(lat: number, lon: number, limit: number = 5): Promise<TransportStop[]> {
        try {
            const allStops = await this.fetchEnhancedPKSStops();

            const withDistance = allStops.map(stop => ({
                ...stop,
                distance: this.calculateDistance(lat, lon, stop.lat, stop.lon)
            }));

            return withDistance
                .sort((a, b) => a.distance - b.distance)
                .slice(0, limit);
        } catch (error) {
            console.warn('Error finding nearest PKS stops:', error);
            return [];
        }
    },

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Preload popular agencies in background for faster app startup
     * Call this on app initialization (e.g., in _layout.tsx useEffect)
     */
    async preloadPopularAgencies(): Promise<void> {
        const popularAgencies = ['polregio', 'skm', 'pkp', 'wejherowo'];

        // Run all in parallel but don't block/await
        Promise.all(
            popularAgencies.map(agency =>
                this.fetchStops(agency).catch(e => {
                    console.warn(`[PRELOAD] Failed to preload ${agency}:`, e.message);
                })
            )
        ).then(() => {
        });
    },

    /**
     * Parse JSON from a string that might contain PHP warnings or other junk
     */
    safeJsonParse(input: any): any {
        if (typeof input === 'object') return input;
        if (typeof input !== 'string') return input;

        try {
            // Find the first '[' or '{' and the last ']' or '}'
            const startIdx = Math.min(
                input.indexOf('[') === -1 ? Infinity : input.indexOf('['),
                input.indexOf('{') === -1 ? Infinity : input.indexOf('{')
            );
            const endIdx = Math.max(
                input.lastIndexOf(']'),
                input.lastIndexOf('}')
            );

            if (startIdx !== Infinity && endIdx !== -1 && endIdx >= startIdx) {
                const cleaned = input.substring(startIdx, endIdx + 1);
                return JSON.parse(cleaned);
            }
            return JSON.parse(input);
        } catch (e) {
            console.warn('Failed to parse dirty JSON:', e);
            return null;
        }
    },

    async fetchMevoLive(): Promise<any[]> {
        try {
            const response = await axios.get(`${WP_API_BASE}/live`, {
                params: { agency: 'mevo' },
                timeout: 8000,
                transformResponse: [(data) => this.safeJsonParse(data)]
            });
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.warn('[MEVO] Live positions fetch failed:', error);
            return [];
        }
    },

    async fetchMevoStatus(): Promise<Record<string, any>> {
        try {
            const response = await axios.get(`${WP_API_BASE}/mevo-status`, {
                timeout: 8000,
                transformResponse: [(data) => this.safeJsonParse(data)]
            });
            return (response.data && typeof response.data === 'object') ? response.data : {};
        } catch (error) {
            console.warn('[MEVO] Station status fetch failed:', error);
            return {};
        }
    },
};
