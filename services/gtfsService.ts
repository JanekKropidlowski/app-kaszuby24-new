import AsyncStorage from '@react-native-async-storage/async-storage';

// GTFS Data Types
export interface GTFSRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color?: string;
  route_text_color?: string;
  route_sort_order?: number;
  agency_id?: string;
}

export interface GTFSTrip {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_short_name?: string;
  trip_headsign?: string;
  direction_id?: number;
}

export interface GTFSStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_code?: string;
  platform_code?: string;
}

export interface GTFSStopTime {
  trip_id: string;
  stop_id: string;
  stop_sequence: number;
  arrival_time: string;
  departure_time: string;
  platform?: string;
  stop_headsign?: string;
}

export interface GTFSTransfer {
  from_stop_id: string;
  to_stop_id: string;
  from_trip_id: string;
  to_trip_id: string;
  transfer_type: number;
}

export interface GTFSCalendar {
  service_id: string;
  start_date: string;
  end_date: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface GTFSRouteResult {
  route_id: string;
  category: string;
  short_name: string;
  long_name: string;
  color: string;
  text_color: string;
  is_bus: boolean;
}

export interface GTFSDeparture {
  trip_id: string;
  route_short_name: string;
  route_long_name: string;
  headsign: string;
  departure_time: string;
  platform?: string;
  color: string;
  text_color: string;
  is_bus: boolean;
  category: string;
}

export interface GTFSJoinedTrip {
  base_trip_id: string;
  segments: GTFSTrip[];
  route: GTFSRoute;
  stops: GTFSStopTime[];
  start_stop: GTFSStop;
  end_stop: GTFSStop;
}

const GTFS_CACHE_PREFIX = 'gtfs_pkp_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export class GTFSService {
  private static routes: GTFSRoute[] = [];
  private static trips: GTFSTrip[] = [];
  private static stops: GTFSStop[] = [];
  private static stopTimes: GTFSStopTime[] = [];
  private static transfers: GTFSTransfer[] = [];
  private static calendar: GTFSCalendar[] = [];
  private static loaded = false;

  // Parse time strings that can exceed 24:00
  static parseTime(timeStr: string): { hours: number, minutes: number, seconds: number, totalMinutes: number } {
    const [hoursStr, minutesStr, secondsStr = '0'] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    const seconds = parseInt(secondsStr, 10);

    // Handle times like 25:10:00 (next day)
    const normalizedHours = hours % 24;
    const days = Math.floor(hours / 24);
    const totalMinutes = (days * 24 * 60) + (normalizedHours * 60) + minutes;

    return { hours: normalizedHours, minutes, seconds, totalMinutes };
  }

  // Format time back to string
  static formatTime(hours: number, minutes: number, seconds: number = 0): string {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Convert total minutes to time string
  static minutesToTime(totalMinutes: number): string {
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    return `${(days * 24 + hours).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }

  // Load GTFS data from bundled assets
  static async loadGTFSData(): Promise<void> {
    if (this.loaded) return;

    try {
      console.log('[GTFS] Loading PKP Intercity data...');

      // Load routes
      const routesResponse = await fetch('https://mkuran.pl/gtfs/pkpic.zip');
      // For now, we'll load from the extracted files we have
      // In production, this would be bundled with the app

      this.loaded = true;
      console.log('[GTFS] PKP Intercity data loaded');
    } catch (error) {
      console.error('[GTFS] Failed to load data:', error);
    }
  }

  // Get all routes with categories
  static getRoutes(): GTFSRouteResult[] {
    const routeCategories: GTFSRouteResult[] = [
      { route_id: 'EIP', category: 'EIP', short_name: 'EIP', long_name: 'Express InterCity Premium', color: '#002664', text_color: '#FFFFFF', is_bus: false },
      { route_id: 'EIP_BUS', category: 'EIP', short_name: 'ZKA EIP', long_name: 'Express InterCity Premium - ZKA', color: '#DE4E4E', text_color: '#FFFFFF', is_bus: true },
      { route_id: 'EIC', category: 'EIC', short_name: 'EIC', long_name: 'Express InterCity', color: '#898989', text_color: '#FFFFFF', is_bus: false },
      { route_id: 'IC', category: 'IC', short_name: 'IC', long_name: 'InterCity', color: '#F25E18', text_color: '#FFFFFF', is_bus: false },
      { route_id: 'IC_BUS', category: 'IC', short_name: 'ZKA IC', long_name: 'InterCity - ZKA', color: '#DE4E4E', text_color: '#FFFFFF', is_bus: true },
      { route_id: 'TLK', category: 'TLK', short_name: 'TLK', long_name: 'Twoje Linie Kolejowe', color: '#8505A3', text_color: '#FFFFFF', is_bus: false },
      { route_id: 'TLK_BUS', category: 'TLK', short_name: 'ZKA TLK', long_name: 'Twoje Linie Kolejowe - ZKA', color: '#DE4E4E', text_color: '#FFFFFF', is_bus: true },
      { route_id: 'EC', category: 'EC', short_name: 'EC', long_name: 'EuroCity', color: '#9D740F', text_color: '#FFFFFF', is_bus: false },
    ];

    return routeCategories;
  }

  // Get departures from a specific stop for a given date
  static getDepartures(stopId: string, date: Date, categories: string[] = []): GTFSDeparture[] {
    // Mock data for now - in production this would query the actual GTFS data
    const mockDepartures: GTFSDeparture[] = [
      {
        trip_id: '2026-01-01_0800_EIP_1',
        route_short_name: 'EIP',
        route_long_name: 'Express InterCity Premium',
        headsign: 'Warszawa Centralna',
        departure_time: '08:00:00',
        platform: '1',
        color: '#002664',
        text_color: '#FFFFFF',
        is_bus: false,
        category: 'EIP'
      },
      {
        trip_id: '2026-01-01_0830_IC_1',
        route_short_name: 'IC',
        route_long_name: 'InterCity',
        headsign: 'Kraków Główny',
        departure_time: '08:30:00',
        platform: '2',
        color: '#F25E18',
        text_color: '#FFFFFF',
        is_bus: false,
        category: 'IC'
      },
      {
        trip_id: '2026-01-01_0900_TLK_1',
        route_short_name: 'TLK',
        route_long_name: 'Twoje Linie Kolejowe',
        headsign: 'Gdańsk Główny',
        departure_time: '09:00:00',
        platform: '3',
        color: '#8505A3',
        text_color: '#FFFFFF',
        is_bus: false,
        category: 'TLK'
      }
    ];

    return mockDepartures.filter(dep =>
      categories.length === 0 || categories.includes(dep.category)
    );
  }

  // Get full trip details with all stops
  static getTripDetails(tripId: string): GTFSJoinedTrip | null {
    // Mock data - in production this would query actual GTFS data
    const mockTrip: GTFSJoinedTrip = {
      base_trip_id: tripId,
      segments: [{
        trip_id: tripId,
        route_id: 'EIP',
        service_id: '2026-01-01',
        trip_short_name: 'EIP 123',
        trip_headsign: 'Warszawa Centralna'
      }],
      route: {
        route_id: 'EIP',
        route_short_name: 'EIP',
        route_long_name: 'Express InterCity Premium',
        route_type: 2,
        route_color: '#002664',
        route_text_color: '#FFFFFF'
      },
      stops: [
        { trip_id: tripId, stop_id: 'GDANSK', stop_sequence: 1, arrival_time: '08:00:00', departure_time: '08:00:00', platform: '1' },
        { trip_id: tripId, stop_id: 'GDYNIA', stop_sequence: 2, arrival_time: '08:15:00', departure_time: '08:17:00', platform: '2' },
        { trip_id: tripId, stop_id: 'WARSAW', stop_sequence: 3, arrival_time: '10:30:00', departure_time: '10:30:00', platform: '3' }
      ],
      start_stop: { stop_id: 'GDANSK', stop_name: 'Gdańsk Główny', stop_lat: 54.357, stop_lon: 18.644 },
      end_stop: { stop_id: 'WARSAW', stop_name: 'Warszawa Centralna', stop_lat: 52.225, stop_lon: 21.003 }
    };

    return mockTrip;
  }

  // Join trip segments based on transfers
  static joinTripSegments(baseTripId: string): GTFSJoinedTrip | null {
    // Extract base ID (remove segment suffix like _0, _1, _2)
    const baseId = baseTripId.replace(/_\d+$/, '');

    // Find all segments of this trip
    const segments: GTFSTrip[] = [];
    // Mock implementation - in production this would query transfers.txt

    return this.getTripDetails(baseTripId);
  }

  // Plan route from A to B
  static planRoute(fromStopId: string, toStopId: string, date: Date, maxTransfers: number = 1): any[] {
    // Mock route planning - in production this would implement the algorithm described
    const mockRoute = {
      type: 'direct',
      from: { name: 'Gdańsk Główny', lat: 54.357, lon: 18.644 },
      to: { name: 'Warszawa Centralna', lat: 52.225, lon: 21.003 },
      duration: 150, // minutes
      transfers: 0,
      segments: [{
        from: { stop_id: fromStopId, name: 'Gdańsk Główny' },
        to: { stop_id: toStopId, name: 'Warszawa Centralna' },
        mode: 'train',
        line: 'EIP',
        duration: 150,
        departure_time: '08:00:00',
        arrival_time: '10:30:00'
      }]
    };

    return [mockRoute];
  }

  // Search stops by name
  static searchStops(query: string): GTFSStop[] {
    // Mock stops - in production this would search stops.txt
    const mockStops: GTFSStop[] = [
      { stop_id: 'GDANSK', stop_name: 'Gdańsk Główny', stop_lat: 54.357, stop_lon: 18.644 },
      { stop_id: 'GDYNIA', stop_name: 'Gdynia Główna', stop_lat: 54.519, stop_lon: 18.531 },
      { stop_id: 'WARSAW', stop_name: 'Warszawa Centralna', stop_lat: 52.225, stop_lon: 21.003 },
      { stop_id: 'KRAKOW', stop_name: 'Kraków Główny', stop_lat: 50.061, stop_lon: 19.937 }
    ];

    const q = query.toLowerCase().trim();
    return mockStops.filter(stop =>
      stop.stop_name.toLowerCase().includes(q)
    );
  }

  // Get agency info
  static getAgencyInfo() {
    return {
      name: 'PKP Intercity',
      url: 'https://intercity.pl/',
      phone: '+48703200200',
      timezone: 'Europe/Warsaw'
    };
  }

  // Check if service runs on given date
  static isServiceActive(serviceId: string, date: Date): boolean {
    // Mock implementation - in production this would check calendar.txt
    return true;
  }
}
