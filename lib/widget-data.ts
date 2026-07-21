// Czyste transformacje surowych danych serwisów/WP do typów widgetów + fetcher
// treści (artykuły/wydarzenia) używany też przez self-fetch widgetu Android.
import * as he from 'he';
import type { WidgetWeather, WidgetAir, WidgetPost, WidgetEvent, ArticlesConfig } from './widget-shared';

const WP_BASE = 'https://kaszuby24.pl/wp-json';
const SPONSORED_CAT = 554;

/** Normalizacja OpenWeatherMap (current + forecast) do payloadu pogody. */
export function normalizeWeather(cur: any, forecast: any, updatedAt: string): WidgetWeather | null {
  if (!cur || !cur.main || !Array.isArray(cur.weather) || !cur.weather[0]) return null;
  // forecast.list[] to sloty 3h; hi/lo z najbliższych ~8 slotów (24h).
  let hi: number | null = null;
  let lo: number | null = null;
  const list: any[] = Array.isArray(forecast?.list) ? forecast.list.slice(0, 8) : [];
  for (const s of list) {
    const mx = s?.main?.temp_max;
    const mn = s?.main?.temp_min;
    if (typeof mx === 'number') hi = hi === null ? mx : Math.max(hi, mx);
    if (typeof mn === 'number') lo = lo === null ? mn : Math.min(lo, mn);
  }
  return {
    tempC: Math.round(cur.main.temp),
    icon: String(cur.weather[0].icon ?? '01d'),
    desc: String(cur.weather[0].description ?? ''),
    city: String(cur.name ?? ''),
    hi: hi === null ? null : Math.round(hi),
    lo: lo === null ? null : Math.round(lo),
    updatedAt,
  };
}

/** OWM Air Quality Index (1-5) → etykieta + kolor. */
export function aqiToStatus(aqi: number | null): { index: number | null; category: string | null; color: `#${string}` } {
  switch (aqi) {
    case 1:
      return { index: 1, category: 'Bardzo dobra', color: '#10B981' };
    case 2:
      return { index: 2, category: 'Dobra', color: '#84CC16' };
    case 3:
      return { index: 3, category: 'Umiarkowana', color: '#F59E0B' };
    case 4:
      return { index: 4, category: 'Zła', color: '#EF4444' };
    case 5:
      return { index: 5, category: 'Bardzo zła', color: '#7C3AED' };
    default:
      return { index: null, category: null, color: '#94A3B8' };
  }
}

function decodeTitle(t: any): string {
  const raw = typeof t === 'string' ? t : (t?.rendered ?? '');
  try {
    return he.decode(String(raw)).replace(/<[^>]*>/g, '').trim();
  } catch {
    return String(raw);
  }
}

function extractImage(p: any): string | undefined {
  if (typeof p?.featured_media_url === 'string' && p.featured_media_url) return p.featured_media_url;
  const media = p?._embedded?.['wp:featuredmedia'];
  if (Array.isArray(media) && media[0]?.source_url) return media[0].source_url;
  if (typeof p?.image === 'string' && p.image) return p.image;
  return undefined;
}

function firstCategoryName(p: any): string | undefined {
  const terms = p?._embedded?.['wp:term'];
  if (Array.isArray(terms)) {
    for (const group of terms) {
      if (Array.isArray(group) && group[0]?.name) return he.decode(String(group[0].name));
    }
  }
  if (typeof p?.category_name === 'string') return p.category_name;
  return undefined;
}

/** Mapowanie surowych postów (posts-filtered lub wp/v2) do WidgetPost. */
export function mapPosts(raw: any[]): WidgetPost[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && (p.id != null))
    .map((p) => ({
      id: Number(p.id),
      slug: String(p.slug ?? p.id),
      title: decodeTitle(p.title),
      imageUrl: extractImage(p),
      category: firstCategoryName(p),
      date: String(p.date ?? p.date_gmt ?? ''),
    }));
}

/** Mapowanie wydarzeń (wp/v2/kalendarz) do WidgetEvent. */
export function mapEvents(raw: any[]): WidgetEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && e.id != null)
    .map((e) => ({
      id: Number(e.id),
      slug: String(e.slug ?? e.id),
      title: decodeTitle(e.title),
      // Data startu z meta wydarzenia jeśli jest, inaczej data publikacji.
      startsAt: String(e?.meta?.event_start_date ?? e?.event_date ?? e.date ?? ''),
      location: typeof e?.meta?.event_location === 'string' ? e.meta.event_location : undefined,
    }));
}

async function fetchJson(url: string, timeoutMs = 12000): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Artykuły wg konfiguracji (powiat/dział). Zawsze zwraca [] przy błędzie. */
export async function fetchArticlesForWidget(cfg: ArticlesConfig, perPage = 4): Promise<WidgetPost[]> {
  const region = cfg.regionId ? `&region=${cfg.regionId}` : '';
  const dzial = cfg.dzialId ? `&dzial=${cfg.dzialId}` : '';
  const filteredUrl = `${WP_BASE}/kaszuby24/v1/posts-filtered?page=1&per_page=${perPage}${region}${dzial}`;
  try {
    const data = await fetchJson(filteredUrl);
    const posts = Array.isArray(data?.posts) ? data.posts : Array.isArray(data) ? data : [];
    if (posts.length > 0) return mapPosts(posts);
  } catch {
    /* fallthrough do wp/v2 */
  }
  // Fallback: standardowe wp/v2 z kategoriami (region+dział jako kategorie).
  const cats = [cfg.regionId, cfg.dzialId].filter((x): x is number => !!x);
  const catParam = cats.length ? `&categories=${cats.join(',')}` : '';
  const wpUrl = `${WP_BASE}/wp/v2/posts?_embed&per_page=${perPage}&orderby=date&order=desc&categories_exclude=${SPONSORED_CAT}${catParam}`;
  try {
    const arr = await fetchJson(wpUrl);
    return mapPosts(Array.isArray(arr) ? arr : []);
  } catch {
    return [];
  }
}

/** Najbliższe wydarzenia (opcjonalnie po regionie). Zawsze [] przy błędzie. */
export async function fetchEventsForWidget(regionId: number | null, perPage = 6): Promise<WidgetEvent[]> {
  const cat = regionId ? `&categories=${regionId}` : '';
  const url = `${WP_BASE}/wp/v2/kalendarz?_embed&per_page=${perPage}&orderby=date&order=desc${cat}`;
  try {
    const arr = await fetchJson(url);
    return mapEvents(Array.isArray(arr) ? arr : []);
  } catch {
    return [];
  }
}
