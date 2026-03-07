import { Article, Category, MediaItem, Nekrolog, Artist, Venue } from '@/types/article';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Vibration } from 'react-native';
import { filterSponsoredArticles, filterSponsoredCategories, isSponsoredContent } from '@/utils/contentFilter';

const API_BASE_URL = 'https://kaszuby24.pl/wp-json/wp/v2';
const API_TIMEOUT = 30000; // Increased timeout to 30 seconds
export const MAX_RETRIES = 2; // Export for use in other files
const CACHE_KEY_ARTICLES = 'cached_articles';
const CACHE_KEY_CATEGORIES = 'cached_categories';
const CACHE_KEY_MEDIA = 'cached_media';
const CACHE_KEY_SINGLE_ARTICLE = 'cached_single_article';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const STALE_WHILE_REVALIDATE_DURATION = 5 * 60 * 1000; // 5 minutes for stale-while-revalidate

// Request deduplication map - simplified approach
const pendingRequests = new Map<string, Promise<any>>();

// Expo Push token registration interface
export interface ExpoPushTokenRegistration {
  pushToken: string;
  location: string;
  locationId: number;
  platform: string;
  preferences?: {
    regions: number[];
    categories: number[];
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
        // Add Android-specific headers for better compatibility
        ...(Platform.OS === 'android' && {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }),
        ...((options as any)?.headers || {}),
      },
    };

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeout);


    return response;
  } catch (error: any) {
    clearTimeout(timeout);

    console.error(`Fetch error for ${url}:`, error);

    // Enhanced Android-specific error handling
    const isAndroidNetworkError = Platform.OS === 'android' && (
      error.message?.includes('java.io.IOException') ||
      error.message?.includes('remote update request') ||
      error.message?.includes('cleartext') ||
      error.message?.includes('not permitted') ||
      error.name === 'TypeError' && error.message?.includes('Network')
    );

    if (isAndroidNetworkError) {
      console.warn('Android-specific network error detected:', error.message);

      if (retries < MAX_RETRIES) {
        // Use longer delay for Android network issues
        const delay = Math.min(2000 * Math.pow(2, retries), 6000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithTimeout(url, options, retries + 1);
      }

      throw new Error('Problem z połączeniem sieciowym na Androidzie. Sprawdź ustawienia aplikacji i spróbuj ponownie.');
    }

    // Handle AbortError specifically - don't retry if manually aborted
    if (error.name === 'AbortError') {
      // Check if this was a timeout abort or manual abort
      if (retries < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retries), 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithTimeout(url, options, retries + 1);
      }
      throw new Error('Zapytanie zostało przerwane. Spróbuj ponownie.');
    }

    // Retry logic for other errors
    if (retries < MAX_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, retries), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithTimeout(url, options, retries + 1);
    }

    // Enhanced error handling
    if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
      throw new Error('Brak połączenia z internetem. Sprawdź ustawienia sieci.');
    }

    throw error;
  }
};

// Helper function to cache data with stale-while-revalidate
const cacheDataWithSWR = async (key: string, data: any) => {
  try {
    const timestampedData = {
      data,
      timestamp: Date.now(),
    };

    const serializedData = JSON.stringify(timestampedData);

    // Only cache if data is reasonable size (< 1MB)
    if (serializedData.length < 1024 * 1024) {
      await AsyncStorage.setItem(key, serializedData);
    }
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
};

// Helper function to retrieve cached data with stale-while-revalidate
const getCachedDataWithSWR = async (key: string) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < CACHE_DURATION) {
        // Fresh data
        return { data, isStale: false, shouldRevalidate: false };
      } else if (age < CACHE_DURATION + STALE_WHILE_REVALIDATE_DURATION) {
        // Stale but usable data
        return { data, isStale: true, shouldRevalidate: true };
      } else {
        // Too old, remove from cache
        AsyncStorage.removeItem(key).catch(() => { });
        return null;
      }
    }
  } catch (error) {
    console.warn('Cache read failed:', error);
    AsyncStorage.removeItem(key).catch(() => { });
  }
  return null;
};

// Simple cache functions for backward compatibility
const cacheData = async (key: string, data: any) => {
  try {
    const timestampedData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(timestampedData));
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
};

const getCachedData = async (key: string) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < CACHE_DURATION) {
        return data;
      } else {
        AsyncStorage.removeItem(key).catch(() => { });
        return null;
      }
    }
  } catch (error) {
    console.warn('Cache read failed:', error);
    AsyncStorage.removeItem(key).catch(() => { });
  }
  return null;
};

// Simplified request deduplication
const deduplicateRequest = async <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
  // Check if there's already a pending request
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};

// Function to cancel all pending requests
export const cancelAllRequests = () => {
  pendingRequests.clear();
};

// Function to cancel specific request
export const cancelRequest = (key: string) => {
  if (pendingRequests.has(key)) {
    pendingRequests.delete(key);
  }
};

export const fetchArticles = async (
  page = 1,
  perPage = 15, // Reduced for better infinite scroll performance
  categories?: number[]
): Promise<{ articles: Article[], totalPages: number }> => {
  const requestKey = `articles_${page}_${perPage}_${categories?.join(',') || 'all'}`;

  return deduplicateRequest(requestKey, async () => {
    try {

      // Try to get from cache first for faster initial load (only for first page)
      if (page === 1) {
        const cacheKey = `${CACHE_KEY_ARTICLES}_${categories?.join(',') || 'all'}`;
        const cachedData = await getCachedDataWithSWR(cacheKey);
        if (cachedData && !cachedData.shouldRevalidate) {
          return cachedData.data;
        }
      }

      let url = `${API_BASE_URL}/posts?_embed&page=${page}&per_page=${perPage}`;

      // Filter out sponsored category (554) from categories filter
      if (categories && categories.length > 0) {
        const filteredCategories = categories.filter(catId => catId !== 554);
        if (filteredCategories.length > 0) {
          url += `&categories=${filteredCategories.join(',')}`;
        }
      }

      // Exclude sponsored category from all requests and ensure newest first
      url += `&categories_exclude=554&orderby=date&order=desc`;

      // Add a small random parameter to prevent caching issues
      url += `&_=${Date.now()}`;

      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        console.error(`API Error for Articles [${response.status}] URL: ${url}`);
        if (response.status === 429) {
          throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
        } else if (response.status >= 500) {
          // If server error, try to return cache if it's the first page
          if (page === 1) {
            const cacheKey = `${CACHE_KEY_ARTICLES}_${categories?.join(',') || 'all'}`;
            const cachedData = await getCachedDataWithSWR(cacheKey);
            if (cachedData) {
              console.warn('Returning cached articles after 500 error');
              return cachedData.data;
            }
          }
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
        console.error('Invalid API response format:', articles);
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

      // Filter out sponsored content (as additional safety measure) and sort by date (newest first)
      // Note: Backend already excludes category 554, but this is extra safety
      const filteredArticles = processedArticles
        .filter(article => !isSponsoredContent(article))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


      // Cache the articles (only first page to avoid memory issues)
      if (page === 1) {
        const cacheKey = `${CACHE_KEY_ARTICLES}_${categories?.join(',') || 'all'}`;
        await cacheDataWithSWR(cacheKey, { articles: filteredArticles, totalPages });
      }

      return {
        articles: filteredArticles,
        totalPages
      };
    } catch (error: any) {
      console.error('Error in fetchArticles:', error);

      // Attempt to load from cache if fetch fails and it's first page
      if (page === 1) {
        const cacheKey = `${CACHE_KEY_ARTICLES}_${categories?.join(',') || 'all'}`;
        const cachedData = await getCachedDataWithSWR(cacheKey);
        if (cachedData) {
          return cachedData.data;
        }
      }

      // Provide more user-friendly error messages
      if (error.message) {
        throw error;
      }

      throw new Error('Wystąpił problem podczas ładowania artykułów. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
  });
};

// Function to prefetch article by ID
export const prefetchArticleById = async (id: number): Promise<void> => {
  const requestKey = `prefetch_article_${id}`;

  // Check if already cached
  const cacheKey = `${CACHE_KEY_SINGLE_ARTICLE}_${id}`;
  const cached = await getCachedDataWithSWR(cacheKey);
  if (cached && !cached.shouldRevalidate) {
    return;
  }

  // Don't prefetch if already in progress
  if (pendingRequests.has(requestKey)) {
    return;
  }

  try {
    const article = await fetchArticleById(id);
  } catch (error) {
    console.warn(`Failed to prefetch article ${id}:`, error);
  }
};

// Function to prefetch article by slug
export const prefetchArticleBySlug = async (slug: string): Promise<void> => {
  const requestKey = `prefetch_article_slug_${slug}`;

  // Check if already cached
  const cacheKey = `${CACHE_KEY_SINGLE_ARTICLE}_slug_${slug}`;
  const cached = await getCachedDataWithSWR(cacheKey);
  if (cached && !cached.shouldRevalidate) {
    return;
  }

  // Don't prefetch if already in progress
  if (pendingRequests.has(requestKey)) {
    return;
  }

  try {
    const article = await fetchArticleBySlug(slug);
  } catch (error) {
    console.warn(`Failed to prefetch article ${slug}:`, error);
  }
};

// Function to fetch article by ID with enhanced error handling
export const fetchArticleById = async (id: number): Promise<Article> => {
  const requestKey = `article_${id}`;
  const cacheKey = `${CACHE_KEY_SINGLE_ARTICLE}_${id}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      // Try cache first (stale-while-revalidate)
      const cached = await getCachedDataWithSWR(cacheKey);

      if (cached) {
        if (!cached.shouldRevalidate) {
          // Fresh data, return immediately
          return cached.data;
        } else {
          // Stale data, return immediately but revalidate in background

          // Start background revalidation
          setTimeout(async () => {
            try {
              const timestamp = new Date().getTime();
              const url = `${API_BASE_URL}/posts/${id}?_embed&_=${timestamp}`;

              const response = await fetchWithTimeout(url);
              if (response.ok) {
                const article = await response.json();

                let featured_media_url = undefined;
                if (article._embedded &&
                  article._embedded['wp:featuredmedia'] &&
                  article._embedded['wp:featuredmedia'][0]) {
                  featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
                }

                const processedArticle = { ...article, featured_media_url };

                if (!isSponsoredContent(processedArticle)) {
                  await cacheDataWithSWR(cacheKey, processedArticle);
                }
              }
            } catch (error) {
              console.warn(`Background revalidation failed for article ${id}:`, error);
            }
          }, 100);

          return cached.data;
        }
      }

      // No cache, fetch fresh data
      const timestamp = new Date().getTime();
      const url = `${API_BASE_URL}/posts/${id}?_embed&_=${timestamp}`;

      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        console.error(`Error fetching article ${id}: ${response.status} ${response.statusText}`);
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

      let featured_media_url = undefined;
      if (article._embedded &&
        article._embedded['wp:featuredmedia'] &&
        article._embedded['wp:featuredmedia'][0]) {
        featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
      }

      const processedArticle = { ...article, featured_media_url };

      if (isSponsoredContent(processedArticle)) {
        throw new Error('Artykuł nie został znaleziony.');
      }

      // Cache the fresh data
      await cacheDataWithSWR(cacheKey, processedArticle);

      return processedArticle;
    } catch (error: any) {
      console.error('Error in fetchArticleById:', error);

      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
      } else if (error?.name === 'AbortError') {
        throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
      } else if (error.message === 'Failed to fetch') {
        throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
      }

      if (error.message) {
        throw error;
      }

      throw new Error('Wystąpił problem podczas ładowania artykułu. Spróbuj ponownie później.');
    }
  });
};

export const fetchArticleBySlug = async (slug: string): Promise<Article> => {
  const requestKey = `article_slug_${slug}`;
  const cacheKey = `${CACHE_KEY_SINGLE_ARTICLE}_slug_${slug}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      // Try cache first (stale-while-revalidate)
      const cached = await getCachedDataWithSWR(cacheKey);

      if (cached) {
        if (!cached.shouldRevalidate) {
          return cached.data;
        } else {

          // Start background revalidation
          setTimeout(async () => {
            try {
              const timestamp = new Date().getTime();
              const url = `${API_BASE_URL}/posts?slug=${encodeURIComponent(slug)}&_embed&_=${timestamp}`;

              const response = await fetchWithTimeout(url);
              if (response.ok) {
                const articles = await response.json();

                if (Array.isArray(articles) && articles.length > 0) {
                  const article = articles[0];

                  let featured_media_url = undefined;
                  if (article._embedded &&
                    article._embedded['wp:featuredmedia'] &&
                    article._embedded['wp:featuredmedia'][0]) {
                    featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
                  }

                  const processedArticle = { ...article, featured_media_url };

                  if (!isSponsoredContent(processedArticle)) {
                    await cacheDataWithSWR(cacheKey, processedArticle);
                  }
                }
              }
            } catch (error) {
              console.warn(`Background revalidation failed for article ${slug}:`, error);
            }
          }, 100);

          return cached.data;
        }
      }

      // No cache, fetch fresh data
      const timestamp = new Date().getTime();
      const url = `${API_BASE_URL}/posts?slug=${encodeURIComponent(slug)}&_embed&_=${timestamp}`;

      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        console.error(`Error fetching article ${slug}: ${response.status} ${response.statusText}`);
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

      const articles = await response.json();

      if (!Array.isArray(articles) || articles.length === 0) {
        throw new Error('Artykuł nie został znaleziony.');
      }

      const article = articles[0];

      let featured_media_url = undefined;
      if (article._embedded &&
        article._embedded['wp:featuredmedia'] &&
        article._embedded['wp:featuredmedia'][0]) {
        featured_media_url = article._embedded['wp:featuredmedia'][0].source_url;
      }

      const processedArticle = { ...article, featured_media_url };

      if (isSponsoredContent(processedArticle)) {
        throw new Error('Artykuł nie został znaleziony.');
      }

      // Cache the fresh data
      await cacheDataWithSWR(cacheKey, processedArticle);

      return processedArticle;
    } catch (error: any) {
      console.error('Error in fetchArticleBySlug:', error);

      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
      } else if (error?.name === 'AbortError') {
        throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
      } else if (error.message === 'Failed to fetch') {
        throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
      }

      if (error.message) {
        throw error;
      }

      throw new Error('Wystąpił problem podczas wyszukiwania artykułów. Spróbuj ponownie później.');
    }
  });
};

export const fetchCategories = async (): Promise<Category[]> => {
  const requestKey = 'categories';

  return deduplicateRequest(requestKey, async () => {
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
        // Filter cached data as well
        return filterSponsoredCategories(cachedData);
      }

      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
      } else if (error?.name === 'AbortError') {
        throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
      } else if (error.message === 'Failed to fetch') {
        throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
      }

      if (error.message) {
        throw error;
      }

      throw new Error('Wystąpił problem podczas ładowania kategorii. Spróbuj ponownie później.');
    }
  });
};

// Function to fetch artist information by ID
export const fetchArtist = async (artistId: number): Promise<Artist | null> => {
  if (!artistId) return null;

  const requestKey = `artist_${artistId}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      const timestamp = new Date().getTime();
      const url = `https://kaszuby24.pl/wp-json/wp/v2/artysta/${artistId}?meta=true&_=${timestamp}`;

      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        console.warn(`Failed to fetch artist ${artistId}: ${response.status}`);
        return null;
      }

      const artist = await response.json();
      return artist;
    } catch (error: any) {
      console.warn(`Error fetching artist ${artistId}:`, error);
      return null;
    }
  });
};

// Function to fetch venue information by ID
export const fetchVenue = async (venueId: number): Promise<Venue | null> => {
  if (!venueId) return null;

  const requestKey = `venue_${venueId}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      const timestamp = new Date().getTime();
      const url = `https://kaszuby24.pl/wp-json/wp/v2/obiekt/${venueId}?meta=true&_=${timestamp}`;

      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        console.warn(`Failed to fetch venue ${venueId}: ${response.status}`);
        return null;
      }

      const venue = await response.json();
      return venue;
    } catch (error: any) {
      console.warn(`Error fetching venue ${venueId}:`, error);
      return null;
    }
  });
};

export const searchArticles = async (
  query: string,
  page = 1,
  perPage = 10
): Promise<{ articles: Article[], totalPages: number }> => {
  const requestKey = `search_${query}_${page}_${perPage}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      // Provide haptic feedback when search starts (on native platforms)
      if (Platform.OS !== 'web') {
        try {
          Vibration.vibrate(30);
        } catch (e) {
          // Ignore vibration errors
        }
      }

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
      } else if (error?.name === 'AbortError') {
        throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
      } else if (error.message === 'Failed to fetch') {
        throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
      }

      if (error.message) {
        throw error;
      }

      throw new Error('Wystąpił problem podczas wyszukiwania artykułów. Spróbuj ponownie później.');
    }
  });
};

// Fetch media items by IDs for gallery
export const fetchMediaByIds = async (ids: string[]): Promise<MediaItem[]> => {
  if (!ids || ids.length === 0) {
    return [];
  }

  const requestKey = `media_${ids.join(',')}`;

  return deduplicateRequest(requestKey, async () => {
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
  });
};

// Fetch related articles based on categories
export const fetchRelatedArticles = async (
  currentArticleId: number,
  categories: number[],
  limit = 8, // Increased to get more for slider (5) + list (3)
  page = 1 // Dodany parametr page dla paginacji
): Promise<{ sliderArticles: Article[], listArticles: Article[] }> => {
  const requestKey = `related_${currentArticleId}_${categories.join(',')}_${limit}_${page}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      const timestamp = new Date().getTime();

      // Filter out sponsored category from categories
      const filteredCategories = categories.filter(catId => catId !== 554);

      let url = `${API_BASE_URL}/posts?_embed&per_page=${limit * 2}&exclude=${currentArticleId}&page=${page}&_=${timestamp}`;

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
          const fallbackUrl = `${API_BASE_URL}/posts?_embed&per_page=${limit * 2}&exclude=${currentArticleId}&categories_exclude=554&page=${page}&_=${timestamp}`;
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
  });
};

// Get next/previous article for swipe navigation
export const getAdjacentArticle = async (
  currentArticleId: number,
  direction: 'next' | 'prev'
): Promise<Article | null> => {
  const requestKey = `adjacent_${currentArticleId}_${direction}`;

  return deduplicateRequest(requestKey, async () => {
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
      if (isSponsoredContent(processedArticle)) {
        return null;
      }

      return processedArticle;
    } catch (error: any) {
      console.warn('Error fetching adjacent article:', error);
      return null;
    }
  });
};

// Register Expo Push token with backend
export const registerExpoPushToken = async (registration: ExpoPushTokenRegistration): Promise<void> => {
  try {
    const url = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/register-expo-push-token';

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registration),
    });

    if (!response.ok) {
      throw new Error(`Failed to register Expo Push token: ${response.status}`);
    }

  } catch (error) {
    // Don't throw here - we don't want to break the app if registration fails
    console.warn('Expo Push token registration failed:', error);
  }
};

// Clear all caches (useful for debugging or when user wants to refresh)
export const clearAllCaches = async (): Promise<void> => {
  try {

    // Clear AsyncStorage cache
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key =>
      key.includes(CACHE_KEY_ARTICLES) ||
      key.includes(CACHE_KEY_CATEGORIES) ||
      key.includes(CACHE_KEY_MEDIA) ||
      key.includes(CACHE_KEY_SINGLE_ARTICLE)
    );

    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }

    // Clear pending requests
    cancelAllRequests();

  } catch (error) {
    console.error('Error clearing caches:', error);
  }
};

// Function to fetch nekrologi (obituaries)
export const fetchNekrologi = async (
  page = 1,
  perPage = 10
): Promise<{ nekrologi: Nekrolog[], totalPages: number }> => {
  const requestKey = `nekrologi_${page}_${perPage}`;

  return deduplicateRequest(requestKey, async () => {
    try {

      let url = `${API_BASE_URL}/nekrolog?page=${page}&per_page=${perPage}&orderby=date&order=desc`;

      // Add timestamp to prevent caching issues
      url += `&_=${Date.now()}`;

      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        console.error(`API Error for Nekrologi [${response.status}] URL: ${url}`);
        if (response.status === 429) {
          throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
        } else if (response.status >= 500) {
          // Try cache fallback
          const cacheKey = `cached_nekrologi_${page}`;
          const cached = await getCachedData(cacheKey);
          if (cached) {
            console.warn('Returning cached nekrologi after 500 error');
            return cached;
          }
          throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
        } else if (response.status === 404) {
          throw new Error('Nie znaleziono nekrologów.');
        } else {
          throw new Error(`Błąd API: ${response.status}`);
        }
      }

      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
      const nekrologi = await response.json();


      if (!Array.isArray(nekrologi)) {
        console.error('Invalid nekrologi API response format:', nekrologi);
        throw new Error('Nieprawidłowy format odpowiedzi API');
      }

      // Sort nekrologi by date (newest first)
      const sortedNekrologi = nekrologi.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );


      return {
        nekrologi: sortedNekrologi,
        totalPages
      };
    } catch (error: any) {
      console.error('Error in fetchNekrologi:', error);

      if (error.message) {
        throw error;
      }

      throw new Error('Wystąpił problem podczas ładowania nekrologów. Sprawdź połączenie internetowe i spróbuj ponownie.');
    }
  });
};

// Function to fetch single nekrolog by ID
export const fetchNekrologById = async (id: number): Promise<Nekrolog> => {
  const requestKey = `nekrolog_${id}`;
  const cacheKey = `${CACHE_KEY_SINGLE_ARTICLE}_nekrolog_${id}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      // Try cache first
      const cached = await getCachedDataWithSWR(cacheKey);

      if (cached) {
        if (!cached.shouldRevalidate) {
          return cached.data;
        } else {

          // Start background revalidation
          setTimeout(async () => {
            try {
              const timestamp = new Date().getTime();
              const url = `${API_BASE_URL}/nekrolog/${id}?_=${timestamp}`;

              const response = await fetchWithTimeout(url);
              if (response.ok) {
                const nekrolog = await response.json();
                await cacheDataWithSWR(cacheKey, nekrolog);
              }
            } catch (error) {
              console.warn(`Background revalidation failed for nekrolog ${id}:`, error);
            }
          }, 100);

          return cached.data;
        }
      }

      // No cache, fetch fresh data
      const timestamp = new Date().getTime();
      const url = `${API_BASE_URL}/nekrolog/${id}?_=${timestamp}`;

      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        console.error(`Error fetching nekrolog ${id}: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          throw new Error('Nekrolog nie został znaleziony.');
        } else if (response.status === 429) {
          throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
        } else if (response.status >= 500) {
          throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
        } else {
          throw new Error(`Błąd API: ${response.status}`);
        }
      }

      const nekrolog = await response.json();

      // Cache the fresh data
      await cacheDataWithSWR(cacheKey, nekrolog);

      return nekrolog;
    } catch (error: any) {
      console.error('Error in fetchNekrologById:', error);

      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
      } else if (error?.name === 'AbortError') {
        throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
      } else if (error.message === 'Failed to fetch') {
        throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
      }

      if (error.message) {
        throw error;
      }

      throw new Error('Wystąpił problem podczas ładowania nekrologu. Spróbuj ponownie później.');
    }
  });
};

export const fetchFilteredArticles = async (
  page = 1,
  perPage = 20,
  regionId?: string,
  dzialId?: string
): Promise<{ articles: Article[]; totalPages: number }> => {
  let url = `https://kaszuby24.pl/wp-json/kaszuby24/v1/posts-filtered?page=${page}&per_page=${perPage}`;
  if (regionId && regionId !== '') url += `&region=${parseInt(regionId)}`;
  if (dzialId && dzialId !== '') url += `&dzial=${parseInt(dzialId)}`;


  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('fetchFilteredArticles - error response:', errorText);

      // Fallback to standard WordPress REST API
      return await fetchArticlesWithCategories(page, perPage, regionId, dzialId);
    }

    const data = await response.json();

    // API zwraca { posts: [...], total_pages: n }
    return {
      articles: Array.isArray(data.posts) ? data.posts : [],
      totalPages: data.total_pages || 1,
    };
  } catch (error) {
    console.error('fetchFilteredArticles - error:', error);

    // Fallback to standard WordPress REST API
    return await fetchArticlesWithCategories(page, perPage, regionId, dzialId);
  }
};

// Fallback function using standard WordPress REST API
const fetchArticlesWithCategories = async (
  page = 1,
  perPage = 20,
  regionId?: string,
  dzialId?: string
): Promise<{ articles: Article[]; totalPages: number }> => {
  let url = `https://kaszuby24.pl/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}&_embed`;

  // Add category filters
  const categories: number[] = [];
  if (regionId && regionId !== '') categories.push(parseInt(regionId));
  if (dzialId && dzialId !== '') categories.push(parseInt(dzialId));

  if (categories.length > 0) {
    url += `&categories=${categories.join(',')}`;
  }


  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error('Błąd pobierania artykułów (fallback)');
  }

  const articles = await response.json();
  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');

  return {
    articles: Array.isArray(articles) ? articles : [],
    totalPages: totalPages,
  };
};

// Fetch related events based on categories and location
export const fetchRelatedEvents = async (
  currentEventId: number,
  categories: number[],
  location?: string,
  limit = 6
): Promise<any[]> => {
  const requestKey = `related_events_${currentEventId}_${categories.join(',')}_${location}_${limit}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      const timestamp = new Date().getTime();

      // Try the new related-events endpoint first
      let url = `https://kaszuby24.pl/wp-json/kaszuby24/v1/related-events?event_id=${currentEventId}&limit=${limit}&_embed&_=${timestamp}`;

      // Add category filter if available
      if (categories && categories.length > 0) {
        url += `&categories=${categories.join(',')}`;
      }

      // Add location filter if available
      if (location) {
        url += `&location=${encodeURIComponent(location)}`;
      }

      const response = await fetchWithTimeout(url);

      if (response.ok) {
        const events = await response.json();
        return Array.isArray(events) ? events.slice(0, limit) : [];
      }

      // Fallback to standard WordPress events endpoint
      let fallbackUrl = `https://kaszuby24.pl/wp-json/wp/v2/kalendarz?per_page=${limit * 2}&exclude=${currentEventId}&_embed&_=${timestamp}`;

      // Add category filter if available
      if (categories && categories.length > 0) {
        fallbackUrl += `&kategoria-wydarzenia=${categories.join(',')}`;
      }

      const fallbackResponse = await fetchWithTimeout(fallbackUrl);

      if (!fallbackResponse.ok) {
        console.warn(`Events API returned ${fallbackResponse.status}: ${fallbackResponse.statusText}`);
        return [];
      }

      const fallbackEvents = await fallbackResponse.json();
      return Array.isArray(fallbackEvents) ? fallbackEvents.slice(0, limit) : [];
    } catch (error: any) {
      console.warn('Error fetching related events:', error);
      return [];
    }
  });
};

// Function to fetch event by slug
export const fetchEventBySlug = async (slug: string): Promise<any> => {
  const requestKey = `event_slug_${slug}`;
  const cacheKey = `${CACHE_KEY_SINGLE_ARTICLE}_event_slug_${slug}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      // Try cache first
      const cached = await getCachedDataWithSWR(cacheKey);

      if (cached) {
        if (!cached.shouldRevalidate) {
          return cached.data;
        } else {

          // Start background revalidation
          setTimeout(async () => {
            try {
              const timestamp = new Date().getTime();
              const url = `https://kaszuby24.pl/wp-json/wp/v2/kalendarz?slug=${encodeURIComponent(slug)}&_=${timestamp}`;

              const response = await fetchWithTimeout(url);
              if (response.ok) {
                const events = await response.json();
                if (Array.isArray(events) && events.length > 0) {
                  await cacheDataWithSWR(cacheKey, events[0]);
                }
              }
            } catch (error) {
              console.warn(`Background revalidation failed for event ${slug}:`, error);
            }
          }, 100);

          return cached.data;
        }
      }

      // No cache, fetch fresh data
      const timestamp = new Date().getTime();
      const url = `https://kaszuby24.pl/wp-json/wp/v2/kalendarz?slug=${encodeURIComponent(slug)}&_=${timestamp}`;

      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        console.error(`Error fetching event ${slug}: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          throw new Error('Wydarzenie nie zostało znalezione.');
        } else if (response.status === 429) {
          throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
        } else if (response.status >= 500) {
          throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
        } else {
          throw new Error(`Błąd API: ${response.status}`);
        }
      }

      const events = await response.json();

      if (!Array.isArray(events) || events.length === 0) {
        throw new Error('Wydarzenie nie zostało znalezione.');
      }

      const event = events[0];

      // Cache the fresh data
      await cacheDataWithSWR(cacheKey, event);

      return event;
    } catch (error: any) {
      console.error('Error in fetchEventBySlug:', error);

      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
      } else if (error?.name === 'AbortError') {
        throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
      } else if (error.message === 'Failed to fetch') {
        throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
      }

      if (error.message) {
        throw error;
      }

      throw new Error('Wystąpił problem podczas wyszukiwania wydarzenia. Spróbuj ponownie później.');
    }
  });
};

// Function to fetch nekrolog by slug
export const fetchNekrologBySlug = async (slug: string): Promise<Nekrolog> => {
  const requestKey = `nekrolog_slug_${slug}`;
  const cacheKey = `${CACHE_KEY_SINGLE_ARTICLE}_nekrolog_slug_${slug}`;

  return deduplicateRequest(requestKey, async () => {
    try {
      // Try cache first
      const cached = await getCachedDataWithSWR(cacheKey);

      if (cached) {
        if (!cached.shouldRevalidate) {
          return cached.data;
        } else {

          // Start background revalidation
          setTimeout(async () => {
            try {
              const timestamp = new Date().getTime();
              const url = `https://kaszuby24.pl/wp-json/wp/v2/nekrolog?slug=${encodeURIComponent(slug)}&_=${timestamp}`;

              const response = await fetchWithTimeout(url);
              if (response.ok) {
                const nekrologi = await response.json();
                if (Array.isArray(nekrologi) && nekrologi.length > 0) {
                  await cacheDataWithSWR(cacheKey, nekrologi[0]);
                }
              }
            } catch (error) {
              console.warn(`Background revalidation failed for nekrolog ${slug}:`, error);
            }
          }, 100);

          return cached.data;
        }
      }

      // No cache, fetch fresh data
      const timestamp = new Date().getTime();
      const url = `https://kaszuby24.pl/wp-json/wp/v2/nekrolog?slug=${encodeURIComponent(slug)}&_=${timestamp}`;

      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        console.error(`Error fetching nekrolog ${slug}: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          throw new Error('Nekrolog nie został znaleziony.');
        } else if (response.status === 429) {
          throw new Error('Zbyt wiele zapytań. Proszę spróbować ponownie za chwilę.');
        } else if (response.status >= 500) {
          throw new Error('Serwer jest chwilowo niedostępny. Proszę spróbować ponownie później.');
        } else {
          throw new Error(`Błąd API: ${response.status}`);
        }
      }

      const nekrologi = await response.json();

      if (!Array.isArray(nekrologi) || nekrologi.length === 0) {
        throw new Error('Nekrolog nie został znaleziony.');
      }

      const nekrolog = nekrologi[0];

      // Cache the fresh data
      await cacheDataWithSWR(cacheKey, nekrolog);

      return nekrolog;
    } catch (error: any) {
      console.error('Error in fetchNekrologBySlug:', error);

      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.');
      } else if (error?.name === 'AbortError') {
        throw new Error('Zapytanie przekroczyło limit czasu. Spróbuj ponownie.');
      } else if (error.message === 'Failed to fetch') {
        throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
      }

      if (error.message) {
        throw error;
      }

      throw new Error('Wystąpił problem podczas wyszukiwania nekrologu. Spróbuj ponownie później.');
    }
  });
};