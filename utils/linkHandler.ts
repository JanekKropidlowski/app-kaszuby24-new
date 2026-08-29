import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { fetchArticleBySlug, fetchEventBySlug, fetchNekrologBySlug } from '@/services/api';
import { useSupportStore } from '@/store/supportStore';

export interface DeepLinkInfo {
  type: 'article' | 'event' | 'nekrolog' | 'category' | 'search' | 'weather' | 'airquality' | 'waste' | 'transport' | 'home' | 'wydarzenia' | 'nekrologi' | 'support' | 'essentials' | 'saved' | 'external' | 'unknown';
  slug?: string;
  id?: number;
  query?: string;
  path?: string;
  url?: string;
  filter?: 'AED' | 'SOR' | 'PHARMACY' | 'HOSPITAL' | 'MEDICAL';
}

/**
 * Parse a deep link URL and extract relevant information
 */
export const parseDeepLink = (url: string): DeepLinkInfo => {
  try {
    console.log('Parsing URL:', url);
    const urlObj = new URL(url);

    // Normalize protocol and hostname
    const protocol = urlObj.protocol.replace(':', '');
    const hostname = urlObj.hostname.toLowerCase();

    // 1. Handle Custom Scheme (kaszuby24://...)
    if (protocol === 'kaszuby24') {
      const pathSegments = urlObj.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(s => s.length > 0);
      const hostSegment = hostname; // in kaszuby24://article/123, hostname is 'article'

      console.log('Custom scheme detected. Host:', hostSegment, 'Segments:', pathSegments);

      if (hostSegment === 'article' && pathSegments[0]) {
        const id = parseInt(pathSegments[0]);
        if (!isNaN(id)) return { type: 'article', id };
        return { type: 'article', slug: pathSegments[0] };
      }

      if (hostSegment === 'event' && pathSegments[0]) {
        const id = parseInt(pathSegments[0]);
        if (!isNaN(id)) return { type: 'event', id };
        return { type: 'event', slug: pathSegments[0] };
      }

      if (hostSegment === 'nekrolog' && pathSegments[0]) {
        return { type: 'nekrolog', slug: pathSegments[0] };
      }

      if (hostSegment === 'category' && pathSegments[0]) {
        return { type: 'category', slug: pathSegments[0] };
      }

      if (hostSegment === 'search') {
        const query = urlObj.searchParams.get('q') || pathSegments[0] || '';
        return { type: 'search', query };
      }

      if (hostSegment === 'weather') return { type: 'weather' };
      if (hostSegment === 'airquality' || hostSegment === 'powietrze') return { type: 'airquality' };
      if (hostSegment === 'waste' || hostSegment === 'odpady') return { type: 'waste' };
      if (hostSegment === 'home') return { type: 'home' };
      if (hostSegment === 'wesprzyj') return { type: 'support' };

      // Niezbędnik / Pomoc — mapa AED/SOR/szpitale/apteki
      if (hostSegment === 'aed') return { type: 'essentials', filter: 'AED' };
      if (hostSegment === 'sor' || hostSegment === 'kolejka-sor') return { type: 'essentials', filter: 'SOR' };
      if (hostSegment === 'apteki' || hostSegment === 'apteka') return { type: 'essentials', filter: 'PHARMACY' };
      if (hostSegment === 'essentials' || hostSegment === 'niezbednik' || hostSegment === 'pomoc') {
        const f = (urlObj.searchParams.get('filter') || '').toUpperCase();
        const filter = (['AED', 'SOR', 'PHARMACY', 'HOSPITAL', 'MEDICAL'] as const).find(x => x === f);
        return { type: 'essentials', filter };
      }

      // Fallback for custom scheme if host isn't recognized but segments exist
      if (pathSegments.length > 0) {
        return { type: 'article', slug: pathSegments[0] };
      }
    }

    // 2a. Pogoda subdomain — wszystko trafia w Weather tab. Path zachowujemy
    // żeby ekran pogody mógł później (po dodaniu logiki preselekcji) otworzyć
    // konkretne miasto z URL np. pogoda.kaszuby24.pl/puck → city=puck.
    if (hostname === 'pogoda.kaszuby24.pl') {
      const path = urlObj.pathname.replace(/^\/+|\/+$/g, '');
      return { type: 'weather', path };
    }

    // 2b. Rozklady subdomain — wszystko trafia w Transport tab. Path
    // zachowujemy do późniejszej preselekcji linii/trasy.
    if (hostname === 'rozklady.kaszuby24.pl') {
      const path = urlObj.pathname.replace(/^\/+|\/+$/g, '');
      return { type: 'transport', path };
    }

    // 3. Handle Web URLs (https://kaszuby24.pl/...)
    if (hostname === 'kaszuby24.pl' || hostname === 'www.kaszuby24.pl') {
      const pathname = urlObj.pathname;
      const path = pathname.replace(/^\/+|\/+$/g, '');
      const pathSegments = path.split('/').filter(s => s.length > 0);

      // Ścieżki systemowe WP — otwórz w przeglądarce
      const wpSystemPaths = ['wp-admin', 'wp-content', 'wp-json', 'wp-login.php', 'wp-includes', 'feed', 'sitemap', 'xmlrpc.php'];
      if (pathSegments.length > 0 && wpSystemPaths.some(p => pathSegments[0].startsWith(p))) {
        return { type: 'external', url };
      }

      // WP numeryczny ID: /?p=123 lub /?page_id=123
      const pId = urlObj.searchParams.get('p') || urlObj.searchParams.get('page_id');
      if (pId) {
        const numId = parseInt(pId);
        if (!isNaN(numId)) return { type: 'article', id: numId };
      }

      // WP search: /?s=query
      const wpSearch = urlObj.searchParams.get('s');
      if (wpSearch && pathSegments.length === 0) return { type: 'search', query: wpSearch };

      if (pathSegments.length === 0 || path === '') {
        return { type: 'home' };
      }

      // Main pages
      if (pathSegments[0] === 'wesprzyj') return { type: 'support' };
      if (pathSegments[0] === 'wydarzenia') return { type: 'wydarzenia' };
      if (pathSegments[0] === 'nekrologi' || pathSegments[0] === 'nekrologi-2') return { type: 'nekrologi' };

      // Nekrolog by slug: /nekrolog/nazwa-nekrologu
      if (pathSegments[0] === 'nekrolog' && pathSegments[1]) {
        return { type: 'nekrolog', slug: pathSegments[1], url };
      }

      // Event by slug: /kalendarz/nazwa-wydarzenia
      if (pathSegments[0] === 'kalendarz' && pathSegments[1]) {
        return { type: 'event', slug: pathSegments[1], url };
      }

      // Event by slug (portal Next.js): /wydarzenie/nazwa-wydarzenia
      if (pathSegments[0] === 'wydarzenie' && pathSegments[1]) {
        return { type: 'event', slug: pathSegments[1], url };
      }

      // Event by ID: /event/123
      if (pathSegments[0] === 'event' && pathSegments[1]) {
        const eventId = parseInt(pathSegments[1]);
        if (!isNaN(eventId)) {
          return { type: 'event', id: eventId, slug: pathSegments[1] };
        }
      }

      // WP Category: /category/wiadomosci lub /kategoria/wiadomosci
      if ((pathSegments[0] === 'category' || pathSegments[0] === 'kategoria') && pathSegments[1]) {
        return { type: 'category', slug: pathSegments[1] };
      }

      // Search: /search?q=query lub /szukaj
      if (pathSegments[0] === 'search' || pathSegments[0] === 'szukaj') {
        const query = urlObj.searchParams.get('q') || urlObj.searchParams.get('s') || '';
        return { type: 'search', query, path: 'search' };
      }

      // Weather: /weather
      if (pathSegments[0] === 'weather') return { type: 'weather', path: 'weather' };

      // Odpady: /odpady lub /odpady/[miasto](/region/[id]) — ekran harmonogramu wywozu
      if (pathSegments[0] === 'odpady') return { type: 'waste' };

      // Lista wszystkich wiadomości — w apce to feed na ekranie głównym
      if (pathSegments[0] === 'wiadomosci') return { type: 'home' };

      // Zapisane artykuły — apka ma własny tab "Zapisane"
      if (pathSegments[0] === 'zapisane') return { type: 'saved' };

      // Niezbędnik / Pomoc — mapa AED, kolejki SOR, apteki, szpitale
      if (pathSegments[0] === 'aed') return { type: 'essentials', filter: 'AED' };
      if (pathSegments[0] === 'kolejka-sor' || pathSegments[0] === 'sor') return { type: 'essentials', filter: 'SOR' };
      if (pathSegments[0] === 'apteki' || pathSegments[0] === 'apteka') return { type: 'essentials', filter: 'PHARMACY' };
      if (pathSegments[0] === 'essentials' || pathSegments[0] === 'niezbednik' || pathSegments[0] === 'pomoc') {
        const f = (urlObj.searchParams.get('filter') || '').toUpperCase();
        const filter = (['AED', 'SOR', 'PHARMACY', 'HOSPITAL', 'MEDICAL'] as const).find(x => x === f);
        return { type: 'essentials', filter };
      }

      // Strony które mają być otwierane w przeglądarce (brak odpowiednika w apce).
      // 'rozklady'/'ogloszenia' + gołe ścieżki transportowe: osobne aplikacje webowe
      // w podkatalogach kaszuby24.pl (rozkłady :3015 od 2026-07-24, ogłoszenia :3101).
      // Bez nich np. /rozklady/przystanek/swarzewo wpadało w gałąź "ostatni segment =
      // slug artykułu", lookup nie znajdował artykułu i user lądował w apce zamiast
      // na rozkładzie. AASA wyklucza te ścieżki z universal links, ale Android
      // (intent-filter pathPrefix "/") i starsze, zcache'owane AASA nadal je łapią.
      const externalPaths = [
        'kontakt', 'o-nas', 'reklama', 'polityka-prywatnosci', 'regulamin', 'reklama-w-serwisie', 'mediakit', 'o-portalu',
        'organizacja', 'organizacje', 'atrakcje', 'trasy-rowerowe', 'galeria', 'kamery', 'tag', 'autor',
        'szybkie', 'zglos-temat', 'dla-instytucji', 'patronat-medialny', 'deklaracja-dostepnosci', 'aplikacja',
        'rozklady', 'ogloszenia', 'przystanek', 'przystanki', 'linia', 'linie', 'przewoznicy', 'trasa', 'miasto',
      ];
      if (externalPaths.includes(pathSegments[0].toLowerCase())) {
        return { type: 'external', url };
      }

      // Artykuł po slugu: /nazwa-artykulu (domyślny przypadek)
      const reservedRoots = ['event', 'category', 'kategoria', 'search', 'szukaj', 'weather', 'kalendarz', 'nekrolog', 'wydarzenia', 'wydarzenie', 'nekrologi', 'nekrologi-2', 'wesprzyj', 'aed', 'sor', 'kolejka-sor', 'apteki', 'apteka', 'essentials', 'niezbednik', 'pomoc', 'odpady', 'wiadomosci', 'zapisane'];
      if (pathSegments.length === 1 && !reservedRoots.includes(pathSegments[0])) {
        return { type: 'article', slug: pathSegments[0], url };
      }

      // Głębsze ścieżki — ostatni segment jako slug artykułu
      if (pathSegments.length > 1) {
        return { type: 'article', slug: pathSegments[pathSegments.length - 1], url };
      }
    }

    return { type: 'unknown' };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return { type: 'unknown' };
  }
};

/**
 * Handle navigation based on deep link information.
 *
 * `replace=true` — used when called from cold-start / +not-found redirect, so
 * the back button doesn't lead back to the placeholder route. `replace=false`
 * is the right choice when the app is already running and the user clicks an
 * external link — they expect a back stack.
 */
export const handleDeepLinkNavigation = async (linkInfo: DeepLinkInfo, replace = false) => {
  const go = (href: string) => (replace ? router.replace(href as never) : router.push(href as never));
  // Gdy nie umiemy dopasować treści w apce, a znamy oryginalny URL — otwórz
  // stronę www w przeglądarce zamiast wyrzucać użytkownika na ekran główny.
  const fallbackToWeb = (home: string) => {
    if (linkInfo.url) {
      WebBrowser.openBrowserAsync(linkInfo.url);
      if (replace) router.replace(home as never);
    } else {
      go(home);
    }
  };
  try {
    switch (linkInfo.type) {
      case 'article':
        if (linkInfo.id) {
          go(`/article/${linkInfo.id}`);
        } else if (linkInfo.slug) {
          try {
            const article = await fetchArticleBySlug(linkInfo.slug);
            if (article?.id) {
              go(`/article/${article.id}`);
            } else {
              fallbackToWeb('/(tabs)');
            }
          } catch (e) {
            fallbackToWeb('/(tabs)');
          }
        } else {
          go('/(tabs)');
        }
        break;

      case 'event':
        if (linkInfo.id) {
          go(`/event/${linkInfo.id}`);
        } else if (linkInfo.slug) {
          // Wydarzenia LZS (slug `lzs-...`) nie istnieją w API kalendarza na
          // panelu — pochodzą z feedu lzs-pomorski.pl i mają dedykowany
          // natywny ekran. Lookup po slugu zawsze kończył się fiaskiem i user
          // lądował w przeglądarce (dla wygasłych wydarzeń — na stronie 404).
          if (linkInfo.slug.startsWith('lzs-')) {
            go(`/lzs/${linkInfo.slug.replace(/^lzs-/, '')}`);
            break;
          }
          try {
            const event = await fetchEventBySlug(linkInfo.slug);
            if (event?.id) {
              go(`/event/${event.id}`);
            } else {
              go('/(tabs)/kalendarz');
            }
          } catch (e: any) {
            // Wydarzenie usunięte/wygasłe: www pokaże dokładnie ten sam 404,
            // więc nie ma sensu wysyłać tam usera — pokaż kalendarz wydarzeń.
            // Do przeglądarki tylko przy błędach sieci/serwera, gdy strona
            // może mimo wszystko działać.
            const notFound = typeof e?.message === 'string' && e.message.includes('nie zostało znalezione');
            if (notFound) {
              go('/(tabs)/kalendarz');
            } else {
              fallbackToWeb('/(tabs)/kalendarz');
            }
          }
        } else {
          go('/(tabs)/kalendarz');
        }
        break;

      case 'nekrolog':
        if (linkInfo.slug) {
          try {
            const nekrolog = await fetchNekrologBySlug(linkInfo.slug);
            if (nekrolog?.id) {
              go(`/nekrolog/${nekrolog.id}`);
            } else {
              fallbackToWeb('/(tabs)');
            }
          } catch (e) {
            fallbackToWeb('/(tabs)');
          }
        } else {
          go('/(tabs)');
        }
        break;

      case 'wydarzenia':
        go('/(tabs)/kalendarz');
        break;

      case 'nekrologi':
        go('/(tabs)');
        break;

      case 'category':
        if (linkInfo.slug) {
          go(`/(tabs)/search?category=${linkInfo.slug}`);
        } else {
          go('/(tabs)');
        }
        break;

      case 'search':
        if (linkInfo.query) {
          go(`/(tabs)/search?q=${encodeURIComponent(linkInfo.query)}`);
        } else {
          go('/(tabs)/search');
        }
        break;

      case 'weather':
        if (linkInfo.path) {
          go(`/(tabs)/weather?city=${encodeURIComponent(linkInfo.path)}`);
        } else {
          go('/(tabs)/weather');
        }
        break;

      case 'airquality':
        go('/(tabs)/airquality');
        break;

      case 'waste':
        go('/waste');
        break;

      case 'transport':
        if (linkInfo.path) {
          go(`/(tabs)/transport_v2?route=${encodeURIComponent(linkInfo.path)}`);
        } else {
          go('/(tabs)/transport_v2');
        }
        break;

      case 'home':
        go('/(tabs)');
        break;

      case 'support':
        go('/(tabs)');
        useSupportStore.getState().show();
        break;

      case 'essentials':
        // Ekran "Pomoc"/Niezbędnik z mapą; filter preselekcjonuje zakładkę (AED/SOR/...)
        go(linkInfo.filter ? `/essentials?filter=${linkInfo.filter}` : '/essentials');
        break;

      case 'saved':
        go('/(tabs)/saved');
        break;

      case 'external':
        if (linkInfo.url) {
          WebBrowser.openBrowserAsync(linkInfo.url);
          // Make sure we don't leave the user stranded on +not-found.
          if (replace) router.replace('/(tabs)');
        }
        break;

      default:
        go('/(tabs)');
        break;
    }
  } catch (error) {
    console.error('Error during deep link navigation:', error);
    go('/(tabs)');
  }
};

/**
 * Main deep link handler function with error handling
 */
export const handleDeepLink = async (url: string, replace = false) => {
  try {
    const linkInfo = parseDeepLink(url);
    await handleDeepLinkNavigation(linkInfo, replace);
  } catch (error) {
    console.error('Error handling deep link:', error);
    if (replace) router.replace('/(tabs)');
    else router.push('/(tabs)');
  }
};

/**
 * Test if a URL is a valid kaszuby24 ecosystem deep link
 * (main domain + pogoda/rozklady subdomains)
 */
export const isKaszuby24Link = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const h = urlObj.hostname;
    return (
      h === 'kaszuby24.pl' ||
      h === 'www.kaszuby24.pl' ||
      h === 'pogoda.kaszuby24.pl' ||
      h === 'rozklady.kaszuby24.pl'
    );
  } catch {
    return false;
  }
};

/**
 * Extract article slug from a kaszuby24.pl URL
 */
export const extractSlugFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname === 'kaszuby24.pl' || urlObj.hostname === 'www.kaszuby24.pl') {
      const pathname = urlObj.pathname;
      const slug = pathname.replace(/^\/+|\/+$/g, '');

      return slug.length > 0 ? slug : null;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Validate if a slug is likely to be valid
 */
export const isValidSlug = (slug: string): boolean => {
  if (!slug || slug.length === 0) return false;
  if (slug.length > 200) return false;
  // Dopuszcza litery, cyfry, myślniki, podkreślenia i kropki (WP slugs)
  const slugRegex = /^[a-zA-Z0-9\-_.]+$/;
  return slugRegex.test(slug);
};

/**
 * Handle deep link with validation and fallback
 */
export const handleDeepLinkWithValidation = async (url: string, replace = false) => {
  const linkInfo = parseDeepLink(url);

  if (linkInfo.type === 'article' && linkInfo.slug && !isValidSlug(linkInfo.slug)) {
    console.warn('Invalid slug format:', linkInfo.slug);
    if (replace) router.replace('/(tabs)');
    else router.push('/(tabs)');
    return;
  }

  await handleDeepLinkNavigation(linkInfo, replace);
};