import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { fetchArticleBySlug, fetchEventBySlug, fetchNekrologBySlug } from '@/services/api';

export interface DeepLinkInfo {
  type: 'article' | 'event' | 'nekrolog' | 'category' | 'search' | 'weather' | 'home' | 'wydarzenia' | 'nekrologi' | 'external' | 'unknown';
  slug?: string;
  id?: number;
  query?: string;
  path?: string;
  url?: string;
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
      if (hostSegment === 'home') return { type: 'home' };

      // Fallback for custom scheme if host isn't recognized but segments exist
      if (pathSegments.length > 0) {
        return { type: 'article', slug: pathSegments[0] };
      }
    }

    // 2. Handle Web URLs (https://kaszuby24.pl/...)
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
      if (pathSegments[0] === 'wydarzenia') return { type: 'wydarzenia' };
      if (pathSegments[0] === 'nekrologi' || pathSegments[0] === 'nekrologi-2') return { type: 'nekrologi' };

      // Nekrolog by slug: /nekrolog/nazwa-nekrologu
      if (pathSegments[0] === 'nekrolog' && pathSegments[1]) {
        return { type: 'nekrolog', slug: pathSegments[1] };
      }

      // Event by slug: /kalendarz/nazwa-wydarzenia
      if (pathSegments[0] === 'kalendarz' && pathSegments[1]) {
        return { type: 'event', slug: pathSegments[1] };
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

      // Strony które mają być otwierane w przeglądarce
      const externalPaths = ['kontakt', 'o-nas', 'reklama', 'polityka-prywatnosci', 'regulamin', 'reklama-w-serwisie', 'mediakit', 'o-portalu'];
      if (externalPaths.includes(pathSegments[0].toLowerCase())) {
        return { type: 'external', url };
      }

      // Artykuł po slugu: /nazwa-artykulu (domyślny przypadek)
      const reservedRoots = ['event', 'category', 'kategoria', 'search', 'szukaj', 'weather', 'kalendarz', 'nekrolog', 'wydarzenia', 'nekrologi', 'nekrologi-2'];
      if (pathSegments.length === 1 && !reservedRoots.includes(pathSegments[0])) {
        return { type: 'article', slug: pathSegments[0] };
      }

      // Głębsze ścieżki — ostatni segment jako slug artykułu
      if (pathSegments.length > 1) {
        return { type: 'article', slug: pathSegments[pathSegments.length - 1] };
      }
    }

    return { type: 'unknown' };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return { type: 'unknown' };
  }
};

/**
 * Handle navigation based on deep link information
 */
export const handleDeepLinkNavigation = async (linkInfo: DeepLinkInfo) => {
  try {
    switch (linkInfo.type) {
      case 'article':
        if (linkInfo.id) {
          // Bezpośredni link po ID (np. /?p=123)
          router.push(`/article/${linkInfo.id}`);
        } else if (linkInfo.slug) {
          try {
            const article = await fetchArticleBySlug(linkInfo.slug);
            if (article?.id) {
              router.push(`/article/${article.id}`);
            } else {
              router.push('/(tabs)');
            }
          } catch (e) {
            router.push('/(tabs)');
          }
        } else {
          router.push('/(tabs)');
        }
        break;

      case 'event':
        if (linkInfo.id) {
          console.log('Navigating to event with ID:', linkInfo.id);
          router.push(`/event/${linkInfo.id}`);
        } else if (linkInfo.slug) {
          console.log('Navigating to event with slug:', linkInfo.slug);
          // Fetch event by slug, then navigate by ID
          try {
            const event = await fetchEventBySlug(linkInfo.slug);
            if (event?.id) {
              router.push(`/event/${event.id}`);
            } else {
              console.warn('Event not found for slug, navigating to events tab');
              router.push('/(tabs)/kalendarz');
            }
          } catch (e) {
            console.warn('Failed to fetch event by slug, navigating to events tab', e);
            router.push('/(tabs)/kalendarz');
          }
        } else {
          console.log('No event ID or slug provided, navigating to events');
          router.push('/(tabs)/kalendarz');
        }
        break;

      case 'nekrolog':
        if (linkInfo.slug) {
          console.log('Navigating to nekrolog with slug:', linkInfo.slug);
          // Fetch nekrolog by slug, then navigate by ID
          try {
            const nekrolog = await fetchNekrologBySlug(linkInfo.slug);
            if (nekrolog?.id) {
              router.push(`/nekrolog/${nekrolog.id}`);
            } else {
              console.warn('Nekrolog not found for slug, navigating to home');
              router.push('/(tabs)');
            }
          } catch (e) {
            console.warn('Failed to fetch nekrolog by slug, navigating to home', e);
            router.push('/(tabs)');
          }
        } else {
          console.log('No nekrolog slug provided, navigating to home');
          router.push('/(tabs)');
        }
        break;

      case 'wydarzenia':
        console.log('Navigating to wydarzenia tab');
        router.push('/(tabs)/kalendarz');
        break;

      case 'nekrologi':
        console.log('Navigating to nekrologi section (home tab)');
        router.push('/(tabs)');
        break;

      case 'category':
        if (linkInfo.slug) {
          console.log('Navigating to category:', linkInfo.slug);
          // Navigate to search with category filter
          router.push(`/(tabs)/search?category=${linkInfo.slug}`);
        } else {
          console.log('No category slug provided, navigating to home');
          router.push('/(tabs)');
        }
        break;

      case 'search':
        if (linkInfo.query) {
          console.log('Navigating to search with query:', linkInfo.query);
          router.push(`/(tabs)/search?q=${encodeURIComponent(linkInfo.query)}`);
        } else {
          console.log('No search query provided, navigating to search');
          router.push('/(tabs)/search');
        }
        break;

      case 'weather':
        console.log('Navigating to weather');
        router.push('/(tabs)/weather');
        break;

      case 'home':
        console.log('Navigating to home');
        router.push('/(tabs)');
        break;

      case 'external':
        if (linkInfo.url) {
          console.log('Opening external link in browser:', linkInfo.url);
          WebBrowser.openBrowserAsync(linkInfo.url);
        }
        break;

      default:
        console.log('Unknown link type, navigating to home');
        router.push('/(tabs)');
        break;
    }
  } catch (error) {
    console.error('Error during deep link navigation:', error);
    // Fallback to home
    router.push('/(tabs)');
  }
};

/**
 * Main deep link handler function with error handling
 */
export const handleDeepLink = async (url: string) => {
  console.log('Deep link received:', url);

  try {
    const linkInfo = parseDeepLink(url);
    console.log('Parsed link info:', linkInfo);
    await handleDeepLinkNavigation(linkInfo);
  } catch (error) {
    console.error('Error handling deep link:', error);
    // Fallback to home
    router.push('/(tabs)');
  }
};

/**
 * Test if a URL is a valid kaszuby24.pl deep link
 */
export const isKaszuby24Link = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'kaszuby24.pl' || urlObj.hostname === 'www.kaszuby24.pl';
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
export const handleDeepLinkWithValidation = async (url: string) => {
  console.log('Handling deep link with validation:', url);

  const linkInfo = parseDeepLink(url);

  // Validate the link info
  if (linkInfo.type === 'article' && linkInfo.slug && !isValidSlug(linkInfo.slug)) {
    console.warn('Invalid slug format:', linkInfo.slug);
    // Fallback to home
    router.push('/(tabs)');
    return;
  }

  await handleDeepLinkNavigation(linkInfo);
};