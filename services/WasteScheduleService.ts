import axios from 'axios';

const PRODUCTION_URL = 'https://kaszuby24.pl/wp-json/kaszuby24/v2';
const LOCAL_DEV_URL = 'http://192.168.1.XX/wp-json/kaszuby24/v2'; // Zmień na IP swojego komputera

/**
 * WasteScheduleService - Usługa pobierania terminów odbioru odpadów.
 * 
 * NOTATKA DEWELOPERSKA:
 * Jeśli widzisz błąd 404, aplikacja prawdopodobnie łączy się z serwerem PRODUKCYJNYM,
 * na którym nie ma jeszcze plików JSON.
 * 
 * Aby testować lokalnie:
 * 1. Zmień API_BASE_URL na LOCAL_DEV_URL poniżej.
 * 2. Wpisz swoje lokalne IP w LOCAL_DEV_URL.
 */
const API_BASE_URL = PRODUCTION_URL;

export interface WasteRegion {
    id: string;
    name: string;
    streets: string[];
    schedule: {
        date: string;
        types: string[];
    }[];
}

export interface WasteScheduleData {
    city: string;
    updated_at: string;
    regions: WasteRegion[];
}

export interface City {
    id: string;
    name: string;
    active: boolean;
}

export const wasteScheduleService = {
    async getCities(): Promise<City[]> {
        try {
            const response = await axios.get(`${API_BASE_URL}/waste-cities`);
            // Map the API response (active is assumed true for all from manager)
            return response.data.map((city: any) => ({
                id: city.slug,
                name: city.name,
                active: true
            }));
        } catch (error) {
            console.error('[WasteSchedule] Error fetching cities:', error);
            // Fallback for safety
            return [
                { id: 'reda', name: 'Reda', active: true },
            ];
        }
    },

    async getSchedule(cityId: string = 'reda'): Promise<WasteScheduleData | null> {
        try {
            const timestamp = Date.now();
            console.log(`[WasteSchedule] Fetching for city: ${cityId} from: ${API_BASE_URL}/waste-schedule?_=${timestamp}`);
            const response = await axios.get(`${API_BASE_URL}/waste-schedule`, {
                params: {
                    city: cityId,
                    _: timestamp
                },
                timeout: 10000
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                console.error('[WasteSchedule] API Route not found (404).');
            } else {
                console.error('[WasteSchedule] Error:', error.message);
            }
            return null;
        }
    },

    async getStreets(data: WasteScheduleData): Promise<{ street: string; regionId: string }[]> {
        const streets: { street: string; regionId: string }[] = [];
        data.regions.forEach(region => {
            region.streets.forEach(street => {
                streets.push({ street, regionId: region.id });
            });
        });
        return streets.sort((a, b) => a.street.localeCompare(b.street));
    }
};
