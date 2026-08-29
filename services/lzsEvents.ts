import { Event } from '@/types/article';

// Mirror funkcjonalny `kaszuby24-nextjs/src/lib/lzs-events.ts` — apka mobilna
// dociąga ten sam feed LZS Pomorski, mapuje do mobilnego kształtu `Event` i
// oznacza flagą `source: 'lzs'` żeby renderer i routing mogły rozróżnić.
const LZS_FEED_URL = 'https://lzs-pomorski.pl/wp-json/lzs/v1/events';

// Placeholder gdy event LZS nie ma plakatu — ten sam asset co web.
export const LZS_FALLBACK_IMAGE =
  'https://lzs-pomorski.pl/wp-content/uploads/2025/04/Projekt-bez-nazwy-9.png';

type LzsRaw = {
  id: number;
  slug: string;
  title: string;
  link: string;
  date: string | null;
  date_unix: number | null;
  godzina: string;
  miejscowosc: string;
  organizator: string;
  regulamin: string;
  image: string | null;
  categories: Array<{ id: number; name: string; slug: string }>;
  description_html?: string;
  description_text?: string;
};

type LzsFeedResponse = {
  items: LzsRaw[];
  total: number;
  total_pages: number;
};

// Surowy kształt eventu LZS (przed mapowaniem na mobilny `Event`) — używany
// przez ekran detail żeby mieć dostęp do oryginalnych pól (godzina, organizator,
// regulamin, description_html), które po `fetchLzsEvents` są tracone.
export type LzsRawEvent = LzsRaw;

// Łączy date_unix (UTC północ) z `godzina` "HH:MM" w jeden timestamp, tak żeby
// sortowanie po dacie/czasie było spójne z webowym `combineDateAndHour`.
function buildIsoDate(dateUnix: number, godzina: string): string {
  const match = godzina?.trim().match(/^(\d{1,2}):(\d{2})$/);
  const h = match ? Math.max(0, Math.min(23, Number(match[1]))) : 0;
  const m = match ? Math.max(0, Math.min(59, Number(match[2]))) : 0;
  // dateUnix to północ UTC dnia eventu — dodajemy godziny lokalne (Europe/Warsaw
  // ~UTC+2 latem); RN nie ma date-fns-tz, więc serializujemy w prostym ISO bez Z.
  const d = new Date((dateUnix + h * 3600 + m * 60) * 1000);
  return d.toISOString().replace('Z', '');
}

/** Pobiera eventy LZS i mapuje na mobilny `Event` (z `source: 'lzs'`). */
export async function fetchLzsEvents(perPage = 60): Promise<Event[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${LZS_FEED_URL}?per_page=${perPage}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = (await res.json()) as LzsFeedResponse;

    const now = Math.floor(Date.now() / 1000) - 24 * 3600; // ukryj wczorajsze i starsze
    return (data.items || [])
      .filter((e) => e.date_unix && e.date_unix > now)
      .map((e): Event => {
        const iso = buildIsoDate(e.date_unix as number, e.godzina);
        return {
          // Ujemne ID = zero kolizji z numerycznymi ID kalendarza WP.
          id: -1 * (e.id || 0),
          slug: `lzs-${e.slug}`,
          title: { rendered: e.title },
          content: { rendered: e.description_html || '' },
          date: iso,
          featured_media_url: e.image || LZS_FALLBACK_IMAGE,
          image: e.image || LZS_FALLBACK_IMAGE,
          meta: {
            miasto: e.miejscowosc || '',
            'opis-wydarzenia': e.description_text || '',
            'godzina-rozpoczecia': e.godzina || '',
          },
          _embedded: e.image
            ? {
                'wp:featuredmedia': [
                  {
                    id: 0,
                    source_url: e.image,
                  },
                ],
              }
            : undefined,
          source: 'lzs',
          externalUrl: e.link,
          organizator: e.organizator || undefined,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Pobiera pojedynczy event LZS po slugu (bez prefixu `lzs-`). LZS feed nie
 * udostępnia endpointu `/events/{id}` ani `/events?slug=`, więc ciągniemy
 * stronicę i filtrujemy klient-side. Slug -> id mapowanie jest pewne (LZS
 * używa WP-default slugów post_name).
 */
export async function fetchLzsEventBySlug(rawSlug: string): Promise<LzsRawEvent | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${LZS_FEED_URL}?per_page=100`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as LzsFeedResponse;
    return (data.items || []).find((e) => e.slug === rawSlug) || null;
  } catch {
    return null;
  }
}
