import { router } from 'expo-router';

export interface DeepLinkInfo {
  type: 'article' | 'event' | 'category' | 'search' | 'weather' | 'home' | 'unknown';
  slug?: string;
  id?: number;
  query?: string;
  path?: string;
}

/**
 * Parse a deep link URL and extract relevant information
 */
export const parseDeepLink = (url: string): DeepLinkInfo => {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a kaszuby24.pl link
    if (urlObj.hostname === 'kaszuby24.pl' || urlObj.hostname === 'www.kaszuby24.pl') {
      const pathname = urlObj.pathname;
      const path = pathname.replace(/^\/+|\/+$/g, '');
      const pathSegments = path.split('/');
      
      // Handle different URL patterns
      if (pathSegments.length === 0 || path === '') {
        return { type: 'home' };
      }
      
      // Article by slug: /nazwa-artykulu
      if (pathSegments.length === 1 && pathSegments[0] !== 'event' && pathSegments[0] !== 'category' && pathSegments[0] !== 'search' && pathSegments[0] !== 'weather') {
        return {
          type: 'article',
          slug: pathSegments[0]
        };
      }
      
      // Event: /event/123
      if (pathSegments[0] === 'event' && pathSegments[1]) {
        const eventId = parseInt(pathSegments[1]);
        if (!isNaN(eventId)) {
          return {
            type: 'event',
            id: eventId,
            slug: pathSegments[1]
          };
        }
      }
      
      // Category: /category/wiadomosci
      if (pathSegments[0] === 'category' && pathSegments[1]) {
        return {
          type: 'category',
          slug: pathSegments[1]
        };
      }
      
      // Search: /search?q=query
      if (pathSegments[0] === 'search') {
        const query = urlObj.searchParams.get('q') || '';
        return {
          type: 'search',
          query: query,
          path: 'search'
        };
      }
      
      // Weather: /weather
      if (pathSegments[0] === 'weather') {
        return {
          type: 'weather',
          path: 'weather'
        };
      }
      
      // Default to article if no specific pattern matches
      return {
        type: 'article',
        slug: path
      };
    }
    
    return {
      type: 'unknown'
    };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return {
      type: 'unknown'
    };
  }
};

/**
 * Handle navigation based on deep link information
 */
export const handleDeepLinkNavigation = (linkInfo: DeepLinkInfo) => {
  try {
    switch (linkInfo.type) {
      case 'article':
        if (linkInfo.slug) {
          console.log('Navigating to article with slug:', linkInfo.slug);
          router.push(`/article/${linkInfo.slug}`);
        } else {
          console.log('No slug provided, navigating to home');
          router.push('/(tabs)');
        }
        break;
        
      case 'event':
        if (linkInfo.id) {
          console.log('Navigating to event with ID:', linkInfo.id);
          router.push(`/event/${linkInfo.id}`);
        } else {
          console.log('No event ID provided, navigating to home');
          router.push('/(tabs)');
        }
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
export const handleDeepLink = (url: string) => {
  console.log('Deep link received:', url);
  
  try {
    const linkInfo = parseDeepLink(url);
    console.log('Parsed link info:', linkInfo);
    handleDeepLinkNavigation(linkInfo);
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
  
  // Basic validation - slug should contain letters/numbers and hyphens
  const slugRegex = /^[a-zA-Z0-9\-_]+$/;
  return slugRegex.test(slug);
};

/**
 * Handle deep link with validation and fallback
 */
export const handleDeepLinkWithValidation = (url: string) => {
  console.log('Handling deep link with validation:', url);
  
  const linkInfo = parseDeepLink(url);
  
  // Validate the link info
  if (linkInfo.type === 'article' && linkInfo.slug && !isValidSlug(linkInfo.slug)) {
    console.warn('Invalid slug format:', linkInfo.slug);
    // Fallback to home
    router.push('/(tabs)');
    return;
  }
  
  handleDeepLinkNavigation(linkInfo);
};