
import axios from 'axios';

// Interfejsy danych NISP
export interface NispUnit {
    id_gsl_miej: string;
    nazwa_swd: string;
    nazwa_miejsca: string;
    adr_lok_miejsc: string;
    adr_lok_ulica: string;
    adr_lok_nr_domu: string;
    adr_lok_nr_lokalu: string;
    adr_lok_kod_poczt: string;
    telefon_rej: string;
    mail: string;
    lat: number;
    lng: number;
    Województwo: string;
    uwagi?: string;
    distance?: number;
}

const NISP_LIST_URL = 'https://pacjent.gov.pl/sites/default/files/dane/nisp%2001%20%2010%202025.json';

/**
 * Pobiera listę punktów NISP
 */
export const fetchNispList = async (): Promise<NispUnit[]> => {
    try {
        const response = await axios.get(NISP_LIST_URL);
        const data = response.data;

        if (Array.isArray(data)) {
            return data
                .filter((item: any) => {
                    const woj = (item.Województwo || item.Wojewodztwo || item.wojewodztwo || '').toUpperCase();
                    return woj.includes('POMORSK');
                })
                .map((item: any) => ({
                    ...item,
                    lat: typeof item.lat === 'string' ? parseFloat(item.lat) : item.lat,
                    lng: typeof item.lng === 'string' ? parseFloat(item.lng) : item.lng,
                }));
        }
        return [];
    } catch (error) {
        console.error('Błąd pobierania listy NISP:', error);
        return [];
    }
};
