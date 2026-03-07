import { TransportStop, TransportService } from './transportService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSPORT_CONFIG } from '../constants/TransportConfig';
import { OTPService } from './otpService';

// Types
export interface StopPoint {
    name: string;
    lat: number;
    lon: number;
    arrivalTime?: string;
    departure_time?: string;
}

export interface WalkStep {
    instruction: string;
    distance: number;
    duration: number;
}

export interface RouteLeg {
    mode: 'WALK' | 'RIDE';
    brand?: 'SKM' | 'PKP' | 'ZTM' | 'ZKM' | 'PKS' | 'POLREGIO' | string;
    line?: string;
    direction?: string;
    fromName: string;
    toName: string;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    duration: number;  // minutes
    stops?: number;    // count of stops
    intermediateStops?: StopPoint[];
    steps?: WalkStep[];
    distance?: number; // meters
    legGeometry?: {
        points: string;
        length: number;
    };
    routeColor?: string; // hex without #
    from?: { lat: number; lon: number };
    to?: { lat: number; lon: number };
}

export interface RouteOption {
    id: string;
    legs: RouteLeg[];
    totalDuration: number;
    startTime: string;
    startTimeTimestamp?: number; // Added for correct date grouping
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
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};
const formatTime = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};

// Helper: Normalize names for comparison
const normalize = (s: string) => s.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/(główny|główna|osobowa|pkp)/g, '');

const isSameStation = (n1: string, n2: string) => {
    return normalize(n1).includes(normalize(n2)) || normalize(n2).includes(normalize(n1));
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

        if (!timetable || timetable.length === 0) {
            return null;
        }

        // Optimize: Check just top 20 departures to avoid long loops
        const departures = timetable.slice(0, 30);

        for (const dep of departures) {
            const destName = dep.direction || dep.destination || '';
            let valid = false;
            let dur = 20; // Default estimate
            let stopListCount = undefined;

            // Strategy A: Full Path Verification (Most Accurate)
            if (dep.trip_id) {
                try {
                    const details: any = await TransportService.fetchTripDetails(from.agency || 'unknown', dep.trip_id);
                    // Handle both {stops: []} and [] formats
                    const stops = (details && Array.isArray(details)) ? details : (details?.stops || []);

                    if (stops.length > 0) {
                        const startIndex = stops.findIndex((s: any) =>
                            isSameStation(s.stop_name || s.name || '', from.name) ||
                            getDistance(parseFloat(s.stop_lat || s.lat || 0), parseFloat(s.stop_lon || s.lon || 0), from.lat, from.lon) < 500
                        );
                        const endIndex = stops.findIndex((s: any) =>
                            isSameStation(s.stop_name || s.name || '', to.name) ||
                            getDistance(parseFloat(s.stop_lat || s.lat || 0), parseFloat(s.stop_lon || s.lon || 0), to.lat, to.lon) < 500
                        );

                        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                            valid = true;
                            stopListCount = endIndex - startIndex;

                            // Accurate duration calculation
                            const depTime = stops[startIndex].departure_time || dep.time;
                            const arrTime = stops[endIndex].arrival_time || stops[endIndex].departure_time;
                            if (depTime && arrTime) {
                                dur = parseTime(arrTime) - parseTime(depTime);
                            }
                        }
                    }
                } catch (e) {
                }
            }

            // Strategy B: Heuristic (Fallback)
            // If verification failed (or no data), check if Destination Name matches Target
            if (!valid) {
                // If the train goes to "Gdynia Główna" and we want to go to "Gdynia Główna" -> Valid
                if (isSameStation(destName, to.name)) {
                    valid = true;
                    // Rough duration estimate based on distance (assuming ~50km/h avg speed)
                    const distKm = getDistance(from.lat, from.lon, to.lat, to.lon) / 1000;
                    dur = Math.round((distKm / 50) * 60) + 5;
                }
            }

            if (valid) {
                const depTimeM = parseTime(dep.time || time);

                // Normalize Agency Name for UI
                let brand: RouteLeg['brand'] = 'ZTM';
                const ag = (from.agency || '').toLowerCase();
                if (ag.includes('skm')) brand = 'SKM';
                else if (ag.includes('polregio') || ag.includes('regio')) brand = 'POLREGIO';
                else if (ag.includes('pkp') || ag.includes('intercity')) brand = 'PKP';
                else if (ag.includes('pks')) brand = 'PKS';
                else if (ag.includes('gdynia')) brand = 'ZKM';

                return {
                    id: `dir_${dep.trip_id || Math.random()}`,
                    legs: [{
                        mode: 'RIDE',
                        brand,
                        line: dep.line,
                        direction: destName,
                        fromName: from.name,
                        toName: to.name,
                        startTime: dep.time,
                        endTime: formatTime(depTimeM + dur),
                        duration: dur,
                        stops: stopListCount
                    }],
                    totalDuration: dur,
                    startTime: dep.time,
                    endTime: formatTime(depTimeM + dur),
                    changes: 0,
                    tags: ['DIRECT']
                };
            }
        }

        return null;
    },

    // 3. Main Search Function
    async findRoute(
        from: TransportStop | { lat: number, lon: number },
        to: TransportStop,
        filters?: {
            transportModes?: string[];
            maxTransfers?: number;
        }
    ): Promise<RouteOption[]> {
        // --- Phase 2: OpenTripPlanner (OTP) Integration ---
        if (TRANSPORT_CONFIG.USE_OTP) {
            try {
                const fromCoords = 'id' in from ? `${from.lat},${from.lon}` : `${from.lat},${from.lon}`;
                const toCoords = `${to.lat},${to.lon}`;

                // Get current time for OTP query
                const currentTime = new Date();
                const timeStr = currentTime.toTimeString().substring(0, 5); // "HH:MM"
                const dateStr = currentTime.toISOString().split('T')[0]; // "YYYY-MM-DD"


                // OPTIONAL: Early verification log (can be removed later)
                if (__DEV__) {
                    this.verifyOTPConnection();
                }

                let otpSolutions = await OTPService.planTrip({
                    fromPlace: fromCoords,
                    toPlace: toCoords,
                    time: timeStr,
                    date: dateStr,
                    transportModes: filters?.transportModes,
                    maxTransfers: filters?.maxTransfers
                });

                // RETRY LOGIC: If no results, try next day morning (04:00)
                if (otpSolutions.length === 0) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const nextDateStr = tomorrow.toISOString().split('T')[0];

                    otpSolutions = await OTPService.planTrip({
                        fromPlace: fromCoords,
                        toPlace: toCoords,
                        date: nextDateStr,
                        time: '04:00'
                    });
                }

                // REFINED FALLBACK:
                // If OTP contacted successfully, return its results (even if 0).
                // Do NOT fallback to legacy if OTP specifically says "no route found".
                return otpSolutions;

            } catch (error: any) {
                // ONLY fallback on technical errors (Connection Refused, Timeout, 500)
                console.error('[Routing] OTP Technical Error, falling back to legacy logic:', error.message);
                // Continue to legacy logic below
            }
        }

        // --- Legacy Client-Side Routing Engine ---
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
            // ... (rest of legacy logic)
            const relevantHubs = HUBS.filter(h => true).slice(0, 3);

            for (const hubDef of relevantHubs) {
                const hubStop = allStops.find((s: TransportStop) =>
                    (isSameStation(s.name, hubDef.name) || s.name.includes(hubDef.name)) &&
                    (s.agency?.includes('rail') || s.agency?.includes('skm') || s.agency?.includes('pkp') || s.agency?.includes('gdynia') || s.agency?.includes('gdansk'))
                );
                if (!hubStop) continue;

                const leg1 = await this.checkDirectConnection(startStops[0], hubStop, now);
                if (!leg1) continue;

                const arrivalTimeM = parseTime(leg1.endTime);
                const depTimeLeg2 = formatTime(arrivalTimeM + 7);

                const leg2 = await this.checkDirectConnection(hubStop, to, depTimeLeg2);

                if (leg2) {
                    solutions.push({
                        id: `${leg1.id}_${leg2.id}`,
                        legs: [...leg1.legs, ...leg2.legs],
                        totalDuration: leg1.totalDuration + 7 + leg2.totalDuration,
                        startTime: leg1.startTime,
                        endTime: leg2.endTime,
                        changes: 1,
                        tags: ['TRANSFER', leg1.legs[0].brand === leg2.legs[0].brand ? 'SAME_AGENCY' : 'MULTI_AGENCY']
                    });
                }
            }
        }

        return solutions.sort((a, b) => {
            // Priority-based sorting: SKM > POLREGIO > MZK > others
            const priorityA = TransportRoutingEngine.getRoutePriority(a);
            const priorityB = TransportRoutingEngine.getRoutePriority(b);

            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }

            // If same priority, sort by duration
            return a.totalDuration - b.totalDuration;
        });
    },

    /**
     * Calculate route priority based on transport brand
     * SKM (100) > POLREGIO (90) > MZK (80) > others
     */
    getRoutePriority(route: RouteOption): number {
        let maxPriority = 0;

        for (const leg of route.legs) {
            if (leg.mode === 'WALK') continue;

            let priority = 0;
            const brand = leg.brand?.toUpperCase() || '';

            if (brand.includes('SKM')) priority = 100;
            else if (brand.includes('POLREGIO')) priority = 90;
            else if (brand.includes('MZK')) priority = 80;
            else if (brand.includes('ZTM')) priority = 70;
            else if (brand.includes('ZKM')) priority = 60;
            else if (brand.includes('PKS')) priority = 50;
            else if (brand.includes('PKP')) priority = 40;
            else priority = 30;

            maxPriority = Math.max(maxPriority, priority);
        }

        return maxPriority;
    },

    /**
     * Diagnostic method to verify OTP connection and log available agencies
     */
    async verifyOTPConnection() {
        try {
            const agencies = await OTPService.getAgencies();
            if (agencies.length > 0) {
            } else {
            }
        } catch (e) {
            console.warn('[Routing] OTP Connection failed during verification');
        }
    }
};
