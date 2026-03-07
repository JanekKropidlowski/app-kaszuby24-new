/**
 * DeparturesService - Serwis do pobierania rzeczywistych odjazdów z API
 * 
 * Obsługuje:
 * - Pobieranie odjazdów z pojedynczego operatora
 * - Łączenie odjazdów z wielu operatorów (stacje wielooperatorskie)
 * - Cache'owanie wyników
 * - Obliczanie "za ile minut odjedzie"
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DepartureInfo {
    time: string;              // HH:MM
    minutesUntil: number;      // Za ile minut
    line: string;              // Numer linii
    destination: string;       // Kierunek
    agency: string;            // 'skm' | 'polregio'
    stopId: string;            // ID przystanku
    platform?: string;         // Peron
    isRealTime?: boolean;      // Czy dane live (TODO)
    delay?: number;            // Opóźnienie w minutach (TODO)
}

export interface AgencyStop {
    agency: string;            // 'skm' | 'polregio'
    stopId: string;            // ID u operatora
    uid: string;               // Pełny UID (np. 'skm:7500')
}

interface CachedDepartures {
    data: DepartureInfo[];
    timestamp: number;
    expiresAt: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_DURATION = 60 * 1000; // 1 minuta
const REQUEST_TIMEOUT = 20000;    // Zwiększone do 20 sekund dla PKS Gdynia

// ============================================================================
// DEPARTURES SERVICE
// ============================================================================

export class DeparturesService {
    private cache: Map<string, CachedDepartures>;
    private apiUrl: string;

    constructor(apiUrl: string = 'https://kaszuby24.pl/wp-json/kaszuby24/v2') {
        this.cache = new Map();
        this.apiUrl = apiUrl;
    }

    /**
     * Pobiera następne N odjazdów z przystanku (jeden operator)
     */
    async getNextDepartures(
        stopId: string,
        agency: string,
        limit: number = 5
    ): Promise<DepartureInfo[]> {
        const cacheKey = `${agency}:${stopId}`;

        // Sprawdź cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data.slice(0, limit);
        }

        // Pobierz z API
        try {
            const departures = await this.fetchFromAPI(stopId, agency);

            // Filtruj tylko przyszłe odjazdy
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const futureDepartures = departures
                .map(dep => ({
                    ...dep,
                    minutesUntil: this.calculateMinutesUntil(dep.time)
                }))
                .filter(dep => dep.minutesUntil >= 0)
                .sort((a, b) => a.minutesUntil - b.minutesUntil);

            // Cache wyniki
            this.cache.set(cacheKey, {
                data: futureDepartures,
                timestamp: Date.now(),
                expiresAt: Date.now() + CACHE_DURATION
            });

            return futureDepartures.slice(0, limit);
        } catch (error) {
            console.error(`Error fetching departures for ${agency}:${stopId}:`, error);
            return [];
        }
    }

    /**
     * Pobiera odjazdy ze wszystkich operatorów (stacje wielooperatorskie)
     */
    async getCombinedDepartures(
        stops: AgencyStop[],
        limit: number = 10
    ): Promise<DepartureInfo[]> {
        // Pobierz odjazdy równolegle dla wszystkich operatorów
        const promises = stops.map(stop =>
            this.getNextDepartures(stop.stopId, stop.agency, limit)
        );

        const results = await Promise.all(promises);

        // Połącz i posortuj
        const combined = results
            .flat()
            .sort((a, b) => a.minutesUntil - b.minutesUntil)
            .slice(0, limit);

        return combined;
    }

    /**
     * Pobiera odjazdy w określonym przedziale czasowym
     */
    async getDeparturesInTimeRange(
        stopId: string,
        agency: string,
        fromTime: string,
        toTime: string
    ): Promise<DepartureInfo[]> {
        const allDepartures = await this.getNextDepartures(stopId, agency, 50);

        const fromMinutes = this.timeToMinutes(fromTime);
        const toMinutes = this.timeToMinutes(toTime);

        return allDepartures.filter(dep => {
            const depMinutes = this.timeToMinutes(dep.time);
            return depMinutes >= fromMinutes && depMinutes <= toMinutes;
        });
    }

    /**
     * Pobiera status przystanku (ile kursów dzisiaj)
     */
    async getStopStatus(
        stopId: string,
        agency: string
    ): Promise<{ isActive: boolean; departuresCount: number }> {
        const cacheKey = `${agency}:${stopId}`;

        // Sprawdź czy mamy to już w cache (nawet jeśli wygasło, ale jest świeże)
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            return {
                isActive: cached.data.length > 0,
                departuresCount: cached.data.length
            };
        }

        try {
            // Próba pobrania (getNextDepartures już obsłuży cache i błędy)
            const departures = await this.getNextDepartures(stopId, agency, 50);
            return {
                isActive: departures.length > 0,
                departuresCount: departures.length
            };
        } catch (error) {
            return {
                isActive: false,
                departuresCount: 0
            };
        }
    }

    /**
     * Czyści cache (np. po zmianie dnia)
     */
    clearCache(): void {
        this.cache.clear();
    }

    // ========================================
    // PRIVATE METHODS
    // ========================================

    /**
     * Pobiera dane z API
     */
    private async fetchFromAPI(
        stopId: string,
        agency: string
    ): Promise<DepartureInfo[]> {
        const url = `${this.apiUrl}/timetable?agency=${agency}&stop_id=${stopId}&day=today`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Get text first to handle potential HTML warnings from Redis
            let responseText = await response.text();

            // Check if response starts with HTML (PHP warnings)
            if (responseText.startsWith('<')) {
                console.log(`[DeparturesService] Stripped HTML warnings from departures response`);
                // Find the start of JSON (usually starts with '[' for departures array)
                const jsonStart = responseText.indexOf('[');
                if (jsonStart !== -1) {
                    responseText = responseText.substring(jsonStart);
                }
            }

            const data = JSON.parse(responseText);

            // Function to correct timezone issue (API returns times 1 hour ahead)
            const correctTimezone = (timeStr: string): string => {
                if (!timeStr || timeStr === '00:00') return timeStr;

                try {
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    let correctedHours = hours - 1;

                    // Handle midnight wraparound
                    if (correctedHours < 0) {
                        correctedHours = 23;
                    }

                    return `${correctedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                } catch (e) {
                    console.error('[DeparturesService] Error correcting time:', timeStr, e);
                    return timeStr;
                }
            };

            // Konwertuj format API na DepartureInfo
            return data.map((dep: any) => ({
                time: dep.time,
                minutesUntil: 0, // Będzie obliczone później
                line: dep.line,
                destination: dep.dest || dep.destination,
                agency,
                stopId,
                platform: dep.platform
            }));
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    /**
     * Oblicza za ile minut odjedzie pociąg
     */
    private calculateMinutesUntil(departureTime: string): number {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [hours, minutes] = departureTime.split(':').map(Number);
        let departureMinutes = hours * 60 + minutes;

        // Obsługa godzin po północy (24:00+)
        if (hours >= 24) {
            departureMinutes = (hours - 24) * 60 + minutes;
        }

        let diff = departureMinutes - currentMinutes;

        // Jeśli różnica jest ujemna i duża, prawdopodobnie to jutro
        if (diff < -60) {
            diff += 24 * 60;
        }

        return diff;
    }

    /**
     * Konwertuje czas HH:MM na minuty od północy
     */
    private timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: DeparturesService | null = null;

export const getDeparturesService = (apiUrl?: string): DeparturesService => {
    if (!instance) {
        instance = new DeparturesService(apiUrl);
    }
    return instance;
};

// ============================================================================
// EXPORT
// ============================================================================

export default DeparturesService;
