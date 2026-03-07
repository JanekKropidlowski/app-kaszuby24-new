import axios from 'axios';
import { RouteOption, RouteLeg } from './TransportRoutingEngine';
import { TRANSPORT_CONFIG } from '../constants/TransportConfig';

export interface OTPPlanParams {
    fromPlace: string; // "lat,lon"
    toPlace: string;   // "lat,lon"
    time?: string;     // "HH:mm"
    date?: string;     // "YYYY-MM-DD"
    arriveBy?: boolean;
    transportModes?: string[]; // e.g. ["BUS", "RAIL"]
    maxTransfers?: number;     // e.g. 0 for direct
}

export const OTPService = {
    /**
     * Convert agency name to OTP feed ID format
     */
    getOTPStopId(stopId: string, agency: string): string {
        const feedMapping: { [key: string]: number } = {
            'skm': 2,
            'polregio': 1,
            'pks': 3,
            'pksgdynia': 3,
            'pks gdynia': 3,
            'mzk': 4,
            'mzk wejherowo': 4,
            'mzk_wejherowo': 4,
        };
        
        const feedId = feedMapping[agency.toLowerCase()] || 1;
        return `${feedId}:${stopId}`;
    },

    /**
     * Get departures for a specific stop using OTP GraphQL
     */
    async getDepartures(stopId: string, agency: string, date?: string): Promise<any[]> {
        try {
            const otpStopId = this.getOTPStopId(stopId, agency);
            const targetDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            const query = `
                query StopDepartures($stopId: String!, $date: String!) {
                    stop(id: $stopId) {
                        name
                        stoptimesForServiceDate(date: $date) {
                            pattern {
                                route {
                                    shortName
                                    longName
                                    agency {
                                        name
                                    }
                                }
                                headsign
                            }
                            stoptimes {
                                scheduledDeparture
                                trip {
                                    id
                                    gtfsId
                                }
                            }
                        }
                    }
                }
            `;

            const variables = {
                stopId: otpStopId,
                date: targetDate
            };

            
            const result = await this.executeGraphQL(query, variables);
            
            if (!result.stop) {
                console.warn(`[OTPService] No stop found for ID: ${otpStopId}`);
                return [];
            }

            // Process and flatten departures
            const departures: any[] = [];
            
            result.stop.stoptimesForServiceDate?.forEach((servicePattern: any) => {
                const route = servicePattern.pattern?.route;
                const headsign = servicePattern.pattern?.headsign;
                
                servicePattern.stoptimes?.forEach((stoptime: any) => {
                    departures.push({
                        time: this.formatDepartureTime(stoptime.scheduledDeparture),
                        line: route?.shortName || 'N/A',
                        direction: headsign || route?.longName || 'Unknown',
                        operator: route?.agency?.name,
                        realtime: false,
                        platform: '',
                        trip_id: stoptime.trip?.gtfsId
                    });
                });
            });

            // Sort by departure time
            departures.sort((a, b) => a.time.localeCompare(b.time));
            
            return departures;

        } catch (error) {
            console.error(`[OTPService] Error fetching departures for ${agency}:${stopId}:`, error);
            return [];
        }
    },

    /**
     * Format OTP departure time (seconds since midnight) to HH:MM
     */
    formatDepartureTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    },

    /**
     * Get trip stops and times for a specific trip using OTP GraphQL
     */
    async getTripStops(tripId: string): Promise<any> {
        try {
            // OTP returns stoptimes in route order, so we use array index as sequence
            const query = `
                query TripStops($tripId: String!) {
                    trip(id: $tripId) {
                        gtfsId
                        route {
                            shortName
                            longName
                        }
                        pattern {
                            headsign
                        }
                        stoptimesForDate(serviceDate: "${new Date().toISOString().split('T')[0]}") {
                            scheduledDeparture
                            scheduledArrival
                            stop {
                                gtfsId
                                name
                                lat
                                lon
                            }
                        }
                    }
                }
            `;

            const variables = { tripId };


            const result = await this.executeGraphQL(query, variables);

            if (!result.trip) {
                console.warn(`[OTPService] No trip found for ID: ${tripId}`);
                return null;
            }

            const trip = result.trip;
            const stoptimes = trip.stoptimesForDate || trip.stoptimes || [];

            // Convert to format expected by RouteMapModal
            // OTP returns stoptimes in route order, so array index = stop sequence
            const stops = stoptimes.map((stoptime: any, index: number) => {
                const departures = [{
                    time: this.formatDepartureTime(stoptime.scheduledDeparture),
                    line: trip.route?.shortName || 'N/A',
                    direction: trip.pattern?.headsign || trip.route?.longName || 'Unknown'
                }];

                return {
                    stop_id: stoptime.stop.gtfsId.split(':')[1], // Remove feed prefix
                    stop_name: stoptime.stop.name,
                    stop_lat: stoptime.stop.lat,
                    stop_lon: stoptime.stop.lon,
                    stop_sequence: index, // Use array index as sequence (OTP returns in order)
                    departure_time: this.formatDepartureTime(stoptime.scheduledDeparture),
                    arrival_time: this.formatDepartureTime(stoptime.scheduledArrival),
                    departures: departures
                };
            });

            // Already in order from OTP, but sort to be safe
            stops.sort((a: any, b: any) => a.stop_sequence - b.stop_sequence);


            return {
                trip_id: tripId,
                line: trip.route?.shortName || 'N/A',
                direction: trip.pattern?.headsign || trip.route?.longName || 'Unknown',
                stops: stops
            };

        } catch (error) {
            console.error(`[OTPService] Error fetching trip stops for ${tripId}:`, error);
            return null;
        }
    },

    /**
     * Get all stops and departures for a PKS line using OTP GraphQL
     */
    async getPKSLineTimetable(lineNumber: string, date?: string): Promise<any> {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];

            // Get route - OTP returns stoptimes in route order, so we use array index as sequence
            const routeQuery = `
                query GetPKSRoute($lineNumber: String!) {
                    routes(feeds: ["3"], name: $lineNumber) {
                        gtfsId
                        shortName
                        longName
                        patterns {
                            code
                            headsign
                            tripsForDate(serviceDate: "${targetDate}") {
                                gtfsId
                                stoptimesForDate(serviceDate: "${targetDate}") {
                                    stop {
                                        gtfsId
                                        name
                                        lat
                                        lon
                                    }
                                    scheduledDeparture
                                }
                            }
                        }
                    }
                }
            `;


            const routeResult = await this.executeGraphQL(routeQuery, { lineNumber });

            if (!routeResult.routes || routeResult.routes.length === 0) {
                console.warn(`[OTPService] No PKS route found for line: ${lineNumber}`);
                return { stops: [], stopsByDirection: {}, availableDirections: [], directionTrips: {} };
            }

            const route = routeResult.routes[0];

            // Group stops by direction (headsign) - each direction has its own stop sequence
            const stopsByDirection: { [direction: string]: Map<string, any> } = {};
            const directionTrips: { [direction: string]: string[] } = {};
            // Track stop order per direction - ONLY from first trip (canonical order)
            const directionStopOrder: { [direction: string]: string[] } = {};
            const directionOrderSet: { [direction: string]: boolean } = {}; // Flag if order is set

            // Collect stops from all trips, grouped by direction
            route.patterns.forEach((pattern: any) => {
                const direction = pattern.headsign || route.longName || 'Unknown';

                if (!stopsByDirection[direction]) {
                    stopsByDirection[direction] = new Map();
                    directionTrips[direction] = [];
                    directionStopOrder[direction] = [];
                    directionOrderSet[direction] = false;
                }

                if (pattern.tripsForDate && pattern.tripsForDate.length > 0) {
                    pattern.tripsForDate.forEach((trip: any) => {
                        directionTrips[direction].push(trip.gtfsId);

                        if (trip.stoptimesForDate && trip.stoptimesForDate.length > 0) {
                            // Use FIRST trip's stop order as canonical (ignore subsequent trips for ordering)
                            if (!directionOrderSet[direction]) {
                                directionStopOrder[direction] = trip.stoptimesForDate.map((st: any) => st.stop.gtfsId);
                                directionOrderSet[direction] = true;
                            }

                            // Collect all departures from all trips
                            trip.stoptimesForDate.forEach((stoptime: any) => {
                                const stop = stoptime.stop;
                                const stopKey = stop.gtfsId;

                                if (!stopsByDirection[direction].has(stopKey)) {
                                    stopsByDirection[direction].set(stopKey, {
                                        stop_id: stop.gtfsId.split(':')[1],
                                        stop_name: stop.name,
                                        stop_lat: stop.lat,
                                        stop_lon: stop.lon,
                                        departures: []
                                    });
                                }

                                // Add this departure
                                stopsByDirection[direction].get(stopKey).departures.push({
                                    time: this.formatDepartureTime(stoptime.scheduledDeparture),
                                    line: lineNumber,
                                    direction: direction,
                                    trip_id: trip.gtfsId
                                });
                            });
                        }
                    });
                }
            });

            // Convert and sort stops for each direction using tracked stop order
            const formattedStopsByDirection: { [direction: string]: any[] } = {};

            Object.keys(stopsByDirection).forEach(direction => {
                const stopOrder = directionStopOrder[direction];
                const stopsMap = stopsByDirection[direction];

                // Build array in correct route order
                const stopsArray: any[] = [];
                stopOrder.forEach((stopKey, index) => {
                    if (stopsMap.has(stopKey)) {
                        const stop = stopsMap.get(stopKey);
                        stop.stop_sequence = index;
                        // Sort departures for each stop by time
                        stop.departures.sort((a: any, b: any) => a.time.localeCompare(b.time));
                        stopsArray.push(stop);
                    }
                });

                formattedStopsByDirection[direction] = stopsArray;
            });

            const availableDirections = Object.keys(formattedStopsByDirection);

            // For backward compatibility, also return flat stops array (first direction)
            const firstDirection = availableDirections[0];
            const stopsWithDepartures = firstDirection ? formattedStopsByDirection[firstDirection] : [];

            if (stopsWithDepartures.length === 0) {
                console.warn(`[OTPService] No departures found for PKS line ${lineNumber} on ${targetDate}`);
            }

            return {
                stops: stopsWithDepartures,
                stopsByDirection: formattedStopsByDirection,
                availableDirections: availableDirections,
                directionTrips: directionTrips
            };

        } catch (error) {
            console.error(`[OTPService] Error fetching PKS line timetable:`, error);
            return { stops: [], stopsByDirection: {}, availableDirections: [], directionTrips: {} };
        }
    },

    /**
     * Get all stops and departures for an MZK line using OTP GraphQL
     */
    async getMZKLineTimetable(lineNumber: string, date?: string): Promise<any> {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];

            // Get route - OTP returns stoptimes in route order, so we use array index as sequence
            const routeQuery = `
                query GetMZKRoute($lineNumber: String!) {
                    routes(feeds: ["4"], name: $lineNumber) {
                        gtfsId
                        shortName
                        longName
                        patterns {
                            code
                            headsign
                            tripsForDate(serviceDate: "${targetDate}") {
                                gtfsId
                                stoptimesForDate(serviceDate: "${targetDate}") {
                                    stop {
                                        gtfsId
                                        name
                                        lat
                                        lon
                                    }
                                    scheduledDeparture
                                }
                            }
                        }
                    }
                }
            `;


            const routeResult = await this.executeGraphQL(routeQuery, { lineNumber });

            if (!routeResult.routes || routeResult.routes.length === 0) {
                console.warn(`[OTPService] No MZK route found for line: ${lineNumber}`);
                return { stops: [], stopsByDirection: {}, availableDirections: [], directionTrips: {} };
            }

            const route = routeResult.routes[0];

            // Group stops by direction (headsign) - each direction has its own stop sequence
            const stopsByDirection: { [direction: string]: Map<string, any> } = {};
            const directionTrips: { [direction: string]: string[] } = {};
            // Track stop order per direction - ONLY from first trip (canonical order)
            const directionStopOrder: { [direction: string]: string[] } = {};
            const directionOrderSet: { [direction: string]: boolean } = {}; // Flag if order is set

            // Collect stops from all trips, grouped by direction
            route.patterns.forEach((pattern: any) => {
                const direction = pattern.headsign || route.longName || 'Unknown';

                if (!stopsByDirection[direction]) {
                    stopsByDirection[direction] = new Map();
                    directionTrips[direction] = [];
                    directionStopOrder[direction] = [];
                    directionOrderSet[direction] = false;
                }

                if (pattern.tripsForDate && pattern.tripsForDate.length > 0) {
                    pattern.tripsForDate.forEach((trip: any) => {
                        directionTrips[direction].push(trip.gtfsId);

                        if (trip.stoptimesForDate && trip.stoptimesForDate.length > 0) {
                            // Use FIRST trip's stop order as canonical (ignore subsequent trips for ordering)
                            if (!directionOrderSet[direction]) {
                                directionStopOrder[direction] = trip.stoptimesForDate.map((st: any) => st.stop.gtfsId);
                                directionOrderSet[direction] = true;
                            }

                            // Collect all departures from all trips
                            trip.stoptimesForDate.forEach((stoptime: any) => {
                                const stop = stoptime.stop;
                                const stopKey = stop.gtfsId;

                                if (!stopsByDirection[direction].has(stopKey)) {
                                    stopsByDirection[direction].set(stopKey, {
                                        stop_id: stop.gtfsId.split(':')[1],
                                        stop_name: stop.name,
                                        stop_lat: stop.lat,
                                        stop_lon: stop.lon,
                                        departures: []
                                    });
                                }

                                // Add this departure
                                stopsByDirection[direction].get(stopKey).departures.push({
                                    time: this.formatDepartureTime(stoptime.scheduledDeparture),
                                    line: lineNumber,
                                    direction: direction,
                                    trip_id: trip.gtfsId
                                });
                            });
                        }
                    });
                }
            });

            // Convert and sort stops for each direction using tracked stop order
            const formattedStopsByDirection: { [direction: string]: any[] } = {};

            Object.keys(stopsByDirection).forEach(direction => {
                const stopOrder = directionStopOrder[direction];
                const stopsMap = stopsByDirection[direction];

                // Build array in correct route order
                const stopsArray: any[] = [];
                stopOrder.forEach((stopKey, index) => {
                    if (stopsMap.has(stopKey)) {
                        const stop = stopsMap.get(stopKey);
                        stop.stop_sequence = index;
                        // Sort departures for each stop by time
                        stop.departures.sort((a: any, b: any) => a.time.localeCompare(b.time));
                        stopsArray.push(stop);
                    }
                });

                formattedStopsByDirection[direction] = stopsArray;
            });

            const availableDirections = Object.keys(formattedStopsByDirection);

            // For backward compatibility, also return flat stops array (first direction)
            const firstDirection = availableDirections[0];
            const stopsWithDepartures = firstDirection ? formattedStopsByDirection[firstDirection] : [];

            if (stopsWithDepartures.length === 0) {
                console.warn(`[OTPService] No departures found for MZK line ${lineNumber} on ${targetDate}`);
            }

            return {
                stops: stopsWithDepartures,
                stopsByDirection: formattedStopsByDirection,
                availableDirections: availableDirections,
                directionTrips: directionTrips
            };

        } catch (error) {
            console.error(`[OTPService] Error fetching MZK line timetable:`, error);
            return { stops: [], stopsByDirection: {}, availableDirections: [], directionTrips: {} };
        }
    },

    /**
     * Helper for GraphQL requests
     */
    async executeGraphQL(query: string, variables: any = {}) {
        try {
            const response = await axios.post(TRANSPORT_CONFIG.OTP_GRAPHQL, {
                query,
                variables
            }, {
                timeout: 45000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.data.errors) {
                console.error('[OTPService] GraphQL Server Errors:', JSON.stringify(response.data.errors));
                throw new Error('GraphQL Request Failed');
            }

            return response.data.data;
        } catch (error: any) {
            if (error.response) {
                console.error(`[OTPService] Server Error (${error.response.status}):`, error.response.data);
            } else if (error.request) {
                console.error('[OTPService] No response received from server. Check firewall/connectivity.');
            } else {
                console.error('[OTPService] Request Setup Error:', error.message);
            }
            throw error;
        }
    },

    /**
     * Plans a trip using OpenTripPlanner GraphQL API
     */
    async planTrip(params: OTPPlanParams): Promise<RouteOption[]> {
        try {
            const { fromPlace, toPlace, time, date, arriveBy, transportModes, maxTransfers } = params;
            const [fromLat, fromLon] = fromPlace.split(',').map(Number);
            const [toLat, toLon] = toPlace.split(',').map(Number);

            // Build Transport Modes Array
            // Default: TRANSIT + WALK
            let modesArray = '{ mode: TRANSIT }, { mode: WALK }';
            if (transportModes && transportModes.length > 0) {
                const modes = transportModes.map(m => `{ mode: ${m} }`);
                // Always add WALK
                modes.push('{ mode: WALK }');
                modesArray = modes.join(', ');
            }

            // Optional Constraints
            const maxTransfersPart = maxTransfers !== undefined ? `maxTransfers: ${maxTransfers}` : '';

            const query = `
                query Plan($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!, $date: String, $time: String, $arriveBy: Boolean) {
                  plan(
                    from: { lat: $fromLat, lon: $fromLon }
                    to: { lat: $toLat, lon: $toLon }
                    date: $date
                    time: $time
                    arriveBy: $arriveBy
                    transportModes: [${modesArray}]
                    walkReluctance: ${TRANSPORT_CONFIG.OTP_DEFAULTS.walkReluctance}
                    walkSpeed: ${TRANSPORT_CONFIG.OTP_DEFAULTS.walkSpeed}
                    maxWalkDistance: ${TRANSPORT_CONFIG.OTP_DEFAULTS.maxWalkDistance}
                    minTransferTime: ${TRANSPORT_CONFIG.OTP_DEFAULTS.minTransferTime}
                    searchWindow: ${TRANSPORT_CONFIG.OTP_DEFAULTS.searchWindow}
                    numItineraries: ${TRANSPORT_CONFIG.OTP_DEFAULTS.numItineraries}
                    ${maxTransfersPart}
                  ) {
                    itineraries {
                      duration
                      startTime: start
                      endTime: end
                      numberOfTransfers
                      legs {
                        mode
                        startTime: start { scheduledTime }
                        endTime: end { scheduledTime }
                        duration
                        distance
                        agency { id name }
                        route { shortName longName color }
                        headsign
                        from { name lat lon }
                        to { name lat lon }
                        stopCalls {
                          stopLocation { ... on Stop { name lat lon } }
                          schedule { time { ... on ArrivalDepartureTime { arrival departure } } }
                        }
                        legGeometry { points }
                      }
                    }
                  }
                }
            `;

            const data = await this.executeGraphQL(query, {
                fromLat, fromLon, toLat, toLon,
                date,
                time,
                arriveBy: !!arriveBy
            });

            if (!data || !data.plan || !data.plan.itineraries) {
                return [];
            }

            const routes = data.plan.itineraries.map((it: any, index: number) =>
                OTPService.mapItineraryToRouteOption(it, index)
            );

            // Smart sorting logic - prioritize based on trip characteristics
            const self = OTPService; // Reference for use in sort function
            const sortedRoutes = routes.sort((a, b) => {
                const transfersA = a.changes;
                const transfersB = b.changes;
                const timeA = a.startTimeTimestamp || 0;
                const timeB = b.startTimeTimestamp || 0;
                const durationA = a.totalDuration;
                const durationB = b.totalDuration;
                
                // Check if route starts with WALK (requires walking to stop)
                const startsWithWalkA = a.legs[0]?.mode === 'WALK';
                const startsWithWalkB = b.legs[0]?.mode === 'WALK';
                const firstWalkDistanceA = startsWithWalkA ? (a.legs[0]?.distance || 0) : 0;
                const firstWalkDistanceB = startsWithWalkB ? (b.legs[0]?.distance || 0) : 0;
                
                // Get first transport leg for both routes
                const firstLegA = a.legs.find(l => l.mode !== 'WALK');
                const firstLegB = b.legs.find(l => l.mode !== 'WALK');
                const firstAgencyA = firstLegA?.brand?.toUpperCase() || '';
                const firstAgencyB = firstLegB?.brand?.toUpperCase() || '';
                
                // 1️⃣ FIRST: For first result ONLY - prefer routes starting from current stop (no walk)
                // "Najbliższy odjazd z tego przystanku" = departure FROM THIS STOP
                const nowTimestamp = Date.now();
                const isAUpcoming = timeA > nowTimestamp && timeA - nowTimestamp < 180 * 60 * 1000; // Within 3 hours
                const isBUpcoming = timeB > nowTimestamp && timeB - nowTimestamp < 180 * 60 * 1000;
                
                if (isAUpcoming && isBUpcoming) {
                    // Check if one starts directly and the other doesn't
                    const aDirectStart = !startsWithWalkA || firstWalkDistanceA < 50; // <50m walk OK
                    const bDirectStart = !startsWithWalkB || firstWalkDistanceB < 50;
                    
                    // ONLY for the very first result - prefer direct start
                    if (aDirectStart && !bDirectStart) {
                        // A starts from stop - check if it's soon enough to be #1
                        const aIsSoon = timeA - nowTimestamp < 90 * 60 * 1000; // Within 90 min
                        if (aIsSoon) return -1; // A is direct AND soon - make it #1
                    }
                    if (!aDirectStart && bDirectStart) {
                        const bIsSoon = timeB - nowTimestamp < 90 * 60 * 1000;
                        if (bIsSoon) return 1; // B is direct AND soon - make it #1
                    }
                }
                
                // 2️⃣ SECOND: For ALL results (including "pozostałe opcje") - sort by departure time ONLY
                const timeDiff = timeA - timeB;
                if (timeDiff !== 0) {
                    return timeDiff; // Earlier departures first
                }
                
                // 3️⃣ THIRD: Same departure time - prefer better agency
                const firstLegPriorityA = self.getFirstLegPriority(a);
                const firstLegPriorityB = self.getFirstLegPriority(b);
                if (firstLegPriorityA !== firstLegPriorityB) {
                    return firstLegPriorityB - firstLegPriorityA;
                }
                
                // 4️⃣ FOURTH: Prefer faster route
                if (durationA !== durationB) {
                    return durationA - durationB;
                }
                
                // 5️⃣ FIFTH: Prefer fewer transfers
                if (transfersA !== transfersB) {
                    return transfersA - transfersB;
                }
                
                // 6️⃣ SIXTH: Prefer routes with SKM
                const hasSKM_A = self.hasSKM(a);
                const hasSKM_B = self.hasSKM(b);
                if (hasSKM_A && !hasSKM_B) return -1;
                if (!hasSKM_A && hasSKM_B) return 1;

                // 5️⃣ FIFTH: Single-agency trips
                const singleAgencyA = self.isSingleAgency(a);
                const singleAgencyB = self.isSingleAgency(b);
                if (singleAgencyA && !singleAgencyB) return -1;
                if (!singleAgencyA && singleAgencyB) return 1;

                // 6️⃣ SIXTH: Agency priority for same-duration routes
                const priorityA = self.getRoutePriority(a);
                const priorityB = self.getRoutePriority(b);
                if (priorityA !== priorityB) {
                    return priorityB - priorityA;
                }
                
                // 7️⃣ SEVENTH: Fine-tune by exact duration
                return a.totalDuration - b.totalDuration;
            });

            return sortedRoutes;
        } catch (error) {
            console.error('[OTPService] Error planning trip:', error);
            throw error;
        }
    },

    /**
     * Get priority of the FIRST transport leg (ignoring WALK)
     * This helps prefer routes that start with better transport
     * MZK (800) > POLREGIO (900) when starting from a bus stop
     */
    getFirstLegPriority(route: RouteOption): number {
        for (const leg of route.legs) {
            if (leg.mode === 'WALK') continue;
            
            const brand = leg.brand?.toUpperCase() || '';
            
            // First leg priorities - prefer LOCAL transport for first leg
            if (brand.includes('MZK')) return 900;  // MZK buses - BEST for first leg (you're at bus stop)
            if (brand.includes('SKM') || brand === 'PKP') return 1000; // SKM - BEST overall
            if (brand.includes('PKS') || brand.includes('PKSGDYNIA')) return 850; // PKS Gdynia - good regional buses
            if (brand.includes('POLREGIO') || brand.includes('REGIO')) return 800; // POLREGIO - might require walk to station
            if (brand.includes('ZTM')) return 700;
            if (brand.includes('ZKM')) return 600;
            
            return 300;
        }
        return 0;
    },

    /**
     * Check if route uses SKM trains specifically
     * SKM routes should be prioritized over POLREGIO-only routes
     */
    hasSKM(route: RouteOption): boolean {
        for (const leg of route.legs) {
            if (leg.mode === 'WALK') continue;
            
            const brand = leg.brand?.toUpperCase() || '';
            if (brand.includes('SKM') || brand === 'PKP') {
                return true;
            }
        }
        return false;
    },

    /**
     * Check if route uses priority trains (SKM or POLREGIO)
     * Routes with trains should be prioritized over bus-only routes
     */
    hasPriorityTrain(route: RouteOption): boolean {
        for (const leg of route.legs) {
            if (leg.mode === 'WALK') continue;
            
            const brand = leg.brand?.toUpperCase() || '';
            if (brand.includes('SKM') || brand.includes('POLREGIO') || brand.includes('REGIO') || brand === 'PKP') {
                return true;
            }
        }
        return false;
    },

    /**
     * Check if route uses only one transport agency (e.g., SKM→SKM)
     * Single-agency trips are better than multi-agency
     */
    isSingleAgency(route: RouteOption): boolean {
        const agencies = new Set<string>();
        
        for (const leg of route.legs) {
            if (leg.mode === 'WALK') continue;
            
            const brand = leg.brand?.toUpperCase() || 'UNKNOWN';
            agencies.add(brand);
        }
        
        return agencies.size === 1;
    },

    /**
     * Calculate route priority based on transport type
     * Priority order: 🚆 SKM (highest) > 🚂 POLREGIO > � PKS Gdynia > 🚌 MZK Wejherowo > others
     */
    getRoutePriority(route: RouteOption): number {
        let maxPriority = 0;

        for (const leg of route.legs) {
            if (leg.mode === 'WALK') continue;

            let priority = 0;
            const brand = leg.brand?.toUpperCase() || '';
            const agencyName = (leg as any).agencyName?.toLowerCase() || '';

            // Priority hierarchy - 🚆 SKM > 🚂 POLREGIO > 🚍 PKS Gdynia > 🚌 MZK Wejherowo
            if (brand.includes('SKM') || agencyName.includes('skm')) priority = 1000;        // 🚆 SKM - HIGHEST
            else if (brand.includes('POLREGIO') || brand.includes('REGIO') || agencyName.includes('polregio') || agencyName.includes('regio')) priority = 900;  // 🚂 POLREGIO
            else if (brand.includes('PKS') || agencyName.includes('pks') || agencyName.includes('pksgdynia')) priority = 850;  // 🚍 PKS Gdynia
            else if (brand.includes('MZK') || agencyName.includes('mzk') || agencyName.includes('wejherowo')) priority = 800;  // 🚌 MZK Wejherowo
            else if (brand.includes('ZTM') || agencyName.includes('ztm')) priority = 700;
            else if (brand.includes('ZKM') || agencyName.includes('zkm')) priority = 600;
            else if (brand.includes('PKP') || agencyName.includes('pkp')) priority = 400;
            else priority = 300;

            maxPriority = Math.max(maxPriority, priority);
        }

        return maxPriority;
    },

    /**
     * Verifies connection and returns loaded agencies
     */
    async getAgencies(): Promise<any[]> {
        const query = `{ agencies { id name url timezone } }`;
        try {
            const data = await this.executeGraphQL(query);
            return data.agencies || [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Maps OTP GraphQL Itinerary to App's RouteOption format
     */
    mapItineraryToRouteOption(it: any, index: number): RouteOption {
        const legs: RouteLeg[] = it.legs.map((leg: any): RouteLeg => {
            let brand: RouteLeg['brand'];
            const agencyId = leg.agency?.id || '';
            const agencyName = leg.agency?.name || '';
            const searchStr = `${agencyId} ${agencyName}`.toLowerCase();

            // Check SKM first (before PKP) because agency name is "PKP Szybka Kolej Miejska"
            if (searchStr.includes('skm') || searchStr.includes('szybka kolej')) brand = 'SKM';
            else if (searchStr.includes('polregio') || searchStr.includes('regio') || searchStr.includes(':pr') || agencyId.toLowerCase() === 'pr') brand = 'POLREGIO';
            else if (searchStr.includes('mzk') || searchStr.includes('wejherowo')) brand = 'MZK';
            else if (searchStr.includes('ztm')) brand = 'ZTM';
            else if (searchStr.includes('zkm')) brand = 'ZKM';
            else if (searchStr.includes('pks')) brand = 'PKS';
            else if (searchStr.includes('pkp')) brand = 'PKP';

            // OTP 2.x startTime/endTime are objects { scheduledTime }
            const startTimeValue = leg.startTime?.scheduledTime || leg.startTime;
            const endTimeValue = leg.endTime?.scheduledTime || leg.endTime;

            const intermediateStopsRaw = leg.stopCalls || [];

            // Collect ALL stop points for map line drawing fallback
            const stopPoints = intermediateStopsRaw.map((sc: any) => ({
                name: sc.stopLocation?.name || '?',
                lat: sc.stopLocation?.lat,
                lon: sc.stopLocation?.lon,
                arrivalTime: sc.schedule?.time?.arrival ? OTPService.formatOTPTime(sc.schedule.time.arrival) : undefined,
                departure_time: sc.schedule?.time?.departure ? OTPService.formatOTPTime(sc.schedule.time.departure) : undefined,
            }));

            // UI's intermediateStops (excluding first and last)
            const intermediateStops = stopPoints.slice(1, -1);

            return {
                mode: leg.mode === 'WALK' ? 'WALK' : 'RIDE',
                brand,
                line: leg.route?.shortName || leg.route?.longName || '',
                direction: leg.headsign || '',
                fromName: leg.from.name || '?',
                toName: leg.to.name || '?',
                startTime: OTPService.formatOTPTime(startTimeValue),
                endTime: OTPService.formatOTPTime(endTimeValue),
                duration: Math.round(leg.duration / 60),
                stops: intermediateStopsRaw.length > 0 ? intermediateStopsRaw.length - 1 : 1,
                distance: leg.distance,
                intermediateStops,
                steps: [], // Simplified steps for now
                legGeometry: leg.legGeometry ? {
                    points: leg.legGeometry.points,
                    length: 0, // Length not always useful in this context
                } : undefined,
                routeColor: leg.route?.color,
                from: { lat: leg.from.lat, lon: leg.from.lon },
                to: { lat: leg.to.lat, lon: leg.to.lon },
            };
        });

        return {
            id: `otp-${Date.now()}-${index}`,
            legs,
            totalDuration: Math.round(it.duration / 60),
            startTime: OTPService.formatOTPTime(it.startTime),
            startTimeTimestamp: OTPService.getTimestamp(it.startTime),
            endTime: OTPService.formatOTPTime(it.endTime),
            changes: it.numberOfTransfers,
            tags: OTPService.generateTags(it),
        };
    },

    /**
     * Helper to format OTP timestamp to HH:mm
     */
    formatOTPTime(timestamp: any): string {
        if (!timestamp) return '--:--';
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '--:--';
            return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }).slice(0, 5);
        } catch (e) {
            return '--:--';
        }
    },

    /**
     * Converts ISO String to milliseconds for countdowns
     */
    getTimestamp(isoString: any): number {
        if (!isoString) return 0;
        return new Date(isoString).getTime();
    },

    /**
     * Generates UI tags like 'FASTEST'
     */
    generateTags(it: any): string[] {
        const tags: string[] = [];
        if (it.numberOfTransfers === 0) tags.push('BEZPOŚREDNI');
        return tags;
    }
};
