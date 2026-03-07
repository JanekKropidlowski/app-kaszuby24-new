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

interface OSMNode {
    type: 'node';
    id: number;
    lat: number;
    lon: number;
}

interface OSMWay {
    type: 'way';
    id: number;
    nodes: number[];
    tags: {
        railway?: string;
        name?: string;
        gauge?: string;
        electrified?: string;
        [key: string]: string | undefined;
    };
}

interface OverpassResponse {
    version: number;
    elements: (OSMNode | OSMWay)[];
}

/**
 * Fetch railway tracks between two points using Overpass API
 * @param start Starting coordinate
 * @param end Ending coordinate
 * @param radius Search radius in meters (default 2000m = 2km)
 * @returns Array of coordinates representing railway tracks
 */
export async function fetchRailwayRoute(
    start: LatLng,
    end: LatLng,
    radius: number = 2000
): Promise<LatLng[]> {
    try {
        // Calculate bounding box
        const bbox = {
            south: Math.min(start.latitude, end.latitude) - 0.05,
            west: Math.min(start.longitude, end.longitude) - 0.05,
            north: Math.max(start.latitude, end.latitude) + 0.05,
            east: Math.max(start.longitude, end.longitude) + 0.05,
        };

        // Overpass QL query to get railway tracks
        // Priority: railway=rail (main lines), railway=light_rail (urban rail)
        const query = `
            [out:json][timeout:25];
            (
                way["railway"="rail"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
                way["railway"="light_rail"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
            );
            out body;
            >;
            out skel qt;
        `;

        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        
        console.log('[RailwayRouting] Fetching tracks from Overpass API...');
        console.log('[RailwayRouting] Bbox:', bbox);

        const response = await fetch(overpassUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`,
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }

        const data: OverpassResponse = await response.json();
        console.log('[RailwayRouting] Received elements:', data.elements.length);

        // Build node map
        const nodes = new Map<number, OSMNode>();
        data.elements.forEach(element => {
            if (element.type === 'node') {
                nodes.set(element.id, element);
            }
        });

        // Extract ways and convert to coordinates
        const ways = data.elements.filter((e): e is OSMWay => e.type === 'way');
        
        if (ways.length === 0) {
            console.warn('[RailwayRouting] No railway tracks found, falling back to direct line');
            return [start, end];
        }

        // Find the way closest to our start point
        const startWay = findClosestWay(ways, nodes, start);
        
        if (!startWay) {
            console.warn('[RailwayRouting] No suitable railway way found');
            return [start, end];
        }

        // Convert way nodes to coordinates
        const coordinates: LatLng[] = [];
        for (const nodeId of startWay.nodes) {
            const node = nodes.get(nodeId);
            if (node) {
                coordinates.push({
                    latitude: node.lat,
                    longitude: node.lon,
                });
            }
        }

        console.log('[RailwayRouting] Extracted railway coordinates:', coordinates.length);
        
        // If we got less than 2 points, return direct line
        if (coordinates.length < 2) {
            return [start, end];
        }

        return coordinates;

    } catch (error) {
        console.error('[RailwayRouting] Error fetching railway route:', error);
        // Fallback to direct line
        return [start, end];
    }
}

/**
 * Find the way closest to a given point
 */
function findClosestWay(
    ways: OSMWay[],
    nodes: Map<number, OSMNode>,
    point: LatLng
): OSMWay | null {
    let closestWay: OSMWay | null = null;
    let minDistance = Infinity;

    for (const way of ways) {
        // Get first node of the way
        const firstNodeId = way.nodes[0];
        const firstNode = nodes.get(firstNodeId);
        
        if (!firstNode) continue;

        const distance = calculateDistance(
            point.latitude,
            point.longitude,
            firstNode.lat,
            firstNode.lon
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestWay = way;
        }
    }

    return closestWay;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

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
}
