import { Article, Category } from '@/types/article';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = 'https://kaszuby24.pl/wp-json/wp/v2';
const API_TIMEOUT = Platform.OS === 'android' ? 45000 : 30000; // Longer timeout for Android
const MAX_RETRIES = Platform.OS === 'android' ? 3 : 5; // Fewer retries on Android to prevent ANR
const CACHE_KEY_ARTICLES = 'cached_articles';
const CACHE_KEY_CATEGORIES = 'cached_categories';
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
    console.log(`Fetching (attempt ${retries + 1}/${MAX_RETRIES}): ${url}`);
    
    // Add Android-specific headers
    const fetchOptions = {
      ...options,
      signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': Platform.OS === 'android' ? 'Kaszuby24-Android' : 'Kaszuby24-App',
        ...((options as any)?.headers || {}),
      },
    };
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    
    console.error(`Fetch error (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
    
    // Handle network errors with retries
    if (retries < MAX_RETRIES) {
      console.log(`Retry ${retries + 1}/${MAX_RETRIES} for: ${url}`);
      // Shorter delay for Android to prevent ANR
      const delay = Platform.OS === 'android' ? 1000 * (retries + 1) : 2000 * Math.pow(2, retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithTimeout(url, options, retries + 1);
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
    console.log(`Cached data for key: ${key}`);
  } catch (error) {
    console.error(`Error caching data for key ${key}:`, error);
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
        console.log(`Using cached data for key: ${key}`);
        return data;
      } else {
        console.log(`Cached data expired for key: ${key}`);
        // Clean up expired cache
        AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
    }
  } catch (error) {
    console.error(`Error retrieving cached data for key ${key}:`, error);
    // Clean up corrupted cache
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
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    let url = `${API_BASE_URL}/posts?_embed&page=${page}&per_page=${perPage}&_=${timestamp}`;
    
    if (categories && categories.length > 0) {
      url += `&categories=${categories.join(',')}`;
    }
    
    console.log('Fetching articles from:', url);
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      // Handle specific error codes
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
      console.error('API returned non-array response:', articles);
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
    
    console.log(`Successfully fetched ${processedArticles.length} articles`);
    
    // Cache the articles
    if (page === 1) {
      await cacheData(CACHE_KEY_ARTICLES, { articles: processedArticles, totalPages });
    }
    
    return { 
      articles: processedArticles, 
      totalPages 
    };
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    
    // Attempt to load from cache if fetch fails
    if (page === 1) {
      const cachedData = await getCachedData(CACHE_KEY_ARTICLES);
      if (cachedData) {
        console.log('Using cached articles due to fetch failure');
        return cachedData;
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
    
    // If we have a specific error message from earlier checks, use it
    if (error.message) {
      throw error;
    }
    
    // Generic fallback error
    throw new Error('Wystąpił problem podczas ładowania artykułów. Spróbuj ponownie później.');
  }
};

export const fetchArticleById = async (id: number): Promise<Article> => {
  try {
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    const url = `${API_BASE_URL}/posts/${id}?_embed&_=${timestamp}`;
    console.log('Fetching article by ID:', url);
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
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
    
    return {
      ...article,
      featured_media_url
    };
  } catch (error: any) {
    console.error('Error fetching article by ID:', error);
    
    // Provide more user-friendly error messages
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
    } else if (error.message === 'Failed to fetch') {
      throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
    
    // If we have a specific error message from earlier checks, use it
    if (error.message) {
      throw error;
    }
    
    // Generic fallback error
    throw new Error('Wystąpił problem podczas ładowania artykułu. Spróbuj ponownie później.');
  }
};

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    const url = `${API_BASE_URL}/categories?per_page=100&_=${timestamp}`;
    console.log('Fetching categories:', url);
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      if (response.status === 429) {
        throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
      } else if (response.status >= 500) {
        throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
      } else {
        throw new Error(`Błąd API: ${response.status}`);
      }
    }
    
    const categories = await response.json();
    
    // Cache the categories
    await cacheData(CACHE_KEY_CATEGORIES, categories);
    
    return categories;
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    
    // Attempt to load from cache if fetch fails
    const cachedData = await getCachedData(CACHE_KEY_CATEGORIES);
    if (cachedData) {
      console.log('Using cached categories due to fetch failure');
      return cachedData;
    }
    
    // Provide more user-friendly error messages
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
    } else if (error.message === 'Failed to fetch') {
      throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
    
    // If we have a specific error message from earlier checks, use it
    if (error.message) {
      throw error;
    }
    
    // Generic fallback error
    throw new Error('Wystąpił problem podczas ładowania kategorii. Spróbuj ponownie później.');
  }
};

export const searchArticles = async (
  query: string,
  page = 1,
  perPage = 10
): Promise<{ articles: Article[], totalPages: number }> => {
  try {
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    const url = `${API_BASE_URL}/posts?_embed&search=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&_=${timestamp}`;
    console.log('Searching articles:', url);
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
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
      console.error('API returned non-array response:', articles);
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
    
    return { 
      articles: processedArticles, 
      totalPages 
    };
  } catch (error: any) {
    console.error('Error searching articles:', error);
    
    // Provide more user-friendly error messages
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
    } else if (error.message === 'Failed to fetch') {
      throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
    
    // If we have a specific error message from earlier checks, use it
    if (error.message) {
      throw error;
    }
    
    // Generic fallback error
    throw new Error('Wystąpił problem podczas wyszukiwania artykułów. Spróbuj ponownie później.');
  }
};

// Register push token with backend
export const registerPushToken = async (registration: PushTokenRegistration): Promise<void> => {
  try {
    // For now, we'll use a custom endpoint on your WordPress site
    // You'll need to create this endpoint in your WordPress theme or plugin
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
    
    console.log('Push token registered successfully');
  } catch (error) {
    console.error('Error registering push token:', error);
    // Don't throw here - we don't want to break the app if registration fails
    // The token will be retried on next app launch
  }
};