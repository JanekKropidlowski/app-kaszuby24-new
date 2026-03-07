/**
 * Railway routing using Overpass API and OpenStreetMap data
 * Fetches actual railway tracks instead of road routes
 * Enhanced with caching and rate limiting protection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface LatLng {
    latitude: number;
    longitude: number;
}

interface OSMNode {
    type: 'node';
    id: number;
    lat: number;
    lon: number;
    tags?: Record<string, string>;
}

interface OSMWay {
    type: 'way';
    id: number;
    nodes: number[];
    tags?: Record<string, string>;
}

interface OverpassResponse {
    version: number;
    generator: string;
    elements: (OSMNode | OSMWay)[];
}

// Cache configuration
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
let lastRequestTime = 0;

// Cache key generation
const getCacheKey = (stops: LatLng[]): string => {
    const bbox = getBoundingBox(stops);
    return `railway_cache_${bbox.south}_${bbox.west}_${bbox.north}_${bbox.east}`;
};

// Check cache first, then fetch if needed
const getCachedOrFetch = async (cacheKey: string, fetchFunction: () => Promise<any>): Promise<any> => {
    try {
        // Check cache first
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
                console.log('[RailwayRouting] Using cached data');
                return data;
            }
        }
        
        // Rate limiting - wait if needed
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
            const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
            console.log(`[RailwayRouting] Rate limiting: waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        lastRequestTime = Date.now();
        
        // Fetch fresh data
        const data = await fetchFunction();
        
        // Cache the result
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        
        return data;
    } catch (error) {
        console.warn('[RailwayRouting] Cache error:', error);
        // Fallback to direct fetch
        return await fetchFunction();
    }
};

// Helper function to calculate bounding box
const getBoundingBox = (stops: LatLng[]) => {
    return {
        south: Math.min(...stops.map(s => s.latitude)) - 0.05,
        west: Math.min(...stops.map(s => s.longitude)) - 0.05,
        north: Math.max(...stops.map(s => s.latitude)) + 0.05,
        east: Math.max(...stops.map(s => s.longitude)) + 0.05,
    };
};

// Helper function to create simple direct connections as fallback  
const createDirectConnections = (stops: LatLng[]): LatLng[] => {
    const result: LatLng[] = [];
    stops.forEach(stop => {
        result.push(stop);
    });
    return result;
};

// Helper function to process Overpass API response  
const processOverpassResponse = (data: OverpassResponse, stops: LatLng[]): LatLng[] => {
    // Build node map
    const nodes = new Map<number, OSMNode>();
    data.elements.forEach(element => {
        if (element.type === 'node') {
            nodes.set(element.id, element);
        }
    });

    // Extract all ways and merge them
    const ways = data.elements.filter((e): e is OSMWay => e.type === 'way');
    
    if (ways.length === 0) {
        console.warn('[RailwayRouting] No railway tracks found for multi-stop route');
        return stops;
    }

    // Convert all ways to coordinates and merge
    const allCoordinates: LatLng[] = [];
    
    for (const way of ways) {
        for (const nodeId of way.nodes) {
            const node = nodes.get(nodeId);
            if (node) {
                allCoordinates.push({
                    latitude: node.lat,
                    longitude: node.lon,
                });
            }
        }
    }
    
    return allCoordinates.length > 0 ? allCoordinates : stops;
};

/**
 * Fetch complete railway route for multiple stops
 * Connects all stops using railway tracks from OSM
 */
export async function fetchMultiStopRailwayRoute(
    stops: LatLng[]
): Promise<LatLng[]> {
    if (stops.length < 2) {
        return stops;
    }

    console.log('[RailwayRouting] Fetching multi-stop railway route...');
    console.log('[RailwayRouting] Stops:', stops.length);

    const cacheKey = getCacheKey(stops);
    
    const fetchRailwayData = async () => {
        // For multiple stops, we'll fetch the entire bounding box at once
        const bbox = getBoundingBox(stops);

        const query = `
            [out:json][timeout:25];
            (
                way["railway"~"^(rail|light_rail|narrow_gauge)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
                relation["type"="route"]["route"="train"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
            );
            (._;>;);
            out geom;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: query.trim(),
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }

        const data: OverpassResponse = await response.json();
        console.log('[RailwayRouting] Received elements:', data.elements.length);

        // Process the response
        const railwayCoordinates = processOverpassResponse(data, stops);
        console.log('[RailwayRouting] Total railway coordinates:', railwayCoordinates.length);
        
        return railwayCoordinates;
    };

    try {
        return await getCachedOrFetch(cacheKey, fetchRailwayData);
    } catch (error) {
        console.error('[RailwayRouting] Error fetching multi-stop railway route:', error);
        
        // Fallback to simple direct connections
        return createDirectConnections(stops);
    }
}

/**
 * Fetch railway route between two points
 * Uses OSM railway data via Overpass API
 */
export async function fetchRailwayRoute(
    start: LatLng,
    end: LatLng,
    intermediate?: LatLng[]
): Promise<LatLng[]> {
    const allStops = [start, ...(intermediate || []), end];
    return fetchMultiStopRailwayRoute(allStops);
}