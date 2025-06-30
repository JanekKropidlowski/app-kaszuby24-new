import { Platform } from 'react-native';

// Simple debug utility to log detailed error information
export const debugLog = (message: string, data?: any) => {
  // Only log in development mode
  if (__DEV__ && Platform.OS !== 'web') {
    console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
  }
};

export const debugError = (message: string, error: any) => {
  // Only log in development mode
  if (__DEV__ && Platform.OS !== 'web') {
    console.error(`[ERROR] ${message}`, error);
  }
};