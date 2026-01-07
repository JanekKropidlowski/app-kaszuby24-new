import { TransportStop, TransportService } from './transportService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface RouteLeg {
    mode: 'WALK' | 'RIDE';
    brand?: 'SKM' | 'PKP' | 'ZTM' | 'ZKM' | 'PKS' | 'POLREGIO';
    line?: string;
    direction?: string;
    fromName: string;
    toName: string;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    duration: number;  // minutes
    stops?: number;    // count of stops
}

export interface RouteOption {
    id: string;
    legs: RouteLeg[];
    totalDuration: number;
    startTime: string;
    endTime: string;
    changes: number; // 0 = direct
    tags: string[];  // ['FASTEST', 'DIRECT', 'CHEAP']
}

const HUBS = [
    { name: 'Gdynia Główna', keywords: ['Gdynia Główna', 'Dworzec Gł'] },
    { name: 'Gdańsk Główny', keywords: ['Gdańsk Główny'] },
    { name: 'Gdańsk Wrzeszcz', keywords: ['Gdańsk Wrzeszcz', 'Wrzeszcz PKP'] },
    { name: 'Sopot', keywords: ['Sopot', 'Sopot PKP'] },
    { name: 'Reda', keywords: ['Reda', 'Reda Dworzec'] },
    { name: 'Rumia', keywords: ['Rumia', 'Rumia Dworzec'] },
    { name: 'Wejherowo', keywords: ['Wejherowo', 'Wejherowo Dworzec'] }
];

// Helper: Distance
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // meters
};

// Helper: Time math
const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};
const formatTime = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};

export const TransportRoutingEngine = {

    // 1. Resolve Location to Stops
    async resolveStartStops(lat: number, lon: number, allStops: TransportStop[]): Promise<TransportStop[]> {
        // Find 5 closest stops within 1.5km
        const candidates = allStops
            .map(s => ({ ...s, dist: getDistance(lat, lon, s.lat, s.lon) }))
            .filter(s => s.dist < 1500)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 5);
        return candidates;
    },

    // 2. Strict Timetable Check (Is there a bus from A to B?)
    async checkDirectConnection(from: TransportStop, to: TransportStop, time: string): Promise<RouteOption | null> {
        // Fetch departures for start stop
        const timetable = await TransportService.fetchTimetable(from.agency || 'unknown', from.id, from.agencyIds);
        if (!timetable || timetable.length === 0) return null;

        // Filter valid lines
        // Heuristic: Does the destination match?
        // OR: Do we have a shared route structure?

        // Optimize: Check just top 20 departures to avoid long loops
        const departures = timetable.slice(0, 30);

        for (const dep of departures) {
            // Check if destination matches vaguely
            const destName = dep.direction || dep.destination || '';

            // Check if this trip actually stops at 'to'
            // We need trip_id to verify. 
            if (dep.trip_id) {
                // Check cache first for trip details
                const stops = await TransportService.fetchTripDetails(from.agency || 'unknown', dep.trip_id);
                // Look for 'to' in stops list AFTER 'from'
                // Note: fetchTripDetails returns simple list usually.

                const startIndex = stops.findIndex((s: any) => s.stop_name?.includes(from.name) || getDistance(parseFloat(s.stop_lat), parseFloat(s.stop_lon), from.lat, from.lon) < 200);
                const endIndex = stops.findIndex((s: any) => s.stop_name?.includes(to.name) || getDistance(parseFloat(s.stop_lat), parseFloat(s.stop_lon), to.lat, to.lon) < 200);

                if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                    // Valid connection!
                    const depTimeM = parseTime(dep.time || time);
                    const dur = (parseTime(stops[endIndex].arrival_time || dep.time) - parseTime(stops[startIndex].departure_time || dep.time)); // approx

                    return {
                        id: `dir_${dep.trip_id}`,
                        legs: [{
                            mode: 'RIDE',
                            line: dep.line,
                            direction: dep.destination,
                            fromName: from.name,
                            toName: to.name,
                            startTime: dep.time, // from API
                            endTime: formatTime(depTimeM + Math.max(dur, 10)), // Estimate if needed
                            duration: Math.max(dur, 10)
                        }],
                        totalDuration: Math.max(dur, 10),
                        startTime: dep.time,
                        endTime: formatTime(depTimeM + Math.max(dur, 10)),
                        changes: 0,
                        tags: ['DIRECT']
                    };
                }
            }
        }

        return null;
    },

    // 3. Main Search Function
    async findRoute(from: TransportStop | { lat: number, lon: number }, to: TransportStop): Promise<RouteOption[]> {
        const solutions: RouteOption[] = [];
        const allStops = await TransportService.getAllStops();

        let startStops: TransportStop[] = [];

        // Identify Start
        if ('id' in from) {
            startStops = [from as TransportStop];
        } else {
            startStops = await this.resolveStartStops(from.lat, from.lon, allStops);
        }

        if (startStops.length === 0) return [];

        const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

        // Strategy A: Direct Connection
        for (const s of startStops) {
            const walkTime = 'id' in from ? 0 : Math.ceil(getDistance(from.lat, from.lon, s.lat, s.lon) / 80); // 80m/min walk

            const direct = await this.checkDirectConnection(s, to, now);
            if (direct) {
                // Add Walking leg if needed
                if (walkTime > 0) {
                    direct.legs.unshift({
                        mode: 'WALK',
                        fromName: 'Moja lokalizacja',
                        toName: s.name,
                        startTime: now,
                        endTime: formatTime(parseTime(now) + walkTime),
                        duration: walkTime
                    });
                    direct.totalDuration += walkTime;
                    direct.startTime = now;
                }
                solutions.push(direct);
            }
        }

        // Strategy B: Hub Connection (if no direct found)
        if (solutions.length === 0) {
            // Find best hub
            // 1. Is Start near a hub?
            // 2. Is End near a hub?
            // 3. Are they connected by SKM/PKP?

            // Simplified: Iterate known hubs
            // Check: Start -> Hub (Bus) AND Hub -> End (Bus/Train)
            // This is expensive, so limit to 2 nearest hubs

            const relevantHubs = HUBS.filter(h => {
                // Heuristic filtering...
                return true;
            }).slice(0, 3); // Check top 3 hubs

            for (const hubDef of relevantHubs) {
                // Find hub stop object
                const hubStop = allStops.find((s: TransportStop) => s.name.includes(hubDef.name) && (s.agency?.includes('rail') || s.agency?.includes('skm')));
                if (!hubStop) continue;

                // Check leg 1
                // ... logic to implement ...
            }
        }

        return solutions.sort((a, b) => a.totalDuration - b.totalDuration);
    }
};
