import axios from 'axios';

const GBFS_BASE_URL = 'https://gbfs.urbansharing.com/rowermevo.pl';

// Cache configuration
const CACHE_TTL = 30000; // 30 seconds
let cache: {
    bikes: { data: MevoBike[], timestamp: number } | null;
    stations: { data: MevoStation[], timestamp: number } | null;
} = {
    bikes: null,
    stations: null
};

export interface MevoBike {
    bike_id: string;
    lat: number;
    lon: number;
    is_reserved: boolean;
    is_disabled: boolean;
    battery_level?: number; // 0-100 if available
}

export interface MevoStation {
    station_id: string;
    name: string;
    lat: number;
    lon: number;
    address?: string;
    capacity: number;
    num_bikes_available: number;
    num_docks_available: number;
}

interface FreeBikeStatus {
    last_updated: number;
    ttl: number;
    version: string;
    data: {
        bikes: Array<{
            bike_id: string;
            lat: number;
            lon: number;
            is_reserved: number;
            is_disabled: number;
        }>;
    };
}

interface StationInformation {
    last_updated: number;
    ttl: number;
    version: string;
    data: {
        stations: Array<{
            station_id: string;
            name: string;
            address: string;
            lat: number;
            lon: number;
            capacity: number;
        }>;
    };
}

interface StationStatus {
    last_updated: number;
    ttl: number;
    version: string;
    data: {
        stations: Array<{
            station_id: string;
            num_bikes_available: number;
            num_docks_available: number;
            is_installed: number;
            is_renting: number;
            is_returning: number;
            last_reported: number;
        }>;
    };
}

/**
 * Fetch free bikes (not docked at stations)
 */
export const fetchFreeBikes = async (): Promise<MevoBike[]> => {
    try {
        // Check cache
        if (cache.bikes && Date.now() - cache.bikes.timestamp < CACHE_TTL) {
            return cache.bikes.data;
        }

        const response = await axios.get<FreeBikeStatus>(
            `${GBFS_BASE_URL}/free_bike_status.json`,
            { timeout: 8000 }
        );

        const bikes: MevoBike[] = response.data.data.bikes
            .filter(bike => !bike.is_disabled && !bike.is_reserved)
            .map(bike => ({
                bike_id: bike.bike_id,
                lat: bike.lat,
                lon: bike.lon,
                is_reserved: Boolean(bike.is_reserved),
                is_disabled: Boolean(bike.is_disabled),
                battery_level: undefined // Not provided by free bike status
            }));

        // Update cache
        cache.bikes = {
            data: bikes,
            timestamp: Date.now()
        };

        return bikes;
    } catch (error) {
        console.error('[MEVO] Error fetching free bikes:', error);
        // Return cached data if available, otherwise empty array
        return cache.bikes?.data || [];
    }
};

/**
 * Fetch all stations with their current status
 */
export const fetchStations = async (): Promise<MevoStation[]> => {
    try {
        // Check cache
        if (cache.stations && Date.now() - cache.stations.timestamp < CACHE_TTL) {
            return cache.stations.data;
        }

        // Fetch both station info and status in parallel
        const [infoResponse, statusResponse] = await Promise.all([
            axios.get<StationInformation>(`${GBFS_BASE_URL}/station_information.json`, { timeout: 8000 }),
            axios.get<StationStatus>(`${GBFS_BASE_URL}/station_status.json`, { timeout: 8000 })
        ]);

        const stationInfo = infoResponse.data.data.stations;
        const stationStatus = statusResponse.data.data.stations;

        // Merge info and status
        const statusMap = new Map(
            stationStatus.map(s => [s.station_id, s])
        );

        const stations: MevoStation[] = stationInfo
            .map(info => {
                const status = statusMap.get(info.station_id);
                return {
                    station_id: info.station_id,
                    name: info.name,
                    lat: info.lat,
                    lon: info.lon,
                    address: info.address,
                    capacity: info.capacity,
                    num_bikes_available: status?.num_bikes_available || 0,
                    num_docks_available: status?.num_docks_available || 0
                };
            })
            .filter(s => s.num_bikes_available > 0 || s.num_docks_available > 0); // Only show active stations

        // Update cache
        cache.stations = {
            data: stations,
            timestamp: Date.now()
        };

        return stations;
    } catch (error) {
        console.error('[MEVO] Error fetching stations:', error);
        return cache.stations?.data || [];
    }
};

/**
 * Fetch all MEVO data (bikes + stations)
 */
export const fetchAllMevoData = async (): Promise<{ bikes: MevoBike[], stations: MevoStation[] }> => {
    try {
        const [bikes, stations] = await Promise.all([
            fetchFreeBikes(),
            fetchStations()
        ]);

        return { bikes, stations };
    } catch (error) {
        console.error('[MEVO] Error fetching all MEVO data:', error);
        return {
            bikes: cache.bikes?.data || [],
            stations: cache.stations?.data || []
        };
    }
};

/**
 * Clear cache (useful for manual refresh)
 */
export const clearMevoCache = () => {
    cache.bikes = null;
    cache.stations = null;
};
