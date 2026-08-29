// Czyste transformacje surowych danych serwisów/WP do typów widgetów + fetcher
// treści (artykuły/wydarzenia) używany też przez self-fetch widgetu Android.
import * as he from 'he';
import type { WidgetWeather, WidgetAir, WidgetPost, WidgetEvent, ArticlesConfig } from './widget-shared';

const WP_BASE = 'https://kaszuby24.pl/wp-json';
const SPONSORED_CAT = 554;

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

function wmoToIcon(code: number, day: boolean): string {
  const s = day ? 'd' : 'n';
  if (code === 0) return `01${s}`;
  if (code === 1 || code === 2) return `02${s}`;
  if (code === 3) return `04${s}`;
  if (code === 45 || code === 48) return `50${s}`;
  if (code >= 51 && code <= 67) return `10${s}`;
  if (code >= 71 && code <= 77) return `13${s}`;
  if (code >= 80 && code <= 82) return `09${s}`;
  if (code >= 95) return `11${s}`;
  return `03${s}`;
}
function wmoToDesc(code: number): string {
  if (code === 0) return 'Bezchmurnie';
  if (code <= 2) return 'Częściowe zachmurzenie';
  if (code === 3) return 'Zachmurzenie';
  if (code === 45 || code === 48) return 'Mgła';
  if (code >= 51 && code <= 57) return 'Mżawka';
  if (code >= 61 && code <= 67) return 'Deszcz';
  if (code >= 71 && code <= 77) return 'Śnieg';
  if (code >= 80 && code <= 82) return 'Przelotny deszcz';
  if (code >= 95) return 'Burza';
  return 'Pochmurno';
}
// Normalizacja odpowiedzi weatherService.fetchForecast (Open-Meteo, current_weather=true)
export function normalizeOpenMeteo(data: any, city: string, updatedAt: string): WidgetWeather | null {
  const cw = data?.current_weather;
  if (!cw || typeof cw.temperature !== 'number') return null;

  // Pasek godzinowy (styl à la Yandex): od bieżącej godziny co 3h, max 6 punktów.
  const hours: WidgetWeather['hours'] = [];
  let feels: number | null = null;
  const ht: string[] = data?.hourly?.time ?? [];
  const temps: number[] = data?.hourly?.temperature_2m ?? [];
  const codes: number[] = data?.hourly?.weathercode ?? [];
  const apparent: number[] = data?.hourly?.apparent_temperature ?? [];
  if (ht.length && cw.time) {
    // Open-Meteo zwraca czasy lokalne (timezone w URL); znajdź pierwszą godzinę >= teraz
    let start = ht.findIndex((t) => t >= String(cw.time).slice(0, 13) + ':00');
    if (start < 0) start = 0;
    if (typeof apparent[start] === 'number') feels = Math.round(apparent[start]);
    for (let i = start, n = 0; i < ht.length && n < 6; i += 3, n++) {
      if (typeof temps[i] !== 'number') break;
      const hour = Number(ht[i].slice(11, 13));
      hours.push({
        h: `${hour}:00`,
        t: Math.round(temps[i]),
        icon: wmoToIcon(codes[i] ?? 3, hour >= 6 && hour < 21),
      });
    }
  }

  return {
    tempC: Math.round(cw.temperature),
    icon: wmoToIcon(cw.weathercode ?? 3, cw.is_day === 1),
    desc: wmoToDesc(cw.weathercode ?? 3),
    city,
    hi: data?.daily?.temperature_2m_max?.[0] != null ? Math.round(data.daily.temperature_2m_max[0]) : null,
    lo: data?.daily?.temperature_2m_min?.[0] != null ? Math.round(data.daily.temperature_2m_min[0]) : null,
    feels,
    hours,
    updatedAt,
  };
}
function europeanAqiToStatus(aqi: number): { category: string; color: `#${string}` } {
  if (aqi <= 20) return { category: 'Bardzo dobra', color: '#10B981' };
  if (aqi <= 40) return { category: 'Dobra', color: '#84CC16' };
  if (aqi <= 60) return { category: 'Umiarkowana', color: '#F59E0B' };
  if (aqi <= 80) return { category: 'Zła', color: '#EF4444' };
  return { category: 'Bardzo zła', color: '#7C3AED' };
}
export async function fetchAirForWidget(lat: number, lon: number, city: string, updatedAt: string): Promise<WidgetAir | null> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi&timezone=Europe%2FWarsaw`;
  try {
    const d = await fetchJson(url);
    const aqi = d?.current?.european_aqi;
    if (typeof aqi !== 'number') return null;
    const s = europeanAqiToStatus(aqi);
    return { index: Math.round(aqi), category: s.category, color: s.color, city, updatedAt };
  } catch {
    return null;
  }
}
