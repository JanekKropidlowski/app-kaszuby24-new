/**
 * Serwis jakości powietrza — WordPress cache + Airly, ESA OSE, Open-Meteo
 *
 * Preferuje dane z serwera WordPress (kaszuby24-air-quality plugin),
 * gdzie dane są cache'owane co 3h — zero limitów per-user, szybko, stabilnie.
 * Fallback: bezpośrednie Airly + ESA.
 */

// Endpoint WordPress z cache stacji (plugin kaszuby24-air-quality)
const WP_AQ_URL = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/air-quality';

const OPEN_METEO_AQ_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const AIRLY_BASE_URL = 'https://airapi.airly.eu/v2';
const AIRLY_API_KEY = 'LHWyPaH8nWElauKB3nHs5sQ66UnCs9Ph';
const ESA_BASE_URL = 'https://public-esa.ose.gov.pl/api/v1/smog';

const TIMEOUT_MS = 5000;

// Całe woj. pomorskie w przybliżeniu (szeroka lista do API ESA)
const POMORSKIE_CITIES = [
    'GDYNIA', 'PUCK', 'WEJHEROWO', 'REDA', 'RUMIA', 'KARTUZY', 'KOŚCIERZYNA', 'ŻUKOWO', 'GDAŃSK', 'SOPOT',
    'TCZEW', 'STAROGARD GDAŃSKI', 'CHOJNICE', 'MALBORK', 'KWIDZYN', 'SŁUPSK', 'LĘBORK', 'BYTÓW', 'WŁADYSŁAWOWO', 'PRUSZCZ GDAŃSKI', 'ŻELISTRZEWO', 'STARZYNO',
    'HEL', 'JASTARNIA', 'JURATA', 'ŁEBA', 'USTKA', 'KOSAKOWO', 'MOSTY', 'SIERAKOWICE', 'PRZODKOWO', 'SZEMUD'
];

// ---------------------------------------------------------------------------
// Typy danych
// ---------------------------------------------------------------------------

export type DataSource = 'AIRLY' | 'ESA' | 'OPEN_METEO';

export interface StationBase {
    id: string | number;
    name: string;
    city: string;
    lat: number;
    lon: number;
    address?: string;
    sponsor?: string;
    sponsorLogo?: string | null;
    sponsorLink?: string | null;
}

export interface AqIndex {
    stationId: string | number | null;
    indexValue: number | null; // Główna wartość (CAQI, PM10, AQI) do kolorowania mapy/listy
    indexCategory: string | null;
    indexDescription: string | null; // Czytelny opis np. z Airly ("Air quality is good today!")
    indexDate: string | null;

    pm1Value: number | null;
    pm10Value: number | null;
    pm10Category: string | null;
    pm25Value: number | null;
    pm25Category: string | null;
    so2Value: number | null;
    no2Value: number | null;
    o3Value: number | null;
    coValue: number | null;
    advice: string | null;
    standards: Array<{
        name: string;
        pollutant: string;
        limit: number;
        percent: number;
    }> | null;

    // Dane pogodowe
    temperature: number | null;
    humidity: number | null;
    pressure: number | null;
    windSpeed: number | null;

    source: DataSource;
}

export interface AveragedValues {
    fromDateTime: string;
    tillDateTime: string;
    values: Array<{ name: string; value: number }>;
    indexes?: Array<{
        name: string;
        value: number;
        level: string;
        description: string;
        advice?: string;
        color: string;
    }>;
    standards?: Array<{
        name: string;
        pollutant: string;
        limit: number;
        percent: number;
    }>;
}

export interface AqStationResult extends StationBase {
    index: AqIndex | null;
    error?: string;
    distance?: number;
    source: DataSource;
    statusOk?: boolean;
    history?: AveragedValues[];
    forecast?: AveragedValues[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fetchWithTimeout(url: string, options: RequestInit = {}, ms: number = TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);

    // Dodajemy standardowy User-Agent, aby uniknąć 403 Forbidden od filtrów Nginx/WAF
    const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        ...(options.headers || {})
    };

    return fetch(url, { ...options, headers, signal: controller.signal }).finally(() => clearTimeout(id));
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Airly API
// ---------------------------------------------------------------------------

// Cache Airly na 3 godziny — Airly free tier: 100 req/dzień
// 8 stacji × (24h/3h) = max 64 req/dzień → bezpieczny margines
const AIRLY_CACHE_TTL = 3 * 60 * 60 * 1000;
let airlyCache: { data: AqStationResult[]; ts: number; key: string } | null = null;

export async function fetchNearestAirly(lat: number, lon: number, maxCount = 20): Promise<AqStationResult[]> {
    const cacheKey = `${lat.toFixed(1)}_${lon.toFixed(1)}`;
    const now = Date.now();
    if (airlyCache && airlyCache.key === cacheKey && now - airlyCache.ts < AIRLY_CACHE_TTL) {
        return airlyCache.data;
    }

    try {
        // Max 8 stacji → max 9 requestów na odświeżenie (cache 3h → ~64 req/dzień)
        const res = await fetchWithTimeout(
            `${AIRLY_BASE_URL}/installations/nearest?lat=${lat}&lng=${lon}&maxDistanceKM=100&maxResults=${maxCount}`,
            { headers: { 'Accept': 'application/json', 'apikey': AIRLY_API_KEY, 'Accept-Language': 'pl' } },
            8000
        );
        if (!res.ok) {
            console.warn('Airly installations error:', res.status);
            return [];
        }
        const installations: any[] = await res.json();
        if (!Array.isArray(installations) || installations.length === 0) return [];

        // ✅ RÓWNOLEGŁE fetche pomiarów (max 8 jednocześnie, podział na batche)
        const BATCH_SIZE = 8;
        const results: AqStationResult[] = [];

        for (let i = 0; i < installations.length; i += BATCH_SIZE) {
            const batch = installations.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.allSettled(
                batch.map(async (inst: any) => {
                    const measureRes = await fetchWithTimeout(
                        `${AIRLY_BASE_URL}/measurements/installation?installationId=${inst.id}`,
                        { headers: { 'Accept': 'application/json', 'apikey': AIRLY_API_KEY, 'Accept-Language': 'pl' } },
                        5000
                    );
                    if (!measureRes.ok) return null;
                    const measData = await measureRes.json();
                    const current = measData.current;
                    if (!current) return null;

                    const values = current.values || [];
                    const findVal = (name: string) => values.find((v: any) => v.name === name)?.value ?? null;

                    const pm10 = findVal('PM10');
                    const pm25 = findVal('PM25');
                    const pm1 = findVal('PM1');
                    const no2 = findVal('NO2');
                    const so2 = findVal('SO2');
                    const o3 = findVal('O3');
                    const co = findVal('CO');
                    const temperature = findVal('TEMPERATURE');
                    const humidity = findVal('HUMIDITY');
                    const pressure = findVal('PRESSURE');
                    const windSpeed = findVal('WIND_SPEED');

                    // Indeks CAQI z Airly (indexes[0])
                    const indexObj = current.indexes?.[0];

                    // displayAddress1 = ulica/POI, displayAddress2 = dzielnica/gmina
                    // Preferuj ulicę, potem POI, potem miasto — unikamy "Gmina Pucka" jako nazwy stacji
                    const city = inst.address?.city || inst.address?.displayAddress2 || '';
                    const street = inst.address?.street || inst.address?.displayAddress1 || '';
                    const name = street || (city !== inst.address?.displayAddress2 ? inst.address?.displayAddress2 : '') || city || `Czujnik ${inst.id}`;
                    const address = [city, street].filter(Boolean).join(', ');
                    const sponsorObj = inst.sponsor;
                    const distance = calculateDistance(lat, lon, inst.location.latitude, inst.location.longitude);

                    return {
                        id: inst.id,
                        name,
                        city,
                        lat: inst.location.latitude,
                        lon: inst.location.longitude,
                        address,
                        sponsor: sponsorObj?.displayName || sponsorObj?.name || 'Airly',
                        distance,
                        index: {
                            stationId: inst.id,
                            indexValue: indexObj?.value ?? pm10 ?? null,
                            indexCategory: indexObj?.level ? airlyLevelToCategory(indexObj.level) : (pm10 ? getEsaCategoryByPm10equiv(pm10) : null),
                            indexDescription: indexObj?.description || null,
                            indexDate: current.tillDateTime,
                            pm1Value: pm1,
                            pm10Value: pm10,
                            pm10Category: null,
                            pm25Value: pm25,
                            pm25Category: null,
                            coValue: co,
                            no2Value: no2,
                            so2Value: so2,
                            o3Value: o3,
                            advice: indexObj?.advice || null,
                            standards: current.standards || null,
                            temperature,
                            humidity,
                            pressure,
                            windSpeed,
                            source: 'AIRLY',
                        },
                        statusOk: true,
                        source: 'AIRLY',
                        history: measData.history || [],
                        forecast: measData.forecast || []
                    } as AqStationResult;
                })
            );

            for (const r of batchResults) {
                if (r.status === 'fulfilled' && r.value) results.push(r.value);
            }
        }

        airlyCache = { data: results, ts: Date.now(), key: cacheKey };
        return results;
    } catch (e) {
        console.warn('Airly fetch failed', e);
        return airlyCache?.data ?? [];
    }
}

// Pomocnicza: przybliżona kategoria na bazie PM10 gdy Airly nie poda indeksu CAQI
export function getEsaCategoryByPm10equiv(pm10: number): string {
    if (pm10 <= 20) return 'Bardzo dobra';
    if (pm10 <= 50) return 'Dobra';
    if (pm10 <= 80) return 'Umiarkowana';
    if (pm10 <= 110) return 'Zła';
    return 'Bardzo zła';
}

function airlyLevelToCategory(level: string | null): string {
    switch (level?.toUpperCase()) {
        case 'VERY_LOW': return 'Bardzo dobra';
        case 'LOW': return 'Dobra';
        case 'MEDIUM': return 'Średnia';
        case 'HIGH': return 'Zła';
        case 'VERY_HIGH': return 'Bardzo zła';
        case 'EXTREME': return 'Skrajnie zła';
        default: return 'Nieznana';
    }
}

// Tłumaczy kategorie które mogły zostać zapisane w WP cache w angielskiej formie
function translateCategoryIfNeeded(cat: string | null): string | null {
    if (!cat) return null;
    const upper = cat.toUpperCase();
    switch (upper) {
        case 'VERY_LOW': return 'Bardzo dobra';
        case 'LOW': return 'Dobra';
        case 'MEDIUM': return 'Średnia';
        case 'HIGH': return 'Zła';
        case 'VERY_HIGH': return 'Bardzo zła';
        case 'EXTREME': return 'Skrajnie zła';
        case 'UNKNOWN': return 'Nieznana';
        default: return cat; // już po polsku lub inny format
    }
}

// ---------------------------------------------------------------------------
// ESA OSE API (Szkoły)
// ---------------------------------------------------------------------------

let cachedEsaData: any = null;
let lastEsaFetchTime: number = 0;

export async function fetchEsaSmog(lat: number, lon: number, maxCount = 50): Promise<AqStationResult[]> {
    try {
        const now = Date.now();
        // ESA data updates every 15-30 mins, we can cache it for 5 mins locally
        if (!cachedEsaData || now - lastEsaFetchTime > 5 * 60 * 1000) {
            const res = await fetchWithTimeout(ESA_BASE_URL);
            if (!res.ok) return [];
            const data = await res.json();
            cachedEsaData = data.smog_data || [];
            lastEsaFetchTime = now;
        }

        if (!cachedEsaData) return [];

        // Filtrowanie szerzej do całego Pomorza
        const localSchools = cachedEsaData.filter((item: any) => {
            const city = (item.school?.city || '').toUpperCase();
            return POMORSKIE_CITIES.some((c: string) => city.includes(c));
        });

        // Sortowanie wszystkich okolicznych wg dystansu
        const schoolsWithDistance = localSchools.map((item: any) => {
            const slong = parseFloat(item.school.longitude);
            const slat = parseFloat(item.school.latitude);
            return {
                ...item,
                slat,
                slong,
                distance: calculateDistance(lat, lon, slat, slong)
            };
        });

        schoolsWithDistance.sort((a: any, b: any) => a.distance - b.distance);

        const results: AqStationResult[] = [];
        const topSchools = schoolsWithDistance.slice(0, maxCount);

        for (const s of topSchools) {
            const pm10 = s.data?.pm10_avg ?? null;
            const pm25 = s.data?.pm25_avg ?? null;

            // ESA nie daje CAQI, tworzymy przybliżenie na bazie normy PM10 (norma dobowa = 50)
            let aqi = null;
            let cat = null;
            if (pm10 !== null) {
                aqi = pm10; // dla ESA traktujemy PM10 jako wyznacznik
                cat = getEsaCategoryByPm10(pm10);
            }

            results.push({
                id: `esa-${s.school?.post_code}-${s.school?.name}`,
                name: s.school?.name || 'Miernik ESA',
                city: s.school?.city || '',
                address: `${s.school?.city}, ${s.school?.street}`,
                lat: s.slat,
                lon: s.slong,
                sponsor: 'ESA / NASK',
                distance: s.distance,
                index: {
                    stationId: null,
                    indexValue: s.data.pm10_avg || null,
                    indexCategory: getEsaCategoryByPm10(s.data.pm10_avg),
                    indexDescription: null,
                    indexDate: new Date().toISOString(),
                    pm1Value: null,
                    pm10Value: s.data.pm10_avg || null,
                    pm10Category: null,
                    pm25Value: s.data.pm25_avg || null,
                    pm25Category: null,
                    so2Value: null,
                    no2Value: null,
                    o3Value: null,
                    coValue: null,
                    advice: null,
                    standards: null,
                    temperature: s.data.temperature || null,
                    humidity: s.data.humidity || null,
                    pressure: s.data.pressure || null,
                    windSpeed: s.data.wind_speed || null,
                    source: 'ESA',
                },
                source: 'ESA',
                statusOk: true
            });
        }
        return results;

    } catch (e) {
        console.warn('ESA fetch failed', e);
        return [];
    }
}

function getEsaCategoryByPm10(pm10: number): string {
    if (pm10 <= 20) return 'Bardzo dobra';
    if (pm10 <= 50) return 'Dobra';
    if (pm10 <= 80) return 'Średnia';
    if (pm10 <= 110) return 'Zła';
    return 'Bardzo zła';
}

// ---------------------------------------------------------------------------
// Pobieranie siatki (Heatmapa regionalna)
// ---------------------------------------------------------------------------

// Cache siatki Open-Meteo na 30 minut — dane Copernicus/CAMS aktualizowane co ~1h
const GRID_CACHE_TTL = 30 * 60 * 1000;
let gridCache: { data: AqIndex[]; ts: number; key: string } | null = null;

export async function fetchAirQualityGrid(
    userLat: number,
    userLon: number,
    gridSize = 7, // 7×7 = 49 punktów — wystarczające pokrycie całego woj. pomorskiego
    stepSize = 0.12 // ~13 km/krok → zasięg ±3 kroki = ±39 km od centrum
): Promise<AqIndex[]> {
    const cacheKey = `${userLat.toFixed(1)}_${userLon.toFixed(1)}_${gridSize}`;
    const now = Date.now();
    if (gridCache && gridCache.key === cacheKey && now - gridCache.ts < GRID_CACHE_TTL) {
        return gridCache.data;
    }
    const points: { lat: number; lon: number }[] = [];
    const half = Math.floor(gridSize / 2);

    for (let i = -half; i <= half; i++) {
        for (let j = -half; j <= half; j++) {
            points.push({
                lat: userLat + i * stepSize,
                lon: userLon + j * stepSize
            });
        }
    }

    try {
        const lats = points.map(p => p.lat).join(',');
        const lons = points.map(p => p.lon).join(',');

        const params = new URLSearchParams({
            latitude: lats,
            longitude: lons,
            current: 'european_aqi,pm10,pm2_5',
            timezone: 'auto',
        });

        const res = await fetchWithTimeout(`${OPEN_METEO_AQ_URL}?${params.toString()}`, {}, TIMEOUT_MS);
        if (!res.ok) return [];

        const data = await res.json();
        const results = Array.isArray(data) ? data : [data];

        const mapped: AqStationResult[] = results.map((d: any, idx: number) => ({
            id: `grid_${idx}`,
            name: `Punkt ${idx + 1}`,
            city: 'Gatka', // Placeholder, as Open-Meteo grid points don't have cities
            lat: points[idx].lat,
            lon: points[idx].lon,
            index: {
                stationId: null,
                indexValue: d.current.european_aqi || null,
                indexCategory: openMeteoAqiToCategory(d.current.european_aqi),
                indexDescription: null,
                indexDate: d.current.time,
                pm1Value: null,
                pm10Value: d.current.pm10 || null,
                pm10Category: null,
                pm25Value: d.current.pm2_5 || null,
                pm25Category: null,
                so2Value: null,
                no2Value: null,
                o3Value: null,
                coValue: null,
                advice: null,
                standards: null,
                temperature: null,
                humidity: null,
                pressure: null,
                windSpeed: null,
                source: 'OPEN_METEO' as DataSource,
            },
            statusOk: true,
            source: 'OPEN_METEO' as DataSource,
        }));

        gridCache = { data: mapped.map(r => r.index!), ts: Date.now(), key: cacheKey }; // Store only AqIndex for grid
        return mapped.map(r => r.index!);
    } catch (e) {
        console.warn('Grid fetch failed:', e);
        return gridCache?.data ?? [];
    }
}

function openMeteoAqiToCategory(aqi: number): string {
    if (aqi <= 20) return 'Bardzo dobra';
    if (aqi <= 40) return 'Dobra';
    if (aqi <= 60) return 'Średnia';
    if (aqi <= 80) return 'Dostateczna';
    if (aqi <= 100) return 'Zła';
    return 'Bardzo zła';
}

// ---------------------------------------------------------------------------
// WordPress Cache Endpoint (główne źródło)
// ---------------------------------------------------------------------------

// Lokalny cache odpowiedzi WP — 3h TTL (dopasowany do interwału cron na serwerze)
const WP_CACHE_TTL = 3 * 60 * 60 * 1000;
let wpCache: { data: AqStationResult[]; ts: number; key: string } | null = null;

async function fetchFromWordPress(lat: number, lon: number, radiusKm = 80): Promise<AqStationResult[]> {
    const cacheKey = `wp_${lat.toFixed(1)}_${lon.toFixed(1)}`;
    const now = Date.now();
    if (wpCache && wpCache.key === cacheKey && now - wpCache.ts < WP_CACHE_TTL) {
        return wpCache.data;
    }

    try {
        const res = await fetchWithTimeout(
            `${WP_AQ_URL}?lat=${lat}&lon=${lon}&radius=${radiusKm}`,
            {}, 8000
        );
        if (!res.ok) return [];

        const json = await res.json();
        const rawStations: any[] = json.stations ?? [];
        if (!rawStations.length) return [];

        const results: AqStationResult[] = rawStations.map((s: any) => ({
            id: s.id,
            name: s.name,
            city: s.city,
            address: s.address ?? '',
            lat: s.lat,
            lon: s.lon,
            sponsor: s.sponsor || (s.source === 'ESA' ? 'ESA / NASK' : 'Airly'),
            sponsorLogo: s.sponsor_logo,
            sponsorLink: s.sponsor_link,
            distance: calculateDistance(lat, lon, s.lat, s.lon),
            history: s.history || [],
            forecast: s.forecast || [],
            source: (s.source ?? 'UNKNOWN') as DataSource, // Added top-level source
            index: s.index ? {
                stationId: s.index.stationId,
                indexValue: s.index.indexValue,
                indexCategory: translateCategoryIfNeeded(s.index.indexCategory),
                indexDescription: s.index.indexDescription,
                indexDate: s.index.indexDate,
                pm1Value: s.index.pm1Value || null,
                pm10Value: s.index.pm10Value,
                pm10Category: s.index.pm10Category || null,
                pm25Value: s.index.pm25Value,
                pm25Category: s.index.pm25Category || null,
                so2Value: s.index.so2Value,
                no2Value: s.index.no2Value,
                o3Value: s.index.o3Value,
                coValue: s.index.coValue,
                advice: s.advice || null,
                standards: s.standards || null,
                temperature: s.index.temperature,
                humidity: s.index.humidity,
                pressure: s.index.pressure,
                windSpeed: s.index.windSpeed,
                statusOk: true,
                source: (s.source ?? 'ESA') as any,
            } : null,
        }));

        results.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        wpCache = { data: results, ts: now, key: cacheKey };
        return results;
    } catch (e) {
        console.warn('[AQ] WordPress fetch failed:', e);
        return wpCache?.data ?? [];
    }
}

// ---------------------------------------------------------------------------
// Unified Endpoint
// ---------------------------------------------------------------------------

export async function fetchNearestCombinedAirQuality(
    lat: number,
    lon: number,
    totalStationsLimit = 100
): Promise<AqStationResult[]> {
    // Priorytet: WordPress server cache (zero limitów, szybko)
    const wpResults = await fetchFromWordPress(lat, lon, 100);
    if (wpResults.length > 0) {
        return wpResults.slice(0, totalStationsLimit);
    }

    // Fallback: bezpośrednie Airly + ESA (gdy WP niedostępne)
    const [airlyResults, esaResults] = await Promise.all([
        fetchNearestAirly(lat, lon, 25), // Increased from 8 to 25 for better coverage
        fetchEsaSmog(lat, lon, 40) // Increased from 30 to 40
    ]);

    const combined = [...airlyResults, ...esaResults];
    combined.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    return combined.slice(0, totalStationsLimit);
}

// Map compatibility
export async function fetchNearestAirQuality(lat: number, lon: number, maxStations = 100): Promise<AqStationResult[]> {
    return fetchNearestCombinedAirQuality(lat, lon, maxStations);
}


// ---------------------------------------------------------------------------
// Helpers dla Kolorów, Emoji, Opisów
// ---------------------------------------------------------------------------

export function aqCategoryToColor(category: string | null): string {
    if (!category) return '#9E9E9E';

    const c = category.toUpperCase();

    // Mapowanie kolorów (Airly + ESA + Open-Meteo)
    if (c === 'VERY_LOW' || c.includes('BARDZO DOBR') || c.includes('GREAT') || c.includes('EXCELLENT') || c.includes('PERFECT') || c.includes('WELL')) return '#1A9641';
    if (c === 'LOW' || c.includes('DOBR') || c.includes('GOOD')) return '#52B74E';
    if (c === 'MEDIUM' || c.includes('ŚREDN') || c.includes('UMIARKOW') || c.includes('MODERATE')) return '#F5D327';
    if (c === 'HIGH' || c.includes('DOSTATECZ') || c.includes('UNHEALTHY') && !c.includes('VERY')) return '#F08D21';
    if (c === 'VERY_HIGH' || c.includes('BARDZO ZŁ') || c.includes('VERY BAD') || c.includes('VERY UNHEALTHY')) return '#E02020';
    if (c === 'EXTREME' || c.includes('SKRAJN') || c.includes('ZŁ') || c.includes('HAZARDOUS')) return '#7D1B7E';

    return '#1A9641'; // default
}

export function aqCategoryToEmoji(category: string | null): string {
    if (!category) return '❓';
    const c = category.toLowerCase();

    if (c.includes('bardzo dobr') || c.includes('very low') || c.includes('good') || c.includes('great') || c.includes('perfect') || c.includes('excellent')) return '😊';
    if (c.includes('dobr') || c.includes('low')) return '🙂';
    if (c.includes('średnia') || c.includes('medium') || c.includes('better') || c.includes('moderate')) return '😐';
    if (c.includes('dostatecz') || (c.includes('unhealthy') && !c.includes('very')) || (c.includes('high') && !c.includes('very'))) return '😷';
    if (c.includes('bardzo zł') || c.includes('very high') || c.includes('very unhealthy')) return '🤢';
    if (c.includes('skrajnie') || c.includes('extreme') || c.includes('zł') || c.includes('bad') || c.includes('hazardous')) return '☠️';

    return '🙂';
}

export function aqCategoryToDescription(category: string | null): string {
    if (!category) return 'Brak informacji z tej stacji.';

    const c = category.toLowerCase();

    // Mapowanie angielskich opisów Airly na polski
    if (c.includes('well') && c.includes('better')) return 'Jakość powietrza jest średnia. Bywało lepiej, ale nie jest źle.';
    if (c.includes('good') && c.includes('today')) return 'Dzisiaj jakość powietrza jest dobra! Ciesz się świeżym powietrzem.';
    if (c.includes('stay') && c.includes('indoor')) return 'Jakość powietrza jest bardzo zła. Zalecamy pozostanie w pomieszczeniach.';
    if (c.includes('take') && (c.includes('care') || c.includes('mask'))) return 'Jakość powietrza jest dostateczna. Osoby wrażliwe powinny uważać.';
    if (c.includes('perfect') || (c.includes('air') && c.includes('quality') && c.includes('good'))) return 'Idealne warunki na spacer i aktywność na zewnątrz!';
    if (c.includes('sensitive') && c.includes('groups')) return 'Jakość powietrza jest średnia. Osoby wrażliwe powinny uważać.';
    if (c.includes('unhealthy')) return 'Powietrze jest niezdrowe. Ogranicz przebywanie na zewnątrz.';

    if (c.includes('bardzo dobr')) return 'Jakość powietrza jest doskonała. Możesz swobodnie przebywać na zewnątrz.';
    if (c.includes('dobr')) return 'Jakość powietrza jest dobra. Aktywność na zewnątrz nie stwarza ryzyka.';
    if (c.includes('średni')) return 'Jakość powietrza jest średnia. Osoby wrażliwe (dzieci, seniorzy, chorzy) powinny ograniczyć aktywność.';
    if (c.includes('dostatecz')) return 'Jakość powietrza jest dostateczna. Zaleca się ograniczenie czasu spędzanego na zewnątrz.';
    if (c.includes('bardzo zł')) return 'Jakość powietrza jest bardzo zła. Pozostań w pomieszczeniach!';
    if (c.includes('zł') || c.includes('skrajn')) return 'Jakość powietrza jest zła. Unikaj długiego przebywania na zewnątrz.';

    return category; // fallback
}

export function pollutantLabel(code: string | null): string {
    const map: Record<string, string> = {
        PYL: 'Pył PM',
        PM10: 'Pył PM10',
        PM25: 'Pył PM2.5',
        'PM2.5': 'Pył PM2.5',
        SO2: 'Dwutlenek siarki',
        NO2: 'Dwutlenek azotu',
        O3: 'Ozon',
        CO: 'Tlenek węgla',
        C6H6: 'Benzen',
    };
    return code ? (map[code] ?? code) : '';
}
