export interface Shelter {
    id_publiczny: string;
    lokalizacja_lat: number;
    lokalizacja_lon: number;
    nazwa_schronu: string;
    adres: string;
    gmina: string;
    powiat: string;
    wojewodztwo: string;
    typ_obiektu: 'schron' | 'ukrycie' | 'piwnica' | string;
    pojemnosc: number;
    status_dostepnosci: string;
    dystans_metry: number;
    kategoria_zagrozenia: string[];
    wyposazenie: string[];
}

const API_BASE = 'https://gdziesieukryc.pl/api';

export const ShelterService = {
    async fetchNearby(lat: number, lng: number, radius: number = 5000, limit: number = 20): Promise<Shelter[]> {
        try {
            const url = `${API_BASE}/shelters/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch shelters');
            const json = await response.json();
            return json.data || [];
        } catch (error) {
            console.error('Shelter Fetch Error:', error);
            return [];
        }
    }
};
