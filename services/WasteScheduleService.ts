import axios from 'axios';

// Source of truth: panel.kaszuby24.pl SQLite (managed in admin dashboard).
// Old WP plugin endpoint (kaszuby24.pl/wp-json/kaszuby24/v2) only ever held
// Reda — Puck and Gmina Puck were added straight to the panel.
const PRODUCTION_URL = 'https://panel.kaszuby24.pl/api/waste/wp';
const LOCAL_DEV_URL = 'http://192.168.1.XX/api/waste/wp'; // Zmień na IP swojego komputera

const API_BASE_URL = PRODUCTION_URL;

// Endpoint for the "Gdzie wyrzucić?" item search — still served from WP
// plugin, separate dataset from schedules. Kept as-is.
const WASTE_SEARCH_URL = 'https://kaszuby24.pl/wp-json/kaszuby24/v2/waste-search';
export { WASTE_SEARCH_URL };

export interface WasteRegion {
    id: string;
    name: string;
    streets: string[];
    schedule: {
        date: string;
        types: string[];
    }[];
}

export interface WasteScheduleData {
    city: string;
    updated_at?: string;
    regions: WasteRegion[];
    footer_text?: string;
    announcements_api_url?: string;
}

export interface City {
    id: string;
    name: string;
    active: boolean;
    news_api_url?: string;
    news_category_id?: number;
    // 'full' — small city, schedule preloaded for all regions.
    // 'search' — large city (Gdynia), use cascade pickers + per-region fetch.
    mode?: 'full' | 'search';
    regions?: number;
}

export interface BuildingResult {
    zabudowa: string;
    region_id: number;
    region_name: string;
    region_slug: string;
}

export interface WasteNewsArticle {
    id: number;
    date: string;
    title: { rendered: string };
    excerpt: { rendered: string };
    content: { rendered: string };
    featured_media_url?: string;
    link: string;
}

export const wasteScheduleService = {
    async getCities(): Promise<City[]> {
        try {
            // include_search=1 — opt in to receive 'search' mode cities (Gdynia).
            // The cascade picker handles those, so we want to see them.
            const response = await axios.get(`${API_BASE_URL}/cities`, { params: { include_search: 1 } });
            return response.data.map((city: any) => ({
                id: city.slug,
                name: city.name,
                active: city.active === undefined ? true : !!city.active,
                news_api_url: city.news_api_url,
                news_category_id: city.news_category_id,
                mode: city.mode,
                regions: city.regions,
            }));
        } catch (error) {
            console.error('[WasteSchedule] Error fetching cities:', error);
            return [
                {
                    id: 'reda', name: 'Reda', active: true,
                    news_api_url: 'https://miasto.reda.pl/wp-json/wp/v2',
                    news_category_id: 11, mode: 'full',
                },
            ];
        }
    },

    // For 'search' mode cities (Gdynia) we DON'T preload the multi-MB schedule.
    // Returns null and the UI shows the cascade picker.
    async getSchedule(cityId: string = 'reda', mode?: 'full' | 'search'): Promise<WasteScheduleData | null> {
        if (mode === 'search') {
            console.log(`[WasteSchedule] Skipping full fetch for search-mode city ${cityId}`);
            return null;
        }
        try {
            const timestamp = Date.now();
            console.log(`[WasteSchedule] Fetching for city: ${cityId} from panel`);
            const response = await axios.get(`${API_BASE_URL}/schedule`, {
                params: { city: cityId, _: timestamp },
                timeout: 10000,
            });
            const data = response.data;
            if (data && !data.footer_text && data.notes) {
                data.footer_text = data.notes;
            }
            return data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                console.error('[WasteSchedule] API Route not found (404).');
            } else {
                console.error('[WasteSchedule] Error:', error.message);
            }
            return null;
        }
    },

    // ── Cascade pickers (search-mode cities) ────────────────────────────────
    async getDzielnice(citySlug: string): Promise<string[]> {
        try {
            const r = await axios.get(`${API_BASE_URL.replace('/wp', '')}/cities/${encodeURIComponent(citySlug)}/dzielnice`, { timeout: 8000 });
            return r.data.dzielnice || [];
        } catch (e) { console.error('[WasteSchedule] dzielnice err:', e); return []; }
    },
    async getStreetsInDzielnica(citySlug: string, dzielnica: string): Promise<string[]> {
        try {
            const r = await axios.get(`${API_BASE_URL.replace('/wp', '')}/cities/${encodeURIComponent(citySlug)}/streets`, { params: { dzielnica }, timeout: 8000 });
            return r.data.streets || [];
        } catch (e) { console.error('[WasteSchedule] streets err:', e); return []; }
    },
    async getNumbers(citySlug: string, dzielnica: string, ulica: string): Promise<string[]> {
        try {
            const r = await axios.get(`${API_BASE_URL.replace('/wp', '')}/cities/${encodeURIComponent(citySlug)}/numbers`, { params: { dzielnica, ulica }, timeout: 8000 });
            return r.data.numbers || [];
        } catch (e) { console.error('[WasteSchedule] numbers err:', e); return []; }
    },
    async getBuildings(citySlug: string, dzielnica: string, ulica: string, numer: string): Promise<BuildingResult[]> {
        try {
            const r = await axios.get(`${API_BASE_URL.replace('/wp', '')}/cities/${encodeURIComponent(citySlug)}/buildings`, { params: { dzielnica, ulica, numer }, timeout: 8000 });
            return r.data.buildings || [];
        } catch (e) { console.error('[WasteSchedule] buildings err:', e); return []; }
    },
    async getRegionWithSchedule(regionId: string | number): Promise<WasteScheduleData | null> {
        try {
            const r = await axios.get(`${API_BASE_URL}/regions/${encodeURIComponent(String(regionId))}`, { timeout: 10000 });
            // Wrap single region in WasteScheduleData shape
            const d = r.data;
            return {
                city: d.city_name || d.city_slug || '',
                regions: [{ id: d.id, name: d.name, streets: d.streets || [], schedule: d.schedule || [] }],
            };
        } catch (e: any) {
            console.error('[WasteSchedule] region err:', e.message);
            return null;
        }
    },
    // Address text-search (debounced) — used for free-text fallback when cascade
    // picker is too clicky.
    async searchAddress(citySlug: string, query: string, limit = 20): Promise<Array<{ address_text: string; region_id: number; region_name: string; region_slug: string }>> {
        try {
            const r = await axios.get(`${API_BASE_URL.replace('/wp', '')}/cities/${encodeURIComponent(citySlug)}/search-address`, { params: { q: query, limit }, timeout: 8000 });
            return r.data.results || [];
        } catch (e) { console.error('[WasteSchedule] search-address err:', e); return []; }
    },

    async getStreets(data: WasteScheduleData): Promise<{ street: string; regionId: string }[]> {
        const streets: { street: string; regionId: string }[] = [];
        data.regions.forEach(region => {
            region.streets.forEach(street => {
                streets.push({ street, regionId: region.id });
            });
        });
        return streets.sort((a, b) => a.street.localeCompare(b.street));
    },

    async getNewsArticles(newsApiUrl: string, categoryId?: number, perPage: number = 5): Promise<WasteNewsArticle[]> {
        try {
            if (!newsApiUrl) {
                console.log('[WasteSchedule] No news API URL configured for this city');
                return [];
            }

            const timestamp = Date.now();
            let url = `${newsApiUrl}/posts?per_page=${perPage}&_embed&_=${timestamp}`;
            
            if (categoryId) {
                url += `&categories=${categoryId}`;
            }

            console.log('[WasteSchedule] Fetching news from:', url);

            const response = await axios.get(url, {
                timeout: 10000
            });

            const articles: WasteNewsArticle[] = response.data.map((post: any) => ({
                id: post.id,
                date: post.date,
                title: post.title,
                excerpt: post.excerpt,
                content: post.content,
                featured_media_url: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
                link: post.link
            }));

            return articles;
        } catch (error: any) {
            console.error('[WasteSchedule] Error fetching news articles:', error.message);
            return [];
        }
    },

    async getAnnouncements(cityId: string = 'reda'): Promise<any[]> {
        // The panel doesn't have a separate announcements endpoint —
        // announcements come through `news_api_url` per-city (handled by
        // getNewsArticles). Keep this for API compatibility, return empty.
        return [];
    }
};

// ── Per-city UI mode ──────────────────────────────────────────────────────
//
//   streets   — single (or street-based) regions: "Wpisz ulicę" + region picker
//   villages  — Gmina Puck: 1 region = group of villages sharing one schedule;
//               UI exposes each village as its own search item
//   reda      — Reda: same street can fall into "Jednorodzinne — Rejon X" OR
//               "Wielorodzinne (bloki)"; UI must ask for building type when
//               street is ambiguous
//
// Hardcoded by slug — explicit beats sniffing region labels (panel admin can
// rename them and we'd silently break behavior).
export type WasteUiMode = 'streets' | 'villages' | 'reda';

const CITY_UI_MODE: Record<string, WasteUiMode> = {
    'gmina-puck': 'villages',
    reda: 'reda',
};

export function getCityUiMode(slug: string): WasteUiMode {
    return CITY_UI_MODE[slug] || 'streets';
}

// Strip diacritics + lower for fuzzy match ("Świętopełka" matches "swietopelka").
export function normalizeWasteSearch(s: string): string {
    return s
        .toLowerCase()
        .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
        .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
        .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// Title-case a SCREAMING village name from the panel (e.g. "BRUDZEWO" → "Brudzewo").
export function prettyVillageName(s: string): string {
    return s.replace(/\b([A-ZĄĆĘŁŃÓŚŹŻ])([A-ZĄĆĘŁŃÓŚŹŻ\s-]*)\b/g, (_, a, b) => a + b.toLowerCase());
}

// For Gmina Puck: a region is a *group* of villages sharing one schedule.
// User searches by single village → we map to the parent region.
export interface VillageItem {
    village: string;
    pretty: string;
    regionId: string;
    groupSiblings: string[];
}

export function expandVillages(regions: WasteRegion[]): VillageItem[] {
    const out: VillageItem[] = [];
    for (const r of regions) {
        for (const v of r.streets) {
            out.push({
                village: v,
                pretty: prettyVillageName(v),
                regionId: r.id,
                groupSiblings: r.streets.filter((s) => s !== v).map(prettyVillageName),
            });
        }
    }
    return out.sort((a, b) => a.pretty.localeCompare(b.pretty, 'pl'));
}

// For Reda: the same street can appear in "Jednorodzinne — Rejon X" AND in
// "Wielorodzinne (bloki)". Returns per-street availability.
export interface RedaStreetMatch {
    street: string;
    jednorodzinne?: { regionId: string; regionName: string };
    wielorodzinne?: { regionId: string; regionName: string };
}

// Flat list — one entry per (street + building-type). Streets with both types
// appear twice with the type clearly shown — no modal step needed.
export interface RedaStreetEntry {
    street: string;
    type: 'jednorodzinna' | 'wielorodzinna';
    regionId: string;
    regionName: string;
}

export function groupRedaStreets(regions: WasteRegion[]): RedaStreetMatch[] {
    const map = new Map<string, RedaStreetMatch>();
    for (const r of regions) {
        const isMulti = /wielorodzin/i.test(r.name);
        for (const street of r.streets) {
            const key = normalizeWasteSearch(street);
            const existing = map.get(key) || { street };
            const ref = { regionId: r.id, regionName: r.name };
            if (isMulti) existing.wielorodzinne = ref;
            else existing.jednorodzinne = ref;
            if (!map.has(key)) existing.street = street;
            map.set(key, existing);
        }
    }
    return [...map.values()].sort((a, b) => a.street.localeCompare(b.street, 'pl'));
}

// Flatten Reda regions into a list where streets with both building types
// appear as TWO separate entries. Lets the user pick directly without modal.
export function flattenRedaStreets(regions: WasteRegion[]): RedaStreetEntry[] {
    const out: RedaStreetEntry[] = [];
    for (const r of regions) {
        const type: 'jednorodzinna' | 'wielorodzinna' = /wielorodzin/i.test(r.name) ? 'wielorodzinna' : 'jednorodzinna';
        for (const street of r.streets) {
            out.push({ street, type, regionId: r.id, regionName: r.name });
        }
    }
    return out.sort((a, b) => {
        const s = a.street.localeCompare(b.street, 'pl');
        return s !== 0 ? s : a.type.localeCompare(b.type);
    });
}

// Returns the wielorodzinne region (if exists) — used for the "I live in a
// block" fast-path button in Reda.
export function findWielorodzinneRegion(data: WasteScheduleData | null): WasteRegion | null {
    if (!data) return null;
    return data.regions.find((r) => /wielorodzin/i.test(r.name)) || null;
}
