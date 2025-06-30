import { Platform } from 'react-native';

// Enhanced debug utility with connection status logging
export const debugLog = (message: string, data?: any) => {
  // Log in development mode and on native platforms
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG ${timestamp}] ${message}`, data !== undefined ? data : '');
  }
};

export const debugError = (message: string, error: any) => {
  // Always log errors, even in production for native platforms
  if (__DEV__ || Platform.OS !== 'web') {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR ${timestamp}] ${message}`, error);
  }
};

export const debugConnection = (status: string, details?: any) => {
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    console.log(`[CONNECTION ${timestamp}] Status: ${status}`, details || '');
  }
};

export const debugNotification = (action: string, data?: any) => {
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    console.log(`[NOTIFICATION ${timestamp}] ${action}`, data || '');
  }
};