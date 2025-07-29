import { Platform } from 'react-native';

/**
 * Optimizes image URLs for faster loading and better performance
 * 
 * @param url Original image URL
 * @param width Desired width
 * @param quality Image quality (1-100)
 * @returns Optimized image URL
 */
export const optimizeImageUrl = (url: string | undefined, width: number = 400, quality: number = 70): string | undefined => {
  if (!url) return undefined;
  
  // Don't optimize already optimized URLs
  if (url.includes('w=') || url.includes('resize=')) {
    return url;
  }
  
  try {
    // WordPress image optimization with more aggressive defaults
    if (url.includes('wp-content/uploads')) {
      // Check if URL already has query parameters
      const hasParams = url.includes('?');
      const separator = hasParams ? '&' : '?';
      
      // Add width and quality parameters with more aggressive optimization
      return `${url}${separator}w=${width}&quality=${quality}&format=webp`;
    }
    
    // For other image types, return the original URL
    return url;
  } catch (error) {
    console.warn('Error optimizing image URL:', error);
    return url;
  }
};

/**
 * Generate a low-quality image placeholder (LQIP) URL
 */
export const generateLQIP = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  
  try {
    if (url.includes('wp-content/uploads')) {
      const hasParams = url.includes('?');
      const separator = hasParams ? '&' : '?';
      
      // Generate a very small, low quality version for LQIP
      return `${url}${separator}w=20&quality=20&blur=5`;
    }
    
    return url;
  } catch (error) {
    console.warn('Error generating LQIP:', error);
    return url;
  }
};

/**
 * Determines the appropriate image priority based on context
 * 
 * @param context The context where the image is used
 * @returns Priority value for expo-image
 */
export const getImagePriority = (context: 'featured' | 'list' | 'thumbnail' | 'gallery'): 'high' | 'normal' | 'low' => {
  switch (context) {
    case 'featured':
      return 'high';
    case 'list':
      return 'normal';
    case 'thumbnail':
    case 'gallery':
      return 'low';
    default:
      return 'normal';
  }
};

/**
 * Calculates optimal image dimensions based on device with performance considerations
 * 
 * @param originalWidth Original width
 * @param originalHeight Original height
 * @param maxWidth Maximum width constraint
 * @param context The context where the image is used
 * @returns Calculated dimensions { width, height }
 */
export const calculateImageDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  context: 'featured' | 'list' | 'thumbnail' = 'list'
): { width: number; height: number } => {
  // Apply different max widths based on context for better performance
  let contextMaxWidth = maxWidth;
  
  switch (context) {
    case 'thumbnail':
      contextMaxWidth = Math.min(maxWidth, 200);
      break;
    case 'list':
      contextMaxWidth = Math.min(maxWidth, 400);
      break;
    case 'featured':
      contextMaxWidth = Math.min(maxWidth, 800);
      break;
  }
  
  if (originalWidth <= contextMaxWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  const calculatedHeight = contextMaxWidth / aspectRatio;
  
  return {
    width: contextMaxWidth,
    height: calculatedHeight,
  };
};

/**
 * Determines if an image should be preloaded based on its importance and device capabilities
 */
export const shouldPreloadImage = (importance: 'high' | 'medium' | 'low'): boolean => {
  // On mobile, only preload high importance images to save bandwidth and memory
  return importance === 'high';
};

/**
 * Get optimized image props for expo-image
 */
export const getOptimizedImageProps = (
  url: string | undefined,
  context: 'featured' | 'list' | 'thumbnail' | 'gallery' = 'list'
) => {
  const priority = getImagePriority(context);
  const cachePolicy: 'memory-disk' | 'memory' = context === 'featured' ? 'memory-disk' : 'memory';
  
  // Optimize URL based on context
  let optimizedUrl = url;
  if (url) {
    const widthMap = {
      featured: 800,
      list: 400,
      thumbnail: 200,
      gallery: 600,
    };
    
    const qualityMap = {
      featured: 80,
      list: 70,
      thumbnail: 60,
      gallery: 75,
    };
    
    optimizedUrl = optimizeImageUrl(url, widthMap[context], qualityMap[context]);
  }
  
  return {
    source: optimizedUrl ? { uri: optimizedUrl } : undefined,
    priority,
    cachePolicy,
    transition: context === 'featured' ? 300 : 200,
    placeholder: 'Loading...',
  };
};

/**
 * Get progressive image loading props with LQIP support
 */
export const getProgressiveImageProps = (
  url: string | undefined,
  context: 'featured' | 'list' | 'thumbnail' | 'gallery' = 'list'
) => {
  const priority = getImagePriority(context);
  const cachePolicy: 'memory-disk' | 'memory' = context === 'featured' ? 'memory-disk' : 'memory';
  
  const widthMap = {
    featured: 800,
    list: 400,
    thumbnail: 200,
    gallery: 600,
  };
  
  const qualityMap = {
    featured: 80,
    list: 70,
    thumbnail: 60,
    gallery: 75,
  };
  
  const optimizedUrl = url ? optimizeImageUrl(url, widthMap[context], qualityMap[context]) : undefined;
  const lqipUrl = url ? generateLQIP(url) : undefined;
  
  return {
    source: optimizedUrl ? { uri: optimizedUrl } : undefined,
    placeholder: lqipUrl ? { uri: lqipUrl } : 'Loading...',
    priority,
    cachePolicy,
    transition: context === 'featured' ? 300 : 200,
    contentFit: 'cover' as const,
    allowDownscaling: true,
    recyclingKey: url, // Help with memory management
  };
};