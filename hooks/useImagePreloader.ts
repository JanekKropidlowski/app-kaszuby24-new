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
    
    // Preload images in parallel with a limit of 2 concurrent requests for better performance
    const preloadBatch = async (batch: string[]) => {
      await Promise.all(batch.map(url => preloadImage(url)));
    };
    
    // Split URLs into smaller batches of 2 for better memory management
    const batchSize = 2;
    const batches: string[][] = [];
    
    for (let i = 0; i < validUrls.length; i += batchSize) {
      batches.push(validUrls.slice(i, i + batchSize));
    }
    
    // Process batches sequentially with small delays
    const processBatches = async () => {
      for (const batch of batches) {
        if (!mounted) break;
        await preloadBatch(batch);
        // Small delay between batches to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
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