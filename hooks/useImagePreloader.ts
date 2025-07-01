import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { Platform } from 'react-native';

/**
 * Hook to preload images for faster rendering
 * 
 * @param urls Array of image URLs to preload
 * @param onComplete Callback when all images are preloaded
 * @returns Object with loading state and progress
 */
export const useImagePreloader = (
  urls: (string | undefined)[], 
  onComplete?: () => void
) => {
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Filter out undefined URLs
    const validUrls = urls.filter(url => !!url) as string[];
    const totalImages = validUrls.length;
    
    if (totalImages === 0) {
      setIsLoading(false);
      onComplete?.();
      return;
    }
    
    setTotal(totalImages);
    setLoaded(0);
    setIsLoading(true);
    
    // Skip preloading on web to avoid unnecessary network requests
    if (Platform.OS === 'web') {
      setIsLoading(false);
      onComplete?.();
      return;
    }
    
    let mounted = true;
    let loadedCount = 0;
    
    const preloadImage = async (url: string) => {
      try {
        await Image.prefetch(url);
        
        if (!mounted) return;
        
        loadedCount++;
        setLoaded(loadedCount);
        
        if (loadedCount === totalImages && mounted) {
          setIsLoading(false);
          onComplete?.();
        }
      } catch (error) {
        console.warn(`Failed to preload image: ${url}`, error);
        
        if (!mounted) return;
        
        loadedCount++;
        setLoaded(loadedCount);
        
        if (loadedCount === totalImages && mounted) {
          setIsLoading(false);
          onComplete?.();
        }
      }
    };
    
    // Preload images in parallel with a limit of 3 concurrent requests
    const preloadBatch = async (batch: string[]) => {
      await Promise.all(batch.map(url => preloadImage(url)));
    };
    
    // Split URLs into batches of 3
    const batchSize = 3;
    const batches: string[][] = [];
    
    for (let i = 0; i < validUrls.length; i += batchSize) {
      batches.push(validUrls.slice(i, i + batchSize));
    }
    
    // Process batches sequentially
    const processBatches = async () => {
      for (const batch of batches) {
        if (!mounted) break;
        await preloadBatch(batch);
      }
    };
    
    processBatches();
    
    return () => {
      mounted = false;
    };
  }, [urls, onComplete]);
  
  const progress = total > 0 ? loaded / total : 0;
  
  return {
    isLoading,
    loaded,
    total,
    progress,
  };
};