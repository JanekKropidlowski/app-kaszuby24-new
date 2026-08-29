/**
 * StopMerger - Serwis do łączenia stacji wielooperatorskich
 * 
 * Obsługuje:
 * - Rozpoznawanie duplikatów (ta sama lokalizacja, różni operatorzy)
 * - Łączenie stacji w promieniu N metrów
 * - Agregację odjazdów z wielu operatorów
 */

import { GeoJSONFeature } from '../components/transport/types';
import { getDistance, normalizeName } from './transportUtils';
import { DeparturesService, DepartureInfo, AgencyStop } from './departuresService';

// ============================================================================
// TYPES
// ============================================================================

export interface MergedStop {
    id: string;                    // Unikalny ID (np. "merged_gdansk_glowny")
    name: string;                  // Nazwa stacji
    lat: number;                   // Współrzędne (średnia)
    lon: number;                   // Współrzędne (średnia)
    agencies: AgencyStop[];        // Lista operatorów
    totalDepartures?: number;      // Suma odjazdów ze wszystkich
    nextDeparture?: DepartureInfo; // Najwcześniejszy odjazd
    isMerged: boolean;             // Zawsze true dla połączonych
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MERGE_DISTANCE = 200; // metry
const NAME_SIMILARITY_THRESHOLD = 0.8;

// ============================================================================
// STOP MERGER
// ============================================================================

/**
 * Łączy stacje w promieniu maxDistance metrów
 */
export function mergeStops(
    stops: GeoJSONFeature[],
    maxDistance: number = DEFAULT_MERGE_DISTANCE
): MergedStop[] {
    const merged: MergedStop[] = [];
    const processed = new Set<string>();

    stops.forEach((stop, index) => {
        const uid = stop.properties.uid || stop.properties.id;

        if (processed.has(uid)) {
            return; // Już przetworzony
        }

        // Znajdź wszystkie stacje w pobliżu
        const nearby: GeoJSONFeature[] = [stop];

        stops.forEach((otherStop, otherIndex) => {
            if (index === otherIndex) return;

            const otherUid = otherStop.properties.uid || otherStop.properties.id;
            if (processed.has(otherUid)) return;

            // Sprawdź odległość
            const distance = getDistance(
                stop.geometry.coordinates[1],
                stop.geometry.coordinates[0],
                otherStop.geometry.coordinates[1],
                otherStop.geometry.coordinates[0]
            );

            // Sprawdź podobieństwo nazw
            const nameSimilarity = calculateNameSimilarity(
                stop.properties.name,
                otherStop.properties.name
            );

            // Jeśli blisko i podobna nazwa, to prawdopodobnie ta sama stacja
            if (distance <= maxDistance && nameSimilarity >= NAME_SIMILARITY_THRESHOLD) {
                nearby.push(otherStop);
                processed.add(otherUid);
            }
        });

        processed.add(uid);

        // Utwórz połączoną stację
        const mergedStop = createMergedStop(nearby);
        merged.push(mergedStop);
    });

    return merged;
}

/**
 * Tworzy połączoną stację z listy stacji
 */
function createMergedStop(stops: GeoJSONFeature[]): MergedStop {
    // Oblicz średnie współrzędne
    const avgLat = stops.reduce((sum, s) => sum + s.geometry.coordinates[1], 0) / stops.length;
    const avgLon = stops.reduce((sum, s) => sum + s.geometry.coordinates[0], 0) / stops.length;

    // Zbierz agencje
    const agencies: AgencyStop[] = stops.map(s => ({
        agency: s.properties.agency,
        stopId: s.properties.id,
        uid: s.properties.uid || `${s.properties.agency}:${s.properties.id}`
    }));

    // Użyj najczęstszej nazwy
    const name = getMostCommonName(stops);

    // Generuj ID
    const id = agencies.length > 1
        ? `merged_${normalizeName(name).replace(/\s+/g, '_')}`
        : stops[0].properties.uid || stops[0].properties.id;

    return {
        id,
        name,
        lat: avgLat,
        lon: avgLon,
        agencies,
        isMerged: agencies.length > 1
    };
}

/**
 * Pobiera odjazdy ze wszystkich operatorów dla połączonej stacji
 */
export async function getCombinedDepartures(
    mergedStop: MergedStop,
    departuresService: DeparturesService,
    limit: number = 10
): Promise<DepartureInfo[]> {
    return departuresService.getCombinedDepartures(mergedStop.agencies, limit);
}

/**
 * Wzbogaca połączone stacje o informacje o odjazdach
 */
export async function enrichMergedStops(
    mergedStops: MergedStop[],
    departuresService: DeparturesService
): Promise<MergedStop[]> {
    const enriched = await Promise.all(
        mergedStops.map(async (stop) => {
            try {
                // Pobierz następne odjazdy
                const departures = await getCombinedDepartures(
                    stop,
                    departuresService,
                    3
                );

                // Policz wszystkie odjazdy dzisiaj
                const statusPromises = stop.agencies.map(agency =>
                    departuresService.getStopStatus(agency.stopId, agency.agency)
                );
                const statuses = await Promise.all(statusPromises);
                const totalDepartures = statuses.reduce(
                    (sum, status) => sum + status.departuresCount,
                    0
                );

                return {
                    ...stop,
                    nextDeparture: departures[0],
                    totalDepartures
                };
            } catch (error) {
                console.error(`Error enriching stop ${stop.id}:`, error);
                return stop;
            }
        })
    );

    return enriched;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Oblicza podobieństwo nazw (0-1)
 */
function calculateNameSimilarity(name1: string, name2: string): number {
    const n1 = normalizeName(name1).toLowerCase();
    const n2 = normalizeName(name2).toLowerCase();

    // Dokładne dopasowanie
    if (n1 === n2) return 1.0;

    // Jedno zawiera drugie
    if (n1.includes(n2) || n2.includes(n1)) return 0.9;

    // Levenshtein distance
    const distance = levenshteinDistance(n1, n2);
    const maxLength = Math.max(n1.length, n2.length);

    return 1 - (distance / maxLength);
}

/**
 * Odległość Levenshteina
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Zwraca najczęstszą nazwę
 */
function getMostCommonName(stops: GeoJSONFeature[]): string {
    const nameCounts = new Map<string, number>();

    stops.forEach(stop => {
        const name = stop.properties.name;
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    });

    let mostCommon = stops[0].properties.name;
    let maxCount = 0;

    nameCounts.forEach((count, name) => {
        if (count > maxCount) {
            maxCount = count;
            mostCommon = name;
        }
    });

    return mostCommon;
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Konwertuje MergedStop z powrotem na GeoJSONFeature
 */
export function mergedStopToGeoJSON(mergedStop: MergedStop): GeoJSONFeature {
    return {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [mergedStop.lon, mergedStop.lat]
        },
        properties: {
            id: mergedStop.id,
            uid: mergedStop.id,
            name: mergedStop.name,
            lat: mergedStop.lat,
            lon: mergedStop.lon,
            agency: mergedStop.agencies[0].agency,
            agencies: mergedStop.agencies.map(a => a.agency),
            agencyStops: mergedStop.agencies,
            isMerged: mergedStop.isMerged,
            is_station: true,
            cluster: false
        }
    };
}

/**
 * Konwertuje listę MergedStops na GeoJSON FeatureCollection
 */
export function mergedStopsToGeoJSON(mergedStops: MergedStop[]): {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
} {
    return {
        type: 'FeatureCollection',
        features: mergedStops.map(mergedStopToGeoJSON)
    };
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
    mergeStops,
    getCombinedDepartures,
    enrichMergedStops,
    mergedStopToGeoJSON,
    mergedStopsToGeoJSON
};
