
import axios from 'axios';

export interface AedUnit {
    id: number;
    lat: number;
    lng: number;
    location?: string;
    opening_hours?: string;
    operator?: string;
    phone?: string;
    access?: string;
    indoor?: string;
    distance?: number;
    description?: string;
    address?: {
        city?: string;
        street?: string;
        housenumber?: string;
    };
    // Rozszerzone właściwości z OSM
    defibrillator_location?: string; // Dokładna lokalizacja AED
    level?: string; // Poziom budynku
    fee?: string; // Czy płatny dostęp
    wheelchair?: string; // Dostępność dla wózków
    check_date?: string; // Data ostatniego sprawdzenia
    manufacturer?: string; // Producent
    model?: string; // Model
    contact?: {
        website?: string;
        email?: string;
    };
    image?: string; // URL zdjęcia
    emergency?: string; // Typ nagłego przypadku
}

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Pobiera AED w województwie pomorskim (zoptymalizowane za pomocą BBox)
 */
export const fetchAedPomorskie = async (): Promise<AedUnit[]> => {
    // Bounding Box dla województwa pomorskiego (w przybliżeniu)
    const bbox = {
        south: 53.8,
        west: 17.0,
        north: 54.9,
        east: 19.2
    };

    try {
        console.log('Pobieranie AED dla regionu Pomorskie (BBox)...');
        return await fetchAedInBBox(bbox.south, bbox.west, bbox.north, bbox.east);
    } catch (error) {
        console.warn('Błąd pobierania AED dla regionu:', error);
        return [];
    }
};

/**
 * Pobiera AED w pobliżu danej lokalizacji
 */
export const fetchAedNearby = async (lat: number, lng: number, radius: number = 20000): Promise<AedUnit[]> => {
    try {
        const query = `
            [out:json][timeout:30];
            (
                node["emergency"="defibrillator"](around:${radius},${lat},${lng});
                way["emergency"="defibrillator"](around:${radius},${lat},${lng});
                relation["emergency"="defibrillator"](around:${radius},${lat},${lng});
            );
            out center;
        `;

        const response = await axios.post(OVERPASS_API_URL, `data=${encodeURIComponent(query)}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 8000 // Skrócony timeout
        });

        if (response.data && response.data.elements) {
            return mapOsmToAed(response.data.elements);
        }
        return [];
    } catch (error: any) {
        // Bezpieczna obsługa różnych typów błędów
        const errorMessage = error?.response?.status === 504 ? 'Serwer tymczasowo niedostępny (504)' :
            error?.response?.status === 429 ? 'Zbyt wiele zapytań (429)' :
                error?.code === 'ECONNABORTED' ? 'Przekroczony czas oczekiwania' :
                    error?.message || 'Nieznany błąd';

        console.warn(`Błąd pobierania AED (around ${lat},${lng}):`, errorMessage);
        return []; // Zawsze zwracaj pustą tablicę, nigdy nie crashuj aplikacji
    }
};

/**
 * Pobiera AED w określonym obszarze (Bounding Box)
 */
export const fetchAedInBBox = async (south: number, west: number, north: number, east: number): Promise<AedUnit[]> => {
    try {
        const query = `
      [out:json][timeout:30];
      (
        node["emergency"="defibrillator"](${south},${west},${north},${east});
        way["emergency"="defibrillator"](${south},${west},${north},${east});
        relation["emergency"="defibrillator"](${south},${west},${north},${east});
      );
      out center;
    `;
        const response = await axios.post(OVERPASS_API_URL, `data=${encodeURIComponent(query)}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000, // Zwiększony timeout dla AED
            validateStatus: (status) => status < 500 // Akceptuj 4xx błędy
        });
        if (response.data && response.data.elements) {
            return mapOsmToAed(response.data.elements);
        }
        return [];
    } catch (error: any) {
        // Bezpieczna obsługa różnych typów błędów
        const errorMessage = error?.response?.status === 504 ? 'Serwer AED tymczasowo niedostępny' :
            error?.response?.status === 429 ? 'Zbyt wiele zapytań do serwera AED' :
                error?.code === 'ECONNABORTED' ? 'Przekroczony czas oczekiwania dla AED' :
                    error?.message || 'Nieznany błąd AED';

        console.warn('Błąd pobierania AED (BBox):', errorMessage);
        return []; // Zawsze zwracaj pustą tablicę, nigdy nie crashuj aplikacji
    }
};

const mapOsmToAed = (elements: any[]): AedUnit[] => {
    return elements.map((el: any) => {
        const tags = el.tags || {};

        // Buduj pełny adres
        const address = {
            city: tags['addr:city'] || tags['addr:place'] || tags['addr:village'],
            street: tags['addr:street'] || tags['addr:road'],
            housenumber: tags['addr:housenumber'] || tags['addr:house_number']
        };

        // Pełna lokalizacja
        const locationParts = [];
        if (address.street && address.housenumber) {
            locationParts.push(`${address.street} ${address.housenumber}`);
        } else if (address.street) {
            locationParts.push(address.street);
        }
        if (address.city) {
            locationParts.push(address.city);
        }
        const fullLocation = locationParts.join(', ') ||
            tags['defibrillator:location'] ||
            tags.location ||
            tags.name ||
            tags.description ||
            'Nieznana lokalizacja';

        return {
            id: el.id,
            lat: el.lat || el.center?.lat,
            lng: el.lon || el.center?.lon,
            location: fullLocation,
            opening_hours: tags.opening_hours || tags['opening_hours:covid19'],
            operator: tags.operator || tags['operator:type'],
            phone: tags.phone || tags['contact:phone'] || tags['phone:emergency'],
            access: tags.access,
            indoor: tags.indoor || tags.location,
            description: tags.description || tags.note || tags.fixme,
            address,

            // Rozszerzone właściwości OSM
            defibrillator_location: tags.defibrillator_location || tags.location,
            level: tags.level || tags['addr:floor'],
            fee: tags.fee,
            wheelchair: tags.wheelchair,
            check_date: tags.check_date || tags['survey:date'] || tags['source:date'],
            manufacturer: tags.manufacturer || tags.brand,
            model: tags.model,
            contact: {
                website: tags.website || tags['contact:website'],
                email: tags.email || tags['contact:email']
            },
            image: tags.image || tags['image:url'],
            emergency: tags.emergency
        };
    });
};
