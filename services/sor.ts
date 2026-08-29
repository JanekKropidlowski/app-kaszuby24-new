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
    numer_ksiegi: string;
    type?: string;
    // Cached queue data from kaszuby24.pl/api/sor
    _queueData?: SorDataResponse | null;
}

// Primary: kaszuby24.pl aggregates all data in one request (15-min cache)
// Fallback: direct pacjent.gov.pl calls (slower, 13 parallel requests)
const KASZUBY24_SOR_URL = 'https://kaszuby24.pl/api/sor/';
const SOR_LIST_URL = 'https://pacjent.gov.pl/sites/default/files/dane/mapa%20topsor%2026%2008%202025.json';
const QUEUE_API_BASE = 'https://pacjent.gov.pl/api/v1/datatopsor';

// In-memory cache for the session
let _cachedAll: { hospitals: SorHospital[]; queues: Map<string, SorDataResponse>; at: number } | null = null;
const SESSION_TTL = 1000 * 60 * 15; // 15 min — matches www cache

async function fetchAllFromKaszuby24(): Promise<{ hospitals: SorHospital[]; queues: Map<string, SorDataResponse> } | null> {
    try {
        const response = await fetch(KASZUBY24_SOR_URL, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) return null;
        const data = await response.json();

        const hospitals: SorHospital[] = [];
        const queues = new Map<string, SorDataResponse>();

        for (const h of (data.hospitals || [])) {
            if (h.type !== 'sor') continue;

            const hospital: SorHospital = {
                id_gsl_miej: '',
                nazwa_swd: h.displayName || '',
                adr_lok_miejsc: h.city || '',
                adr_lok_ulica: h.address || '',
                adr_lok_nr_domu: '',
                adr_lok_kod_poczt: '',
                telefon_rej: h.phone || '',
                lat: h.lat ?? null,
                lng: h.lng ?? null,
                Województwo: 'Pomorskie',
                numer_ksiegi: h.id || '',
                type: 'SOR',
            };
            hospitals.push(hospital);

            if (h.queue?.items) {
                queues.set(h.id, {
                    host: 'kaszuby24.pl',
                    t: h.queue.updatedAt || Math.floor(Date.now() / 1000),
                    data: h.queue.items,
                    resstatus: 200,
                });
            }
        }

        return { hospitals, queues };
    } catch {
        return null;
    }
}

export const SorService = {
    async fetchHospitals(): Promise<SorHospital[]> {
        // Try kaszuby24.pl first (one request, cached 15 min)
        if (_cachedAll && Date.now() - _cachedAll.at < SESSION_TTL) {
            return _cachedAll.hospitals;
        }

        const k24 = await fetchAllFromKaszuby24();
        if (k24 && k24.hospitals.length > 0) {
            _cachedAll = { ...k24, at: Date.now() };
            return k24.hospitals;
        }

        // Fallback: direct pacjent.gov.pl
        try {
            const response = await fetch(SOR_LIST_URL);
            if (!response.ok) throw new Error('Failed to fetch SOR list');
            const data = await response.json();
            const rawData: any[] = Array.isArray(data) ? data : (data.features || []);
            const uniqueMap = new Map<string, SorHospital>();
            rawData.forEach(item => {
                const isPomorskie = item.Województwo?.toLowerCase() === 'pomorskie';
                if (isPomorskie && item.numer_ksiegi && !uniqueMap.has(item.numer_ksiegi)) {
                    uniqueMap.set(item.numer_ksiegi, item);
                }
            });
            return Array.from(uniqueMap.values());
        } catch {
            return [];
        }
    },

    async fetchQueueTimes(numerKsiegi: string): Promise<SorDataResponse | null> {
        // Return from kaszuby24.pl cache if available
        if (_cachedAll && Date.now() - _cachedAll.at < SESSION_TTL) {
            return _cachedAll.queues.get(numerKsiegi) ?? null;
        }

        // Trigger full refresh from kaszuby24.pl
        const k24 = await fetchAllFromKaszuby24();
        if (k24) {
            _cachedAll = { ...k24, at: Date.now() };
            return k24.queues.get(numerKsiegi) ?? null;
        }

        // Fallback: direct pacjent.gov.pl
        try {
            const response = await fetch(`${QUEUE_API_BASE}/${numerKsiegi}?_format=json`);
            if (!response.ok) throw new Error('Failed to fetch queue data');
            return await response.json();
        } catch {
            return null;
        }
    },

    // Refresh all queue data at once (more efficient than per-hospital calls)
    async refreshAll(): Promise<void> {
        const k24 = await fetchAllFromKaszuby24();
        if (k24) _cachedAll = { ...k24, at: Date.now() };
    },
};
