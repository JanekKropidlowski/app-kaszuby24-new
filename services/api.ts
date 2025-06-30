import { Article, Category, MediaItem } from '@/types/article';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { filterSponsoredArticles, filterSponsoredCategories } from '@/utils/contentFilter';

const API_BASE_URL = 'https://kaszuby24.pl/wp-json/wp/v2';
const API_TIMEOUT = 30000; // Consistent timeout across platforms
const MAX_RETRIES = 3; // Consistent retry count
const CACHE_KEY_ARTICLES = 'cached_articles';
const CACHE_KEY_CATEGORIES = 'cached_categories';
const CACHE_KEY_MEDIA = 'cached_media';
const CACHE_DURATION = 60 * 60 * 1000; // Cache for 1 hour

// Push notification registration interface
export interface PushTokenRegistration {
  token: string;
  location: string;
  locationId: number;
  platform: string;
  deviceInfo?: {
    brand?: string | null;
    modelName?: string | null;
    osName?: string | null;
    osVersion?: string | null;
  };
}

// Helper function to handle fetch with timeout and retries
const fetchWithTimeout = async (url: string, options = {}, retries = 0): Promise<Response> => {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeout = setTimeout(() => {
    controller.abort();
  }, API_TIMEOUT);
  
  try {
    const fetchOptions = {
      ...options,
      signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': Platform.select({
          android: 'Kaszuby24-Android/1.0',
          ios: 'Kaszuby24-iOS/1.0',
          default: 'Kaszuby24-App/1.0'
        }),
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...((options as any)?.headers || {}),
      },
    };
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeout);
    return response;
  } catch (error: any) {
    clearTimeout(timeout);
    
    // Handle network errors with retries
    if (retries < MAX_RETRIES) {
      const delay = 1000 * (retries + 1); // Linear backoff
      
      console.log(`Retrying request (${retries + 1}/${MAX_RETRIES}) after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithTimeout(url, options, retries + 1);
    }
    
    // Enhanced error handling
    if (error.name === 'AbortError') {
      throw new Error('Zapytanie przekroczyło limit czasu. Sprawdź połączenie internetowe.');
    } else if (error.message.includes('Network request failed')) {
      throw new Error('Brak połączenia z internetem. Sprawdź ustawienia sieci.');
    } else if (error.message.includes('Unable to resolve host')) {
      throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.');
    }
    
    throw error;
  }
};

// Helper function to cache data
const cacheData = async (key: string, data: any) => {
  try {
    const timestampedData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(timestampedData));
  } catch (error) {
    // Silent fail for caching
    console.warn('Cache write failed:', error);
  }
};

// Helper function to retrieve cached data
const getCachedData = async (key: string) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      if (age < CACHE_DURATION) {
        return data;
      } else {
        AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
    }
  } catch (error) {
    console.warn('Cache read failed:', error);
    AsyncStorage.removeItem(key).catch(() => {});
  }
  return null;
};

export const fetchArticles = async (
  page = 1, 
  perPage = 10, 
  categories?: number[]
): Promise<{ articles: Article[], totalPages: number }> => {
  try {
    const timestamp = new Date().getTime();
    let url = `${API_BASE_URL}/posts?_embed&page=${page}&per_page=${perPage}&_=${timestamp}`;
    
    // Filter out sponsored category (554) from categories filter
    if (categories && categories.length > 0) {
      const filteredCategories = categories.filter(catId => catId !== 554);
      if (filteredCategories.length > 0) {
        url += `&categories=${filteredCategories.join(',')}`;
      }
    }
    
    // Exclude sponsored category from all requests
    url += `&categories_exclude=554`;
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
      } else if (response.status >= 500) {
        throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
      } else if (response.status === 404) {
        throw new Error('Nie znaleziono artykułów.');
      } else {
        throw new Error(`Błąd API: ${response.status}`);
      }
    }
    
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
    const articles = await response.json();
    
    if (!Array.isArray(articles)) {
      throw new Error('Nieprawidłowy format odpowiedzi API');
    }
    
    // Process articles to extract featured image URL
    const processedArticles = articles.map((article: Article) => {
      let featured_media_url = undefined;
      
      if (article._embedded && 
          article._embedded['wp:featuredmedia'] && 
          article._embedded['wp:featuredmedia'][0]) {
        featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
      }
      
      return {
        ...article,
        featured_media_url
      };
    });
    
    // Filter out sponsored content as additional safety measure
    const filteredArticles = filterSponsoredArticles(processedArticles);
    
    // Cache the articles
    if (page === 1) {
      await cacheData(CACHE_KEY_ARTICLES, { articles: filteredArticles, totalPages });
    }
    
    return { 
      articles: filteredArticles, 
      totalPages 
    };
  } catch (error: any) {
    // Attempt to load from cache if fetch fails
    if (page === 1) {
      const cachedData = await getCachedData(CACHE_KEY_ARTICLES);
      if (cachedData) {
        console.log('Using cached articles data');
        // Filter cached data as well
        const filteredCachedArticles = filterSponsoredArticles(cachedData.articles);
        return { ...cachedData, articles: filteredCachedArticles };
      }
    }
    
    // Provide more user-friendly error messages
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
    } else if (error.message === 'Failed to fetch') {
      throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error('Wystąpił problem podczas ładowania artykułów. Spróbuj ponownie później.');
  }
};

export const fetchArticleById = async (id: number): Promise<Article> => {
  try {
    const timestamp = new Date().getTime();
    const url = `${API_BASE_URL}/posts/${id}?_embed&_=${timestamp}`;
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Artykuł nie został znaleziony.');
      } else if (response.status === 429) {
        throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
      } else if (response.status >= 500) {
        throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
      } else {
        throw new Error(`Błąd API: ${response.status}`);
      }
    }
    
    const article = await response.json();
    
    // Process article to extract featured image URL
    let featured_media_url = undefined;
    
    if (article._embedded && 
        article._embedded['wp:featuredmedia'] && 
        article._embedded['wp:featuredmedia'][0]) {
      featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
    }
    
    const processedArticle = {
      ...article,
      featured_media_url
    };
    
    // Check if this is sponsored content and throw error if it is
    if (filterSponsoredArticles([processedArticle]).length === 0) {
      throw new Error('Artykuł nie został znaleziony.');
    }
    
    return processedArticle;
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
    } else if (error.message === 'Failed to fetch') {
      throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error('Wystąpił problem podczas ładowania artykułu. Spróbuj ponownie później.');
  }
};

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const timestamp = new Date().getTime();
    const url = `${API_BASE_URL}/categories?per_page=100&exclude=554&_=${timestamp}`;
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
      } else if (response.status >= 500) {
        throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
      } else {
        throw new Error(`Błąd API: ${response.status}`);
      }
    }
    
    const categories = await response.json();
    
    // Filter out sponsored categories as additional safety measure
    const filteredCategories = filterSponsoredCategories(categories);
    
    // Cache the categories
    await cacheData(CACHE_KEY_CATEGORIES, filteredCategories);
    
    return filteredCategories;
  } catch (error: any) {
    // Attempt to load from cache if fetch fails
    const cachedData = await getCachedData(CACHE_KEY_CATEGORIES);
    if (cachedData) {
      console.log('Using cached categories data');
      // Filter cached data as well
      return filterSponsoredCategories(cachedData);
    }
    
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
    } else if (error.message === 'Failed to fetch') {
      throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error('Wystąpił problem podczas ładowania kategorii. Spróbuj ponownie później.');
  }
};

export const searchArticles = async (
  query: string,
  page = 1,
  perPage = 10
): Promise<{ articles: Article[], totalPages: number }> => {
  try {
    const timestamp = new Date().getTime();
    let url = `${API_BASE_URL}/posts?_embed&search=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&_=${timestamp}`;
    
    // Exclude sponsored category from search results
    url += `&categories_exclude=554`;
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
      } else if (response.status >= 500) {
        throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
      } else {
        throw new Error(`Błąd API: ${response.status}`);
      }
    }
    
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
    const articles = await response.json();
    
    if (!Array.isArray(articles)) {
      throw new Error('Nieprawidłowy format odpowiedzi API');
    }
    
    // Process articles to extract featured image URL
    const processedArticles = articles.map((article: Article) => {
      let featured_media_url = undefined;
      
      if (article._embedded && 
          article._embedded['wp:featuredmedia'] && 
          article._embedded['wp:featuredmedia'][0]) {
        featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
      }
      
      return {
        ...article,
        featured_media_url
      };
    });
    
    // Filter out sponsored content as additional safety measure
    const filteredArticles = filterSponsoredArticles(processedArticles);
    
    return { 
      articles: filteredArticles, 
      totalPages 
    };
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
    } else if (error.message === 'Failed to fetch') {
      throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error('Wystąpił problem podczas wyszukiwania artykułów. Spróbuj ponownie później.');
  }
};

// Fetch media items by IDs for gallery
export const fetchMediaByIds = async (ids: string[]): Promise<MediaItem[]> => {
  if (!ids || ids.length === 0) {
    return [];
  }
  
  try {
    const timestamp = new Date().getTime();
    const idsString = ids.join(',');
    const cacheKey = `${CACHE_KEY_MEDIA}_${idsString}`;
    
    // Check cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    const url = `${API_BASE_URL}/media?include=${idsString}&per_page=100&_=${timestamp}`;
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return []; // No media found
      } else if (response.status === 429) {
        throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
      } else if (response.status >= 500) {
        throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
      } else {
        throw new Error(`Błąd API: ${response.status}`);
      }
    }
    
    const media = await response.json();
    
    if (!Array.isArray(media)) {
      return [];
    }
    
    // Cache the media data
    await cacheData(cacheKey, media);
    
    return media;
  } catch (error: any) {
    console.warn('Error fetching media:', error);
    
    // Return empty array on error to not break the UI
    return [];
  }
};

// Fetch related articles based on categories
export const fetchRelatedArticles = async (
  currentArticleId: number,
  categories: number[],
  limit = 8 // Increased to get more for slider (5) + list (3)
): Promise<{ sliderArticles: Article[], listArticles: Article[] }> => {
  try {
    const timestamp = new Date().getTime();
    
    // Filter out sponsored category from categories
    const filteredCategories = categories.filter(catId => catId !== 554);
    
    let url = `${API_BASE_URL}/posts?_embed&per_page=${limit * 2}&exclude=${currentArticleId}&_=${timestamp}`;
    
    // If we have categories, use them for related articles
    if (filteredCategories.length > 0) {
      url += `&categories=${filteredCategories.join(',')}`;
    }
    
    // Always exclude sponsored category
    url += `&categories_exclude=554`;
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      // If categories-based search fails, try without categories
      if (filteredCategories.length > 0) {
        const fallbackUrl = `${API_BASE_URL}/posts?_embed&per_page=${limit * 2}&exclude=${currentArticleId}&categories_exclude=554&_=${timestamp}`;
        const fallbackResponse = await fetchWithTimeout(fallbackUrl);
        
        if (!fallbackResponse.ok) {
          return { sliderArticles: [], listArticles: [] };
        }
        
        const fallbackArticles = await fallbackResponse.json();
        if (!Array.isArray(fallbackArticles)) {
          return { sliderArticles: [], listArticles: [] };
        }
        
        const processedFallbackArticles = fallbackArticles.map((article: Article) => {
          let featured_media_url = undefined;
          
          if (article._embedded && 
              article._embedded['wp:featuredmedia'] && 
              article._embedded['wp:featuredmedia'][0]) {
            featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
          }
          
          return {
            ...article,
            featured_media_url
          };
        });
        
        // Filter out sponsored content and split results
        const filteredFallbackArticles = filterSponsoredArticles(processedFallbackArticles);
        return {
          sliderArticles: filteredFallbackArticles.slice(0, 5), // Increased to 5
          listArticles: filteredFallbackArticles.slice(5, 8) // Take next 3
        };
      }
      
      return { sliderArticles: [], listArticles: [] };
    }
    
    const articles = await response.json();
    
    if (!Array.isArray(articles)) {
      return { sliderArticles: [], listArticles: [] };
    }
    
    // Process articles to extract featured image URL
    const processedArticles = articles.map((article: Article) => {
      let featured_media_url = undefined;
      
      if (article._embedded && 
          article._embedded['wp:featuredmedia'] && 
          article._embedded['wp:featuredmedia'][0]) {
        featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
      }
      
      return {
        ...article,
        featured_media_url
      };
    });
    
    // Filter out sponsored content and split results
    const filteredArticles = filterSponsoredArticles(processedArticles);
    return {
      sliderArticles: filteredArticles.slice(0, 5), // Increased to 5
      listArticles: filteredArticles.slice(5, 8) // Take next 3
    };
  } catch (error: any) {
    console.warn('Error fetching related articles:', error);
    return { sliderArticles: [], listArticles: [] };
  }
};

// Get next/previous article for swipe navigation
export const getAdjacentArticle = async (
  currentArticleId: number,
  direction: 'next' | 'prev'
): Promise<Article | null> => {
  try {
    const timestamp = new Date().getTime();
    
    // For next article, get articles with ID greater than current
    // For prev article, get articles with ID less than current
    const operator = direction === 'next' ? 'after' : 'before';
    const order = direction === 'next' ? 'asc' : 'desc';
    
    let url = `${API_BASE_URL}/posts?_embed&per_page=1&${operator}=${currentArticleId}&order=${order}&categories_exclude=554&_=${timestamp}`;
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      return null;
    }
    
    const articles = await response.json();
    
    if (!Array.isArray(articles) || articles.length === 0) {
      return null;
    }
    
    const article = articles[0];
    
    // Process article to extract featured image URL
    let featured_media_url = undefined;
    
    if (article._embedded && 
        article._embedded['wp:featuredmedia'] && 
        article._embedded['wp:featuredmedia'][0]) {
      featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
    }
    
    const processedArticle = {
      ...article,
      featured_media_url
    };
    
    // Check if this is sponsored content
    if (filterSponsoredArticles([processedArticle]).length === 0) {
      return null;
    }
    
    return processedArticle;
  } catch (error: any) {
    console.warn('Error fetching adjacent article:', error);
    return null;
  }
};

// Register push token with backend
export const registerPushToken = async (registration: PushTokenRegistration): Promise<void> => {
  try {
    const url = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/register-push-token';
    
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registration),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to register push token: ${response.status}`);
    }
  } catch (error) {
    // Don't throw here - we don't want to break the app if registration fails
    console.warn('Push token registration failed:', error);
  }
};