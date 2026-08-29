import { Platform } from 'react-native';

// Simple debug utility to log detailed error information
export const debugLog = (message: string, data?: any) => {
  // Only log in development mode
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG ${timestamp}] ${message}`, data !== undefined ? data : '');
  }
};

export const debugError = (message: string, error: any) => {
  // Only log in development mode
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR ${timestamp}] ${message}`, error);
    
    // Log additional error details if available
    if (error && typeof error === 'object') {
      if (error.name) console.error(`Error name: ${error.name}`);
      if (error.message) console.error(`Error message: ${error.message}`);
      if (error.stack) console.error(`Error stack: ${error.stack}`);
    }
  }
};

// Network error specific logging
export const debugNetworkError = (url: string, error: any, retryCount = 0) => {
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    console.error(`[NETWORK ERROR ${timestamp}] URL: ${url}, Retry: ${retryCount}`, {
      name: error?.name,
      message: error?.message,
      type: typeof error,
      isAbortError: error?.name === 'AbortError',
      isNetworkError: error?.message?.includes('Network request failed'),
    });
  }
};

// Request tracking for debugging
export const debugRequestStart = (key: string, url: string) => {
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    console.log(`[REQUEST START ${timestamp}] Key: ${key}, URL: ${url}`);
  }
};

export const debugRequestEnd = (key: string, success: boolean, duration?: number) => {
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    const status = success ? 'SUCCESS' : 'FAILED';
    const durationText = duration ? ` (${duration}ms)` : '';
    console.log(`[REQUEST END ${timestamp}] Key: ${key}, Status: ${status}${durationText}`);
  }
};