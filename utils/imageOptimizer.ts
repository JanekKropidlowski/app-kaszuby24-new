import { Platform } from 'react-native';

/**
 * Optimizes image URLs for faster loading and better performance
 * 
 * @param url Original image URL
 * @param width Desired width
 * @param quality Image quality (1-100)
 * @returns Optimized image URL
 */
export const optimizeImageUrl = (url: string | undefined, width: number = 600, quality: number = 80): string | undefined => {
  if (!url) return undefined;
  
  // Don't optimize already optimized URLs
  if (url.includes('w=') || url.includes('resize=')) {
    return url;
  }
  
  try {
    // WordPress image optimization
    if (url.includes('wp-content/uploads')) {
      // Check if URL already has query parameters
      const hasParams = url.includes('?');
      const separator = hasParams ? '&' : '?';
      
      // Add width and quality parameters
      return `${url}${separator}w=${width}&quality=${quality}`;
    }
    
    // For other image types, return the original URL
    return url;
  } catch (error) {
    console.warn('Error optimizing image URL:', error);
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
 * Calculates optimal image dimensions based on device
 * 
 * @param originalWidth Original width
 * @param originalHeight Original height
 * @param maxWidth Maximum width constraint
 * @returns Calculated dimensions { width, height }
 */
export const calculateImageDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number
): { width: number; height: number } => {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  const calculatedHeight = maxWidth / aspectRatio;
  
  return {
    width: maxWidth,
    height: calculatedHeight,
  };
};

/**
 * Determines if an image should be preloaded based on its importance
 * 
 * @param importance Image importance level
 * @returns Boolean indicating if image should be preloaded
 */
export const shouldPreloadImage = (importance: 'high' | 'medium' | 'low'): boolean => {
  // On web, preload high and medium importance images
  if (Platform.OS === 'web') {
    return importance === 'high' || importance === 'medium';
  }
  
  // On mobile, only preload high importance images to save bandwidth
  return importance === 'high';
};