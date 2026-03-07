import Fuse from 'fuse.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDistance, normalizeName } from './transportUtils';
import { DeparturesService, DepartureInfo, AgencyStop } from './departuresService';

// ============================================================================
// TYPES
// ============================================================================

export type SearchResultType = 'stop' | 'place' | 'history' | 'route';

export interface TransportSearchResult {
    id: string;
    name: string;
    type: SearchResultType;
    lat?: number;
    lon?: number;
    description?: string;
    source: 'local' | 'api' | 'history' | 'cache';
    agency?: string;
    agencies?: string[];              // ZMIENIONE: tablica operatorów
    agencyStops?: AgencyStop[];       // NOWE: szczegóły dla każdego operatora
    score?: number;
    distance?: number;                // metry od użytkownika
    connections?: number;             // liczba połączeń z tego przystanku
    popularity?: number;              // popularność (z historii)

    // NOWE: Real-time departures
    nextDepartures?: DepartureInfo[]; // Następne odjazdy
    departuresCount?: number;         // Suma kursów ze wszystkich operatorów
    nextDepartureIn?: number;         // Za ile min następny (najwcześniejszy)
    isActive?: boolean;               // Czy są kursy teraz
    isMerged?: boolean;               // Czy to połączona stacja
}

export interface SearchFilters {
    agencies?: string[]; // ['skm', 'polregio']
    maxDistance?: number; // metry
    minConnections?: number; // minimalna liczba połączeń
    onlyMajorStops?: boolean; // tylko główne przystanki
    sortBy?: 'relevance' | 'distance' | 'popularity' | 'connections';
}

export interface SearchContext {
    userLocation?: { lat: number; lon: number };
    recentSearches?: string[];
    favoriteStops?: string[];
    currentTime?: string; // HH:MM
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HISTORY_KEY = 'transport_search_history';
const FAVORITES_KEY = 'transport_favorites';
const STATS_KEY = 'transport_search_stats';
const MAX_HISTORY = 20;
const MAX_RESULTS = 50;

// Główne przystanki (węzły przesiadkowe)
const MAJOR_STOPS = [
    'Gdańsk Główny',
    'Gdynia Główna',
    'Sopot',
    'Gdańsk Wrzeszcz',
    'Tczew',
    'Malbork',
    'Słupsk',
    'Lębork'
];

// ============================================================================
// SCORING & RANKING
// ============================================================================

/**
 * Zaawansowane obliczanie wyniku wyszukiwania
 */
const calculateAdvancedScore = (
    item: TransportSearchResult,
    query: string,
    context: SearchContext,
    filters: SearchFilters
): number => {
    let score = 0;
    const q = query.toLowerCase().trim();
    const n = item.name.toLowerCase();

    // ========================================
    // 1. TEXT MATCHING (0-1000 punktów)
    // ========================================

    // Dokładne dopasowanie
    if (n === q) {
        score += 1000;
    }
    // Rozpoczyna się od zapytania
    else if (n.startsWith(q)) {
        score += 800; // Zwiększone z 700
    }
    // Zawiera zapytanie
    else if (n.includes(q)) {
        score += 400;
    }
    // Dopasowanie słów
    else {
        const queryWords = q.split(' ');
        const nameWords = n.split(' ');

        // Każde dopasowane słowo
        queryWords.forEach(qw => {
            nameWords.forEach(nw => {
                if (nw.startsWith(qw)) score += 150;
                else if (nw.includes(qw)) score += 50;
            });
        });
    }

    // Dopasowanie akronimów (np. "GG" -> "Gdańsk Główny")
    if (q.length <= 3) {
        const acronym = item.name
            .split(' ')
            .map(w => w[0])
            .join('')
            .toLowerCase();
        if (acronym === q) score += 800;
    }

    // ========================================
    // 2. TYPE & SOURCE PRIORITY (0-300 punktów)
    // ========================================

    if (item.type === 'history') score += 50; // historia nie nadpisuje priorytetu agencji
    if (item.source === 'history') score += 20;

    // ========================================
    // 3. LOCATION PROXIMITY (0-500 punktów)
    // ========================================

    if (context.userLocation && item.lat && item.lon) {
        const dist = getDistance(
            context.userLocation.lat,
            context.userLocation.lon,
            item.lat,
            item.lon
        );

        item.distance = dist;

        // Bardzo blisko (< 500m)
        if (dist < 500) score += 500;
        // Blisko (< 2km)
        else if (dist < 2000) score += 400;
        // W okolicy (< 5km)
        else if (dist < 5000) score += 250;
        // W mieście (< 20km)
        else if (dist < 20000) score += 100;
        // Daleko (< 50km)
        else if (dist < 50000) score += 30;
    }

    // ========================================
    // 4. POPULARITY & USAGE (0-300 punktów)
    // ========================================

    // Ulubione przystanki
    if (context.favoriteStops?.includes(item.id)) {
        score += 300;
    }

    // Ostatnio wyszukiwane
    if (context.recentSearches?.includes(item.name)) {
        score += 150;
    }

    // Główne przystanki (węzły)
    if (MAJOR_STOPS.some(major => item.name.includes(major))) {
        score += 200;
    }

    // Popularność (z historii użycia)
    if (item.popularity) {
        score += Math.min(item.popularity * 10, 200);
    }

    // ========================================
    // 5. CONNECTIONS & IMPORTANCE (0-200 punktów)
    // ========================================

    // Liczba połączeń
    if (item.connections) {
        if (item.connections > 50) score += 200;
        else if (item.connections > 20) score += 150;
        else if (item.connections > 10) score += 100;
        else if (item.connections > 5) score += 50;
    }

    // ========================================
    // 5. AGENCY PRIORITY - CRITICAL FOR SORTING
    // Priority: 🚆 SKM (highest) > 🚂 POLREGIO > � PKS Gdynia > �🚌 MZK Wejherowo > others
    // ========================================

    // Collect all agencies (from both 'agencies' array and single 'agency' field)
    const allAgencies: string[] = [];
    if (item.agencies && item.agencies.length > 0) {
        allAgencies.push(...item.agencies);
    }
    if (item.agency && !allAgencies.includes(item.agency)) {
        allAgencies.push(item.agency);
    }

    let agencyBonus = 0;
    if (allAgencies.length > 0) {
        const hasSKM = allAgencies.some(a => a.toLowerCase().includes('skm'));
        const hasPolregio = allAgencies.some(a => {
            const lowA = a.toLowerCase();
            return lowA.includes('polregio') || lowA === 'reg' || lowA === 'regio' || lowA === 'regio_rail';
        });
        const hasMZK = allAgencies.some(a => {
            const lowA = a.toLowerCase();
            return lowA.includes('mzk') || lowA.includes('wejherowo');
        });
        const hasPKS = allAgencies.some(a => {
            const lowA = a.toLowerCase();
            return lowA.includes('pks') || lowA.includes('pksgdynia');
        });

        // Priority hierarchy - SKM > POLREGIO > PKS Gdynia > MZK Wejherowo
        // These bonuses are HIGH to ensure train stops always appear first!
        if (hasSKM) {
            agencyBonus = 10000; // 🚆 SKM gets HIGHEST priority
        } else if (hasPolregio) {
            agencyBonus = 9000; // 🚂 POLREGIO gets SECOND priority
        } else if (hasPKS) {
            agencyBonus = 8500; // 🚍 PKS Gdynia gets THIRD priority
        } else if (hasMZK) {
            agencyBonus = 8000; // 🚌 MZK Wejherowo gets FOURTH priority
        }
        score += agencyBonus;
    }

    // ========================================
    // 6. AGENCY PREFERENCE (0-100 punktów)
    // ========================================

    if (filters.agencies && item.agency) {
        if (filters.agencies.includes(item.agency)) {
            score += 100;
        }
    }

    // ========================================
    // 7. FILTERS APPLICATION (kary)
    // ========================================

    // Maksymalna odległość
    if (filters.maxDistance && item.distance && item.distance > filters.maxDistance) {
        score -= 500;
    }

    // Minimalna liczba połączeń
    if (filters.minConnections && item.connections && item.connections < filters.minConnections) {
        score -= 300;
    }

    // Tylko główne przystanki
    if (filters.onlyMajorStops && !MAJOR_STOPS.some(major => item.name.includes(major))) {
        score -= 400;
    }

    return Math.max(0, score);
};

// ============================================================================
// SEARCH SOURCES
// ============================================================================

/**
 * Pobiera wyniki z historii
 */
export const getHistoryResults = async (query: string): Promise<TransportSearchResult[]> => {
    try {
        const json = await AsyncStorage.getItem(HISTORY_KEY);
        if (!json) return [];
        const history: TransportSearchResult[] = JSON.parse(json);

        if (!query) return history.slice(0, 10);

        const fuse = new Fuse(history, {
            keys: ['name'],
            threshold: 0.3,
            distance: 100,
        });

        const results = fuse.search(query);
        return results.map(r => ({ ...r.item, source: 'history' as const }));
    } catch (e) {
        console.error('History load error', e);
        return [];
    }
};

/**
 * Pobiera ulubione przystanki
 */
export const getFavorites = async (): Promise<TransportSearchResult[]> => {
    try {
        const json = await AsyncStorage.getItem(FAVORITES_KEY);
        if (!json) return [];
        return JSON.parse(json);
    } catch (e) {
        console.error('Favorites load error', e);
        return [];
    }
};

/**
 * Pobiera statystyki użycia przystanków
 */
const getSearchStats = async (): Promise<Record<string, number>> => {
    try {
        const json = await AsyncStorage.getItem(STATS_KEY);
        return json ? JSON.parse(json) : {};
    } catch (e) {
        return {};
    }
};

/**
 * Wyszukuje w lokalnych danych
 * SORTUJE WG PRIORYTETU AGENCJI: 🚆 SKM > 🚂 POLREGIO > 🚌 MZK Wejherowo > inne
 */
export const getLocalResults = (
    query: string,
    allStops: TransportSearchResult[],
    filters: SearchFilters = {},
    context: SearchContext = {}
): TransportSearchResult[] => {
    if (!query || !allStops.length) return [];

    let normalizedStops = allStops;

    // Filtruj według agencji
    if (filters.agencies && filters.agencies.length > 0) {
        normalizedStops = normalizedStops.filter(s =>
            s.agencies && s.agencies.some(a => filters.agencies!.includes(a))
        );
    }

    // Fuzzy search
    const fuse = new Fuse(normalizedStops, {
        keys: [
            { name: 'name', weight: 1.0 },
            { name: 'agency', weight: 0.5 },
            { name: 'description', weight: 0.2 }
        ],
        threshold: 0.4, // Zwiększone z 0.3 dla większej elastyczności
        distance: 100,
        includeScore: true
    });

    const results = fuse.search(query);

    // Oblicz advanced score dla każdego wyniku
    const scoredResults = results.map(r => {
        const item = r.item;
        item.score = calculateAdvancedScore(item, query, context, filters);
        return item;
    });

    // SORTOWANIE WG SCORE (który zawiera priorytet agencji!)
    // Score = text match + agency priority (SKM +10000, POLREGIO +9000, MZK +8000)
    scoredResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    const finalResults = scoredResults.slice(0, MAX_RESULTS);

    return finalResults;
};

/**
 * NOWE: Wzbogaca wyniki o informacje o odjazdach
 */
export const enrichWithDepartures = async (
    results: TransportSearchResult[],
    departuresService: DeparturesService,
    limit: number = 3
): Promise<TransportSearchResult[]> => {
    const enriched = await Promise.all(
        results.map(async (result) => {
            try {
                // Jeśli stacja wielooperatorska
                if (result.isMerged && result.agencyStops) {
                    const departures = await departuresService.getCombinedDepartures(
                        result.agencyStops,
                        limit
                    );

                    // Redukcja zapytań: zamiast pytać o status każdego operatora,
                    // przyjmujemy, że stacja jest aktywna jeśli mamy odjazdy,
                    // a liczba odjazdów to rozmiar listy (lub przybliżenie)
                    return {
                        ...result,
                        nextDepartures: departures,
                        nextDepartureIn: departures[0]?.minutesUntil,
                        departuresCount: departures.length, // Przybliżenie bazujące na pobranych
                        isActive: departures.length > 0
                    };
                }
                // Pojedynczy operator
                else if (result.agency) {
                    const departures = await departuresService.getNextDepartures(
                        result.id,
                        result.agency,
                        limit
                    );

                    return {
                        ...result,
                        nextDepartures: departures,
                        nextDepartureIn: departures[0]?.minutesUntil,
                        departuresCount: departures.length,
                        isActive: departures.length > 0
                    };
                }

                return result;
            } catch (error) {
                console.error(`Error enriching result ${result.id}:`, error);
                return result;
            }
        })
    );

    return enriched;
};

// ============================================================================
// MAIN SEARCH FUNCTION
// ============================================================================

/**
 * Główna funkcja wyszukiwania z progresywnym ładowaniem
 */
export async function* performAdvancedSearch(
    query: string,
    allStops: TransportSearchResult[],
    context: SearchContext = {},
    filters: SearchFilters = {}
): AsyncGenerator<TransportSearchResult[]> {
    const results: TransportSearchResult[] = [];
    const seenIds = new Set<string>();

    // Pobierz statystyki użycia
    const stats = await getSearchStats();

    /**
     * Przetwarza i deduplikuje wyniki
     */
    const processAndDeduplicate = (items: TransportSearchResult[]) => {
        items.forEach(item => {
            // Dodaj popularność ze statystyk
            if (stats[item.id]) {
                item.popularity = stats[item.id];
            }

            // Sprawdź duplikaty
            const existingIdx = results.findIndex(r => {
                // Ten sam ID
                if (r.id === item.id) return true;

                // Podobna nazwa i bliska lokalizacja
                const sameName = normalizeName(r.name) === normalizeName(item.name);
                if (!sameName) return false;

                if (r.lat && r.lon && item.lat && item.lon) {
                    return getDistance(r.lat, r.lon, item.lat, item.lon) < 200;
                }

                return true;
            });

            if (existingIdx !== -1) {
                // Aktualizuj istniejący wynik
                const existing = results[existingIdx];
                let agenciesChanged = false;

                // Łącz agencje i ich ID
                if (item.agency && !existing.agencies?.includes(item.agency)) {
                    existing.agencies = [...(existing.agencies || []), item.agency];
                    agenciesChanged = true;
                }

                if (item.agencyStops && item.agencyStops.length > 0) {
                    const existingStops = existing.agencyStops || [];
                    item.agencyStops.forEach(as => {
                        if (!existingStops.find(es => es.agency === as.agency && es.stopId === as.stopId)) {
                            existingStops.push(as);
                            agenciesChanged = true;
                        }
                    });
                    existing.agencyStops = existingStops;
                } else if (item.agency && item.id) {
                    // Fallback: jeśli brak agencyStops, stwórz z id i agency
                    const existingStops = existing.agencyStops || [];
                    if (!existingStops.find(es => es.agency === item.agency)) {
                        existingStops.push({ agency: item.agency, stopId: item.id, uid: `${item.agency}:${item.id}` });
                        agenciesChanged = true;
                    }
                    existing.agencyStops = existingStops;
                }

                // Przelicz score jeśli agencje się zmieniły (może być teraz wyższy priorytet!)
                // lub jeśli nowy score jest lepszy
                const newScore = calculateAdvancedScore(existing, query, context, filters);
                if (agenciesChanged || newScore > (existing.score || 0)) {
                    existing.score = newScore;
                    if (item.source !== 'history') {
                        existing.source = item.source;
                    }
                }

                // BONUS: If item has higher agency priority than existing, boost its score
                // This ensures SKM/POLREGIO always win against MZK even when merged
                const getAgencyTier = (agencies?: string[], agency?: string) => {
                    const allAg: string[] = [];
                    if (agencies && agencies.length > 0) allAg.push(...agencies);
                    if (agency && !allAg.includes(agency)) allAg.push(agency);
                    if (allAg.length === 0) return 0;

                    // Priority: SKM > POLREGIO > MZK Wejherowo
                    if (allAg.some(a => a.toLowerCase().includes('skm'))) return 1000;
                    if (allAg.some(a => {
                        const lowA = a.toLowerCase();
                        return lowA.includes('polregio') || lowA.includes('regio') || lowA === 'regio_rail';
                    })) return 900;
                    if (allAg.some(a => {
                        const lowA = a.toLowerCase();
                        return lowA.includes('mzk') || lowA.includes('wejherowo');
                    })) return 800;
                    return 0;
                };

                const itemTier = getAgencyTier(item.agencies, item.agency);
                const existingTier = getAgencyTier(existing.agencies, existing.agency);

                // If item agency tier is higher, ensure its score wins
                if (itemTier > existingTier && item.score && item.score > (existing.score || 0)) {
                    existing.score = item.score + (itemTier - existingTier) * 10;
                }
            } else if (!seenIds.has(item.id)) {
                // Dodaj nowy wynik
                item.score = calculateAdvancedScore(item, query, context, filters);
                results.push(item);
                seenIds.add(item.id);
            }
        });

        // Sortuj według wybranego kryterium
        const sorted = sortResults([...results], filters.sortBy || 'relevance');
        return sorted;
    };

    // FAZA 1: Historia (najszybsza)
    // ========================================
    const history = await getHistoryResults(query);
    yield processAndDeduplicate(history);

    // ========================================
    // FAZA 2: Ulubione (jeśli pasują)
    // ========================================
    if (query.length >= 2) {
        const favorites = await getFavorites();
        const matchingFavorites = favorites.filter(f =>
            f.name.toLowerCase().includes(query.toLowerCase())
        );
        yield processAndDeduplicate(matchingFavorites);
    }

    // ========================================
    // FAZA 3: Lokalne dane (główne wyniki)
    // ========================================
    const local = getLocalResults(query, allStops, filters, context);
    yield processAndDeduplicate(local);
}

/**
 * Sortuje wyniki według wybranego kryterium
 */
const sortResults = (
    results: TransportSearchResult[],
    sortBy: 'relevance' | 'distance' | 'popularity' | 'connections'
): TransportSearchResult[] => {
    switch (sortBy) {
        case 'distance':
            return results.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

        case 'popularity':
            return results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        case 'connections':
            return results.sort((a, b) => (b.connections || 0) - (a.connections || 0));

        case 'relevance':
        default:
            return results.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
};

// ============================================================================
// HISTORY & FAVORITES MANAGEMENT
// ============================================================================

/**
 * Dodaje do historii wyszukiwania
 */
export const addToHistory = async (item: TransportSearchResult) => {
    try {
        const json = await AsyncStorage.getItem(HISTORY_KEY);
        let history: TransportSearchResult[] = json ? JSON.parse(json) : [];

        // Usuń duplikaty
        history = history.filter(h => h.id !== item.id);

        // Dodaj na początek
        history.unshift({ ...item, source: 'history', score: 0 });

        // Ogranicz rozmiar
        if (history.length > MAX_HISTORY) {
            history = history.slice(0, MAX_HISTORY);
        }

        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));

        // Aktualizuj statystyki
        await updateSearchStats(item.id);
    } catch (e) {
        console.error('History save error', e);
    }
};

/**
 * Aktualizuje statystyki użycia
 */
const updateSearchStats = async (stopId: string) => {
    try {
        const stats = await getSearchStats();
        stats[stopId] = (stats[stopId] || 0) + 1;
        await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {
        console.error('Stats update error', e);
    }
};

/**
 * Dodaje do ulubionych
 */
export const addToFavorites = async (item: TransportSearchResult) => {
    try {
        const favorites = await getFavorites();

        // Sprawdź czy już istnieje
        if (favorites.some(f => f.id === item.id)) {
            return;
        }

        favorites.push(item);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
        console.error('Favorites save error', e);
    }
};

/**
 * Usuwa z ulubionych
 */
export const removeFromFavorites = async (stopId: string) => {
    try {
        const favorites = await getFavorites();
        const filtered = favorites.filter(f => f.id !== stopId);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Favorites remove error', e);
    }
};

/**
 * Czyści historię
 */
export const clearHistory = async () => {
    try {
        await AsyncStorage.removeItem(HISTORY_KEY);
        await AsyncStorage.removeItem(STATS_KEY);
    } catch (e) {
        console.error('History clear error', e);
    }
};

// ============================================================================
// SUGGESTIONS & AUTOCOMPLETE
// ============================================================================

/**
 * Generuje sugestie wyszukiwania - WITH PRIORITY SORTING
 * Priority: 🚆 SKM (highest) > 🚂 POLREGIO > � PKS Gdynia > �🚌 MZK Wejherowo > others
 */
export const getSuggestions = async (
    query: string,
    allStops: TransportSearchResult[]
): Promise<string[]> => {
    const suggestionsMap = new Map<string, { name: string; priority: number; agency?: string }>();

    // Helper do obliczania priorytetu na podstawie agency/agencies
    const getPriority = (agencies?: string[], agency?: string) => {
        // Collect all agencies
        const allAg: string[] = [];
        if (agencies && agencies.length > 0) allAg.push(...agencies);
        if (agency && !allAg.includes(agency)) allAg.push(agency);

        if (allAg.length === 0) return 0;

        let maxPriority = 0;
        for (const ag of allAg) {
            const agLower = ag.toLowerCase();
            // Priority hierarchy: SKM > POLREGIO > PKS Gdynia > MZK Wejherowo > rail > others
            if (agLower.includes('skm')) maxPriority = Math.max(maxPriority, 1000); // 🚆 SKM - HIGHEST
            else if (agLower.includes('polregio') || agLower.includes('regio') || agLower === 'regio_rail') maxPriority = Math.max(maxPriority, 900); // 🚂 POLREGIO
            else if (agLower.includes('pks') || agLower.includes('pksgdynia')) maxPriority = Math.max(maxPriority, 850); // 🚍 PKS Gdynia
            else if (agLower.includes('mzk') || agLower.includes('wejherowo')) maxPriority = Math.max(maxPriority, 800); // 🚌 MZK Wejherowo
            else if (agLower.includes('rail') || agLower.includes('pkp')) maxPriority = Math.max(maxPriority, 700);
        }
        return maxPriority;
    };

    // Jeśli zapytanie jest puste, zwróć popularne (historia + główne przystanki)
    if (!query) {
        const history = await getHistoryResults('');
        history.slice(0, 5).forEach(h => {
            const priority = getPriority(h.agencies, h.agency);
            suggestionsMap.set(h.name, { name: h.name, priority, agency: h.agency });
        });
        MAJOR_STOPS.forEach(s => {
            if (!suggestionsMap.has(s)) {
                suggestionsMap.set(s, { name: s, priority: 500 }); // Hub bonus (high, but lower than SKM)
            }
        });

        // Sortuj po priorytecie
        const result = Array.from(suggestionsMap.values())
            .sort((a, b) => b.priority - a.priority)
            .map(s => s.name)
            .slice(0, 10);

        return result;
    }

    // Wyszukaj pasujące przystanki (już posortowane przez calculateAdvancedScore z priorytetem agencji)
    const results = getLocalResults(query, allStops, {}, {});
    results.slice(0, 15).forEach(r => {
        const priority = getPriority(r.agencies, r.agency);
        if (!suggestionsMap.has(r.name)) {
            suggestionsMap.set(r.name, { name: r.name, priority, agency: r.agency });
        } else {
            // Update if this result has higher priority
            const existing = suggestionsMap.get(r.name)!;
            if (priority > existing.priority) {
                suggestionsMap.set(r.name, { name: r.name, priority, agency: r.agency });
            }
        }
    });

    // Sortuj po priorytecie (wyższy = wcześniej) - SKM first, then POLREGIO, then MZK
    const finalResults = Array.from(suggestionsMap.values())
        .sort((a, b) => b.priority - a.priority)
        .map(s => s.name)
        .slice(0, 10);


    return finalResults;
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
    performAdvancedSearch,
    getHistoryResults,
    getFavorites,
    addToHistory,
    addToFavorites,
    removeFromFavorites,
    clearHistory,
    getSuggestions
};
