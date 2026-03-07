import { Platform } from 'react-native';

export interface SorQueueItem {
    name: string;
    count: number;
    wait: string;
    triage?: string;
}

export interface SorDataResponse {
    host: string;
    t: number;
    data: SorQueueItem[];
    resstatus: number;
}

export interface SorHospital {
    id_gsl_miej: string;
    nazwa_swd: string;
    adr_lok_miejsc: string;
    adr_lok_ulica: string;
    adr_lok_nr_domu: string | number;
    adr_lok_kod_poczt: string;
    telefon_rej: string;
    lat: number | null;
    lng: number | null;
    Województwo?: string;
    numer_ksiegi: string; // Used for API
    type?: string;
}

const SOR_LIST_URL = 'https://pacjent.gov.pl/sites/default/files/dane/mapa%20topsor%2026%2008%202025.json';
const QUEUE_API_BASE = 'https://pacjent.gov.pl/api/v1/datatopsor';

export const SorService = {
    async fetchHospitals(): Promise<SorHospital[]> {
        try {
            const response = await fetch(SOR_LIST_URL);
            if (!response.ok) throw new Error('Failed to fetch SOR list');
            const data = await response.json();

            const rawData: any[] = Array.isArray(data) ? data : (data.features || []);

            // De-duplicate hospitals by numer_ksiegi to avoid key collisions
            const uniqueHospitalsMap = new Map<string, SorHospital>();

            rawData.forEach(item => {
                // Filter for Pomorskie region only (case insensitive check just in case)
                const isPomorskie = item.Województwo && item.Województwo.toLowerCase().includes('pomorskie');

                if (isPomorskie && item.numer_ksiegi && !uniqueHospitalsMap.has(item.numer_ksiegi)) {
                    uniqueHospitalsMap.set(item.numer_ksiegi, item);
                }
            });

            return Array.from(uniqueHospitalsMap.values());
        } catch {
            return [];
        }
    },

    async fetchQueueTimes(numerKsiegi: string): Promise<SorDataResponse | null> {
        try {
            const response = await fetch(`${QUEUE_API_BASE}/${numerKsiegi}?_format=json`);
            if (!response.ok) throw new Error('Failed to fetch queue data');
            return await response.json();
        } catch {
            return null;
        }
    }
};
