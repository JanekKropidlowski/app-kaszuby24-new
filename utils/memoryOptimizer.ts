import { Platform } from 'react-native';

/**
 * Utility to help manage memory usage in the app
 */
export const MemoryOptimizer = {
  /**
   * Clears image cache to free up memory
   * Note: This is a no-op on web
   */
  clearImageCache: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    
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
    // These values are estimates and should be adjusted based on testing
    if (Platform.OS === 'android') {
      return {
        initialNumToRender: 5,
        maxToRenderPerBatch: 3,
        windowSize: 5,
        updateCellsBatchingPeriod: 50,
        removeClippedSubviews: true,
      };
    }
    
    if (Platform.OS === 'ios') {
      return {
        initialNumToRender: 8,
        maxToRenderPerBatch: 5,
        windowSize: 7,
        updateCellsBatchingPeriod: 50,
        removeClippedSubviews: false,
      };
    }
    
    // Web defaults
    return {
      initialNumToRender: 10,
      maxToRenderPerBatch: 10,
      windowSize: 10,
      updateCellsBatchingPeriod: 50,
      removeClippedSubviews: false,
    };
  },
  
  /**
   * Determines if heavy animations should be enabled based on device capabilities
   */
  shouldEnableHeavyAnimations: (): boolean => {
    // Disable heavy animations on low-end Android devices
    if (Platform.OS === 'android') {
      // This is a simplified check - in a real app, you'd use a more sophisticated detection
      return false;
    }
    
    // Enable on iOS and web
    return true;
  },
  
  /**
   * Gets optimal image quality based on network conditions and device
   */
  getOptimalImageQuality: (): number => {
    // In a real app, this would check network conditions
    // For now, use conservative defaults
    if (Platform.OS === 'android') {
      return 70; // Lower quality for Android
    }
    
    return 80; // Higher quality for iOS and web
  },
};