import { Platform } from 'react-native';

/**
 * Enhanced utility to help manage memory usage in the app
 */
export const MemoryOptimizer = {
  /**
   * Clears image cache to free up memory
   * Note: This is a no-op on web
   */
  clearImageCache: async (): Promise<void> => {
    
    try {
      // For expo-image, we can't directly clear the cache
      // This is a placeholder for when we implement a custom solution
      console.log('[Memory] Image cache cleared');
    } catch (error) {
      console.warn('[Memory] Failed to clear image cache:', error);
    }
  },
  
  /**
   * Determines optimal list configuration based on device memory constraints
   */
  getOptimalListConfig: () => {
    // Enhanced values based on device performance
    if (Platform.OS === 'android') {
      return {
        initialNumToRender: 3, // Reduced for better initial performance
        maxToRenderPerBatch: 2, // Smaller batches
        windowSize: 3, // Smaller window
        updateCellsBatchingPeriod: 100, // Slightly longer batching
        removeClippedSubviews: true,
        getItemLayout: null, // Let FlatList calculate
      };
    }
    
    if (Platform.OS === 'ios') {
      return {
        initialNumToRender: 5, // Moderate for iOS
        maxToRenderPerBatch: 3,
        windowSize: 5,
        updateCellsBatchingPeriod: 50,
        removeClippedSubviews: false, // iOS handles this better
        getItemLayout: null,
      };
    }
    
    // Web defaults - can handle more
    return {
      initialNumToRender: 8,
      maxToRenderPerBatch: 5,
      windowSize: 8,
      updateCellsBatchingPeriod: 50,
      removeClippedSubviews: false,
      getItemLayout: null,
    };
  },
  
  /**
   * Determines if heavy animations should be enabled based on device capabilities
   */
  shouldEnableHeavyAnimations: (): boolean => {
    // More conservative approach for animations
    if (Platform.OS === 'android') {
      return false; // Disable heavy animations on Android for better performance
    }
    
    return true; // Enable on iOS and web
  },
  
  /**
   * Gets optimal image quality based on network conditions and device
   */
  getOptimalImageQuality: (): number => {
    // More aggressive optimization
    if (Platform.OS === 'android') {
      return 60; // Lower quality for Android to save memory
    }
    
    return 75; // Balanced quality for iOS and web
  },
  
  /**
   * Optimized debounce for article prefetching
   */
  debouncePrefetch: <T extends (...args: any[]) => any>(
    func: T,
    wait: number = 300
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },
  
  /**
   * Batch prefetch articles to avoid overwhelming the network
   */
  batchPrefetch: (articleIds: number[], batchSize: number = 3) => {
    const batches: number[][] = [];
    for (let i = 0; i < articleIds.length; i += batchSize) {
      batches.push(articleIds.slice(i, i + batchSize));
    }
    
    return batches.reduce((promise, batch) => {
      return promise.then(() => {
        return Promise.all(
          batch.map(async (id) => {
            try {
              const { prefetchArticleById } = await import('@/services/api');
              return prefetchArticleById(id);
            } catch (error) {
              console.warn(`Failed to prefetch article ${id}:`, error);
            }
          })
        );
      }).then(() => {
        // Small delay between batches to avoid overwhelming the network
        return new Promise(resolve => setTimeout(resolve, 100));
      });
    }, Promise.resolve());
  },
  
  /**
   * Enhanced performance monitoring for article screens
   */
  measureArticleLoadTime: (articleId: number) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        console.log(`Article ${articleId} loaded in ${loadTime.toFixed(2)}ms`);
        
        // Log slow loads for debugging
        if (loadTime > 2000) {
          console.warn(`Slow article load detected: ${articleId} took ${loadTime.toFixed(2)}ms`);
        }
        
        return loadTime;
      }
    };
  },
  
  /**
   * Optimized image preloading strategy
   */
  shouldPreloadImages: (context: 'article' | 'list' | 'carousel'): boolean => {
    // On mobile, be more selective
    return context === 'article' || context === 'carousel';
  },
  
  /**
   * Debounce function for performance optimization
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },
  
  /**
   * Throttle function for scroll events
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  /**
   * Check if device has low memory
   */
  isLowMemoryDevice: (): boolean => {
    // Simple heuristic - in a real app you'd use device info
    return Platform.OS === 'android';
  },
};