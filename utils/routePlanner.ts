import { TransportRoutingEngine } from '../services/TransportRoutingEngine';
import { TransportStop } from '../services/transportService';

// ============================================================================
// TYPES (Legacy - Kept for valid UI contracts)
// ============================================================================

export interface Stop {
    id: string;
    uid: string;
    name: string;
    lat: number;
    lon: number;
    agency: string;
    agencies?: string[];
}

export interface Departure {
    time: string;
    line: string;
    dest: string;
    service_id: string;
    agency: string;
}

// UI expects this structure (Journey)
export interface Connection {
    from: Stop;
    to: Stop;
    departure: string;
    arrival: string;
    line: string;
    agency: string;
    brand?: string;     // Added for new UI
    direction?: string; // Added for new UI
    stops?: number;     // Added for new UI
    duration: number;
}

export interface Transfer {
    stop: Stop;
    walkingTime: number;
    distance: number;
}

export interface Journey {
    connections: Connection[];
    transfers: Transfer[];
    totalDuration: number;
    totalWalkingTime: number;
    departureTime: string;
    arrivalTime: string;
    numberOfTransfers: number;
    agencies: string[];
    score: number;
}

export interface RouteSearchParams {
    from: Stop;
    to: Stop;
    departureTime?: string;
    arrivalTime?: string;
    maxTransfers?: number;
    maxWalkingDistance?: number;
    preferredAgencies?: string[];
    date?: string;
}

// ============================================================================
// MAIN ROUTE PLANNING ADAPTER
// ============================================================================

/**
 * Plans route using the new TransportRoutingEngine
 * Acts as an adapter to format the result for standard UI
 */
export const planRoute = async (
    params: RouteSearchParams,
    allStops: Stop[],
    getDepartures: any // Legacy param, ignored as Engine allows self-fetching
): Promise<Journey[]> => {

    // 1. Map 'Stop' to 'TransportStop'
    const mapToTransportStop = (s: any): TransportStop => {
        const agencyIds: Record<string, string> = {};

        // Handle agencyStops (array) if available
        if (s.agencyStops && Array.isArray(s.agencyStops)) {
            s.agencyStops.forEach((as: any) => {
                agencyIds[as.agency] = as.stopId;
            });
        }

        // Ensure primary agency/ID is always present
        if (s.agency && s.id && !agencyIds[s.agency]) {
            agencyIds[s.agency] = s.id;
        }

        return {
            id: s.id,
            name: s.name,
            lat: s.lat,
            lon: s.lon,
            agency: s.agency,
            agencyIds
        };
    };

    const fromStop = mapToTransportStop(params.from);
    const toStop = mapToTransportStop(params.to);

    console.log('[Adapter] Delegating to TransportRoutingEngine...');

    try {
        // 2. Call New Engine
        const options = await TransportRoutingEngine.findRoute(fromStop, toStop);

        // 3. Map 'RouteOption' back to 'Journey'
        return options.map(opt => {
            const connections: Connection[] = opt.legs.map(leg => {
                // Heuristic to find approx Start/End stops for the leg
                // In a real scenario, legs would have stop IDs.
                // For now, we assume Start=From, End=To for direct.
                return {
                    from: params.from, // Simplified
                    to: params.to,     // Simplified
                    departure: leg.startTime,
                    arrival: leg.endTime,
                    line: leg.line || 'Walk',
                    agency: leg.brand?.toLowerCase() || 'walk',
                    brand: leg.brand,
                    direction: leg.direction,
                    stops: leg.stops,
                    duration: leg.duration
                };
            });

            // Transfers logic (simplified for direct routes for now)
            const transfers: Transfer[] = [];

            return {
                connections,
                transfers,
                totalDuration: opt.totalDuration,
                totalWalkingTime: 0, // Calculated inside engine
                departureTime: opt.startTime,
                arrivalTime: opt.endTime,
                numberOfTransfers: opt.changes,
                agencies: opt.legs.map(l => l.brand?.toLowerCase() || 'walk'),
                score: 1000 - opt.totalDuration
            };
        });

    } catch (e) {
        console.error('[Adapter] Engine Error:', e);
        return [];
    }
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
    planRoute
};
