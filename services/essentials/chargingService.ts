
import axios from 'axios';

export interface ChargingStation {
    id: number;
    code: string;
    name: string;
    lat: number;
    lng: number;
    address: string;
    city: string;
    district?: string;
    voivodeship?: string;
    accessibility?: string;
    operator?: string;
    capacity?: number; // Liczba stanowisk
    sockets?: ChargingSocket[]; // Typy gniazd
    power?: string; // Moc np. 50kW
    opening_hours?: string;
    operatingHours?: OperatingHour[]; // Szczegółowe godziny otwarcia
    closingHours?: ClosingHour[]; // Wyłączenia
    images?: StationImage[]; // Zdjęcia
    elevation?: number; // Wysokość nad poziomem morza
    lastUpdated?: string;
    status?: 'active' | 'inactive' | 'maintenance';
    paymentMethods?: string[]; // Metody płatności
    authenticationMethods?: string[]; // Metody autentykacji
}

export interface ChargingSocket {
    type: string; // 'type2', 'ccs', 'chademo', etc.
    power: string; // '22kW', '50kW', '150kW', etc.
    count: number; // Liczba gniazd tego typu
    status: 'available' | 'occupied' | 'out_of_order';
}

export interface OperatingHour {
    id: number;
    weekday: number; // 1-7 (poniedziałek-niedziela)
    from_time: string; // '00:15'
    to_time: string; // '12:45'
}

export interface ClosingHour {
    id: number;
    from_time: string; // ISO datetime
    to_time: string; // ISO datetime
}

export interface StationImage {
    id: number;
    uri: string;
    type: string; // 'jpeg', 'png', etc.
    thumbnail_uri: string;
    ts: string; // ISO datetime
}

const EIPA_API_BASE = 'https://eipa.udt.gov.pl'; // Przykład - należy uzyskać prawdziwy URL od operatora
const EIPA_USERNAME = 'your_username'; // Należy skonfigurować
const EIPA_PASSWORD = 'your_password'; // Należy skonfigurować

// Cache dla tokenu autentyfikacji
let authToken: string | null = null;
let tokenExpiry: Date | null = null;

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Pobiera token autentyfikacji EIPA
 */
const getAuthToken = async (): Promise<string | null> => {
    // Sprawdź czy token jest jeszcze ważny
    if (authToken && tokenExpiry && tokenExpiry > new Date()) {
        return authToken;
    }

    try {
        const response = await axios.post(`${EIPA_API_BASE}/token`, {
            username: EIPA_USERNAME,
            password: EIPA_PASSWORD
        }, {
            timeout: 10000
        });

        if (response.data && response.data.token) {
            authToken = response.data.token;
            tokenExpiry = new Date(Date.now() + 55 * 60 * 1000); // 55 minut (token ważny 60 min)
            return authToken;
        }
    } catch (error) {
        console.warn('EIPA authentication error:', error);
    }

    return null;
};

/**
 * Pobiera listę baz (stacji ładowania) z EIPA
 */
const fetchPoolsList = async (): Promise<any[]> => {
    const token = await getAuthToken();
    if (!token) return [];

    try {
        const response = await axios.get(`${EIPA_API_BASE}/pools`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        });

        return response.data || [];
    } catch (error) {
        console.warn('Error fetching pools list:', error);
        return [];
    }
};

/**
 * Pobiera szczegółowe dane konkretnej bazy
 */
const fetchPoolDetails = async (poolId: number): Promise<any | null> => {
    const token = await getAuthToken();
    if (!token) return null;

    try {
        const response = await axios.get(`${EIPA_API_BASE}/pools/${poolId}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        });

        return response.data;
    } catch (error) {
        console.warn(`Error fetching pool ${poolId} details:`, error);
        return null;
    }
};

/**
 * Mapuje dane EIPA na nasz interfejs ChargingStation
 */
const mapEipaToChargingStation = (poolData: any): ChargingStation => {
    // Przetwórz godziny otwarcia
    const operatingHours: OperatingHour[] = (poolData.operating_hours || []).map((oh: any) => ({
        id: oh.id,
        weekday: oh.weekday,
        from_time: oh.from_time,
        to_time: oh.to_time
    }));

    // Przetwórz zdjęcia
    const images: StationImage[] = (poolData.images || []).map((img: any) => ({
        id: img.id,
        uri: img.uri,
        type: img.type,
        thumbnail_uri: img.thumbnail_uri,
        ts: img.ts
    }));

    return {
        id: poolData.id,
        code: poolData.code,
        name: poolData.name,
        lat: poolData.latitude,
        lng: poolData.longitude,
        address: `${poolData.street || ''} ${poolData.house_number || ''}`.trim(),
        city: poolData.city || '',
        district: poolData.teryt || '',
        accessibility: poolData.accessibility || '',
        operator: poolData.name || 'EIPA',
        capacity: poolData.stations?.length || 0,
        sockets: [], // TODO: Pobrać szczegóły stacji
        opening_hours: operatingHours.length > 0 ? 'Zobacz szczegóły' : '24/7',
        operatingHours,
        images,
        elevation: poolData.elevation,
        lastUpdated: poolData.ts,
        status: 'active' // TODO: Sprawdzić status na podstawie closing_hours
    };
};

/**
 * Pobiera ładowarki elektryczne w województwie pomorskim z API EIPA
 */
export const fetchChargingStationsPomorskie = async (): Promise<ChargingStation[]> => {
    try {
        console.log('Pobieranie stacji ładowania z EIPA API...');

        // Pobierz listę wszystkich baz
        const pools = await fetchPoolsList();

        // Filtruj bazy w województwie pomorskim (na podstawie współrzędnych)
        const pomeranianPools = pools.filter((pool: any) => {
            if (!pool.latitude || !pool.longitude) return false;

            // Bounding box dla województwa pomorskiego
            const lat = pool.latitude;
            const lng = pool.longitude;

            return lat >= 53.5 && lat <= 55.0 && lng >= 16.5 && lng <= 20.0;
        });

        console.log(`Znaleziono ${pomeranianPools.length} baz w województwie pomorskim`);

        // Pobierz szczegółowe dane dla każdej bazy
        const detailedStations: ChargingStation[] = [];

        for (const pool of pomeranianPools.slice(0, 20)) { // Limit do 20 baz dla wydajności
            try {
                const details = await fetchPoolDetails(pool.id);
                if (details) {
                    const station = mapEipaToChargingStation(details);
                    detailedStations.push(station);
                }
            } catch (error) {
                console.warn(`Error fetching details for pool ${pool.id}:`, error);
            }
        }

        console.log(`Pobrano ${detailedStations.length} stacji ładowania z pełnymi danymi`);
        return detailedStations;

    } catch (error: any) {
        console.warn('Błąd pobierania stacji ładowania z EIPA:', error?.message || error);
        console.log('⚠️ EIPA API może wymagać konfiguracji danych logowania');

        // Fallback do Overpass API jeśli EIPA nie działa
        console.log('Próbuję fallback do Overpass API...');
        return await fetchChargingStationsFallback();
    }
};

/**
 * Fallback - pobiera dane z Overpass API gdy EIPA nie działa
 */
const fetchChargingStationsFallback = async (): Promise<ChargingStation[]> => {
    const bbox = {
        south: 53.8,
        west: 17.0,
        north: 54.9,
        east: 19.2
    };

    try {
        const query = `
          [out:json][timeout:30];
          (
            node["amenity"="charging_station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
            way["amenity"="charging_station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          );
          out center;
        `;

        const response = await axios.post(OVERPASS_API_URL, `data=${encodeURIComponent(query)}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000
        });

        if (response.data && response.data.elements) {
            return response.data.elements.map((el: any) => ({
                id: el.id,
                code: `OSM-${el.id}`,
                name: el.tags?.name || el.tags?.operator || 'Stacja ładowania',
                lat: el.lat || el.center?.lat,
                lng: el.lon || el.center?.lon,
                address: el.tags?.['addr:street'] ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}` : '',
                city: el.tags?.['addr:city'] || '',
                operator: el.tags?.operator,
                capacity: parseInt(el.tags?.capacity) || 1,
                sockets: [{
                    type: el.tags?.socket || 'type2',
                    power: el.tags?.['capacity:power'] || '22kW',
                    count: parseInt(el.tags?.capacity) || 1,
                    status: 'available'
                }],
                opening_hours: el.tags?.opening_hours,
                status: 'active' as const
            }));
        }
        return [];
    } catch (error) {
        console.warn('Fallback Overpass API also failed:', error);
        return [];
    }
};

/**
 * Pobiera stacje ładowania w określonym obszarze (Bounding Box)
 */
export const fetchChargingStationsInBBox = async (south: number, west: number, north: number, east: number): Promise<ChargingStation[]> => {
    try {
        const query = `
            [out:json][timeout:30];
            (
                node["amenity"="charging_station"](${south},${west},${north},${east});
                way["amenity"="charging_station"](${south},${west},${north},${east});
            );
            out center;
        `;
        const response = await axios.post(OVERPASS_API_URL, `data=${encodeURIComponent(query)}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000
        });
        if (response.data && response.data.elements) {
            return response.data.elements.map((el: any) => ({
                id: el.id,
                code: el.tags?.['ref:eipa'] || `OSM-${el.id}`,
                name: el.tags?.name || el.tags?.operator || 'Stacja ładowania',
                lat: el.lat || el.center?.lat,
                lng: el.lon || el.center?.lon,
                address: `${el.tags?.['addr:street'] || ''} ${el.tags?.['addr:housenumber'] || ''}`.trim() || 'Brak dokładnego adresu',
                city: el.tags?.['addr:city'] || '',
                operator: el.tags?.operator,
                accessibility: el.tags?.access,
                capacity: el.tags?.capacity,
                socket: el.tags?.socket || el.tags?.['socket:type2'] ? 'Type 2' : '',
                power: el.tags?.['max_power'] || el.tags?.['socket:type2:output'],
                opening_hours: el.tags?.opening_hours
            }));
        }
        return [];
    } catch (error: any) {
        // Bezpieczna obsługa różnych typów błędów
        const errorMessage = error?.response?.status === 504 ? 'Serwer stacji ładowania tymczasowo niedostępny' :
                           error?.response?.status === 429 ? 'Zbyt wiele zapytań do serwera stacji ładowania' :
                           error?.code === 'ECONNABORTED' ? 'Przekroczony czas oczekiwania dla stacji ładowania' :
                           error?.message || 'Nieznany błąd stacji ładowania';

        console.warn('Błąd pobierania stacji ładowania (BBox):', errorMessage);
        return []; // Zawsze zwracaj pustą tablicę, nigdy nie crashuj aplikacji
    }
};

/**
 * Pobiera stacje ładowania w pobliżu danej lokalizacji
 */
export const fetchChargingStationsNearby = async (lat: number, lng: number, radius: number = 20000): Promise<ChargingStation[]> => {
    try {
        const query = `
            [out:json][timeout:30];
            (
                node["amenity"="charging_station"](around:${radius},${lat},${lng});
                way["amenity"="charging_station"](around:${radius},${lat},${lng});
            );
            out center;
        `;

        const response = await axios.post(OVERPASS_API_URL, `data=${encodeURIComponent(query)}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000, // Zwiększony timeout dla stacji ładowania
            validateStatus: (status) => status < 500 // Akceptuj 4xx błędy
        });

        if (response.data && response.data.elements) {
            return response.data.elements.map((el: any) => ({
                id: el.id,
                code: el.tags?.['ref:eipa'] || `OSM-${el.id}`,
                name: el.tags?.name || el.tags?.operator || 'Stacja ładowania',
                lat: el.lat || el.center?.lat,
                lng: el.lon || el.center?.lon,
                address: `${el.tags?.['addr:street'] || ''} ${el.tags?.['addr:housenumber'] || ''}`.trim() || 'Brak dokładnego adresu',
                city: el.tags?.['addr:city'] || '',
                operator: el.tags?.operator,
                accessibility: el.tags?.access,
                capacity: el.tags?.capacity,
                socket: el.tags?.socket || el.tags?.['socket:type2'] ? 'Type 2' : '',
                power: el.tags?.['max_power'] || el.tags?.['socket:type2:output'],
                opening_hours: el.tags?.opening_hours
            }));
        }
        return [];
    } catch (error) {
        console.warn(`Błąd pobierania stacji ładowania (around ${lat},${lng}):`, error);
        return [];
    }
};
