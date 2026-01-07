
import axios from 'axios';

export interface HospitalUnit {
    id: number;
    name: string;
    lat: number;
    lng: number;
    address: string;
    city: string;
    phone?: string;
    website?: string;
    operator?: string;
    emergency?: boolean; // Czy ma SOR/Emergency
}

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Pobiera ogólne szpitale w województwie pomorskim (zoptymalizowane za pomocą BBox)
 */
export const fetchHospitalsPomorskie = async (): Promise<HospitalUnit[]> => {
    // Bounding Box dla województwa pomorskiego (bardziej precyzyjny region Kaszub/Trójmiasta)
    const bbox = {
        south: 53.8,
        west: 17.0,
        north: 54.9,
        east: 19.2
    };

    try {
        console.log('Pobieranie szpitali dla regionu Pomorskie (BBox)...');
        return await fetchHospitalsInBBox(bbox.south, bbox.west, bbox.north, bbox.east);
    } catch (error) {
        console.warn('Błąd zbiorczego pobierania szpitali:', error);
        return [];
    }
};

/**
 * Pobiera szpitale w określonym obszarze (Bounding Box)
 */
export const fetchHospitalsInBBox = async (south: number, west: number, north: number, east: number): Promise<HospitalUnit[]> => {
    try {
        const query = `
            [out:json][timeout:30];
            (
                node["amenity"="hospital"](${south},${west},${north},${east});
                way["amenity"="hospital"](${south},${west},${north},${east});
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
                name: el.tags?.name || 'Szpital',
                lat: el.lat || el.center?.lat,
                lng: el.lon || el.center?.lon,
                address: `${el.tags?.['addr:street'] || ''} ${el.tags?.['addr:housenumber'] || ''}`.trim() || 'Brak danych adresowych',
                city: el.tags?.['addr:city'] || '',
                phone: el.tags?.phone || el.tags?.['contact:phone'],
                website: el.tags?.website || el.tags?.['contact:website'],
                operator: el.tags?.operator,
                emergency: el.tags?.emergency === 'yes'
            }));
        }
        return [];
    } catch (error) {
        console.warn('Błąd pobierania szpitali (BBox):', error);
        return [];
    }
};

/**
 * Pobiera szpitale w pobliżu danej lokalizacji
 */
export const fetchHospitalsNearby = async (lat: number, lng: number, radius: number = 20000): Promise<HospitalUnit[]> => {
    try {
        const query = `
            [out:json][timeout:30];
            (
                node["amenity"="hospital"](around:${radius},${lat},${lng});
                way["amenity"="hospital"](around:${radius},${lat},${lng});
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
                name: el.tags?.name || 'Szpital',
                lat: el.lat || el.center?.lat,
                lng: el.lon || el.center?.lon,
                address: `${el.tags?.['addr:street'] || ''} ${el.tags?.['addr:housenumber'] || ''}`.trim() || 'Brak danych adresowych',
                city: el.tags?.['addr:city'] || '',
                phone: el.tags?.phone || el.tags?.['contact:phone'],
                website: el.tags?.website || el.tags?.['contact:website'],
                operator: el.tags?.operator,
                emergency: el.tags?.emergency === 'yes'
            }));
        }
        return [];
    } catch (error) {
        console.warn(`Błąd pobierania szpitali (around ${lat},${lng}):`, error);
        return [];
    }
};
