// Simple debug utility to log detailed error information
export const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
  }
};

export const debugError = (message: string, error: any) => {
  if (__DEV__) {
    console.error(`[ERROR] ${message}`, error);
  }
};