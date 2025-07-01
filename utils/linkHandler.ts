import { router } from 'expo-router';

export interface DeepLinkInfo {
  type: 'article' | 'home' | 'unknown';
  slug?: string;
  id?: number;
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
      
      // Extract slug from pathname (remove leading and trailing slashes)
      const slug = pathname.replace(/^\/+|\/+$/g, '');
      
      if (slug && slug.length > 0) {
        return {
          type: 'article',
          slug: slug
        };
      } else {
        return {
          type: 'home'
        };
      }
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
      
    case 'home':
      console.log('Navigating to home');
      router.push('/(tabs)');
      break;
      
    default:
      console.log('Unknown link type, navigating to home');
      router.push('/(tabs)');
      break;
  }
};

/**
 * Main deep link handler function
 */
export const handleDeepLink = (url: string) => {
  console.log('Deep link received:', url);
  
  const linkInfo = parseDeepLink(url);
  handleDeepLinkNavigation(linkInfo);
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