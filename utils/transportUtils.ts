import { GeoJSONFeature } from '../components/transport/types';

/**
 * Normalizuje nazwę przystanku do celów porównawczych.
 * Usuwa nazwy miast z początku i znaki specjalne.
 */
export const normalizeName = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/^(gdańsk|gdynia|sopot|rumia|reda|wejherowo|tczew|słupsk|ustka) /g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
};

/**
 * Oblicza dystans między dwoma punktami w metrach.
 */
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // promień Ziemi w metrach
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Sprawdza czy punkt znajduje się w zadanym obszarze (bounding box).
 */
export const isPointInBoundingBox = (
    lat: number,
    lon: number,
    bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number }
): boolean => {
    return (
        lat >= bbox.minLat &&
        lat <= bbox.maxLat &&
        lon >= bbox.minLon &&
        lon <= bbox.maxLon
    );
};

export interface MergedStation extends GeoJSONFeature {
    properties: GeoJSONFeature['properties'] & {
        agencies: string[];
        childStops: GeoJSONFeature[];
        isMerged?: boolean;
    };
}

/**
 * Łączy przystanki różnych przewoźników w jedną "Stację".
 * Optymalizacja: Grupowanie wstępne po zgrubnych koordynatach (grid).
 */
export const mergeStops = (stops: GeoJSONFeature[]): MergedStation[] => {
    if (stops.length === 0) return [];

    // Sortujemy po szerokości geograficznej, aby ograniczyć liczbę porównań
    const sortedStops = [...stops].sort((a, b) =>
        a.geometry.coordinates[1] - b.geometry.coordinates[1]
    );

    const merged: MergedStation[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < sortedStops.length; i++) {
        if (usedIndices.has(i)) continue;

        const stopA = sortedStops[i];
        const normA = normalizeName(stopA.properties.name);
        const [lonA, latA] = stopA.geometry.coordinates;

        const station: MergedStation = {
            ...stopA,
            properties: {
                ...stopA.properties,
                agencies: [stopA.properties.agency],
                childStops: [stopA],
                isMerged: false,
            },
        };

        // Szukamy tylko w pobliżu stopA (wykorzystując posortowaną listę)
        for (let j = i + 1; j < sortedStops.length; j++) {
            if (usedIndices.has(j)) continue;

            const stopB = sortedStops[j];
            const [lonB, latB] = stopB.geometry.coordinates;

            // Jeśli różnica lat jest większa niż ~0.003 (~330m), przerywamy pętlę wewnętrzną
            if (latB - latA > 0.003) break;

            const dist = getDistance(latA, lonA, latB, lonB);

            if (dist < 300) {
                const normB = normalizeName(stopB.properties.name);
                if (normA === normB || normA.includes(normB) || normB.includes(normA)) {
                    if (!station.properties.agencies.includes(stopB.properties.agency)) {
                        station.properties.agencies.push(stopB.properties.agency);
                    }
                    station.properties.childStops.push(stopB);
                    station.properties.isMerged = true;
                    usedIndices.add(j);
                }
            }
        }

        const skmChild = station.properties.childStops.find(s => s.properties.agency === 'skm');
        if (skmChild) {
            station.properties.name = skmChild.properties.name;
        }

        merged.push(station);
    }

    return merged;
};

/**
 * Filtruje stacje na podstawie wybranego przewoźnika.
 */
export const filterStations = (stations: MergedStation[], carrier: 'all' | 'skm' | 'polregio'): MergedStation[] => {
    if (carrier === 'all') return stations;
    return stations.filter(s => s.properties.agencies.includes(carrier));
};
