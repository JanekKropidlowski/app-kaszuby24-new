import { POMORSKIE_HOSPITALS_COORDS } from './hospitalCoords';

export interface GeneralHospital {
    "L.P.": number;
    typ_organizacji: string;
    nip: string;
    regon: string;
    organizacja: string;
    miasto: string;
    adres: string;
    adres_numer: string;
    adres_kod_pocztowy: string;
    woj: string;
    ocena: number;
    termin_waznosci: string;
    url_organizacji: string;
    lat?: number;
    lon?: number;
}

const CMJ_API_URL = 'https://www.cmj.org.pl/api/certyfikaty/szpitale';

export const HospitalService = {
    async fetchGeneralHospitals(): Promise<GeneralHospital[]> {
        try {
            const response = await fetch(CMJ_API_URL);
            if (!response.ok) throw new Error('Failed to fetch General Hospitals');
            const data = await response.json();

            // Filter Pomorskie
            const pomorskieHospitals = data.filter((item: any) =>
                item.woj && item.woj.toLowerCase().includes('pomorskie')
            );

            // Match with static coordinates
            return pomorskieHospitals.map((item: any) => {
                let coords = null;

                // 1. Try exact name match
                coords = POMORSKIE_HOSPITALS_COORDS[item.organizacja];

                // 2. Try fuzzy / partial match if exact failed
                if (!coords) {
                    const keys = Object.keys(POMORSKIE_HOSPITALS_COORDS);
                    for (const key of keys) {
                        // If API name contains our key, or our key contains API name (normalized)
                        const apiKey = item.organizacja.toLowerCase();
                        const myKey = key.toLowerCase();

                        // Check if city matches first to avoid false positives
                        if (apiKey.includes(item.miasto.toLowerCase()) || apiKey.includes(myKey) || myKey.includes(apiKey)) {
                            // Double check city if possible, but our list is small enough
                            coords = POMORSKIE_HOSPITALS_COORDS[key];
                            break;
                        }
                    }
                }

                // If still no coords, and it's a "Szpital" type, maybe fallback to city center (optional, skipping for now to strict match)

                return {
                    ...item,
                    lat: coords?.lat,
                    lon: coords?.lon,
                    termin_waznosci: item["termin waznosci"]
                };
            }).filter((h: any) => h.lat && h.lon); // Only return those we managed to locate

        } catch (error) {
            console.error('General Hospital Fetch Error:', error);
            return [];
        }
    }
};
