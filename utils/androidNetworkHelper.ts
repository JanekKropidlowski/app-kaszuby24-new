import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllCaches } from '@/services/api';

export interface NetworkDiagnostic {
  isConnected: boolean;
  canReachAPI: boolean;
  cacheCleared: boolean;
  errorDetails?: string;
}

// Test basic network connectivity
export const testNetworkConnectivity = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  
  try {
    console.log('Testing basic network connectivity...');
    
    // Try a simple fetch to a reliable endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    console.warn('Basic network connectivity test failed:', error);
    return false;
  }
};

// Test if we can reach the Kaszuby24 API specifically
export const testAPIConnectivity = async (): Promise<boolean> => {
  try {
    console.log('Testing API connectivity...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch('https://kaszuby24.pl/wp-json/wp/v2/categories?per_page=1', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Kaszuby24-Android/1.0',
      },
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    console.warn('API connectivity test failed:', error);
    return false;
  }
};

// Run full network diagnostic
export const runNetworkDiagnostic = async (): Promise<NetworkDiagnostic> => {
  console.log('Running network diagnostic...');
  
  const diagnostic: NetworkDiagnostic = {
    isConnected: false,
    canReachAPI: false,
    cacheCleared: false,
  };
  
  try {
    // Test basic connectivity
    diagnostic.isConnected = await testNetworkConnectivity();
    
    // Test API connectivity if basic connectivity works
    if (diagnostic.isConnected) {
      diagnostic.canReachAPI = await testAPIConnectivity();
    }
    
    // If we have issues, try clearing cache
    if (!diagnostic.canReachAPI) {
      console.log('Clearing caches to resolve potential issues...');
      await clearAllCaches();
      diagnostic.cacheCleared = true;
      
      // Test API again after cache clear
      diagnostic.canReachAPI = await testAPIConnectivity();
    }
    
  } catch (error: any) {
    diagnostic.errorDetails = error.message;
    console.error('Network diagnostic failed:', error);
  }
  
  console.log('Network diagnostic completed:', diagnostic);
  return diagnostic;
};

// Clear app data and restart recommendation
export const clearAppDataAndRecommendRestart = async (): Promise<void> => {
  try {
    console.log('Clearing all app data...');
    
    // Clear all async storage
    await AsyncStorage.clear();
    
    // Clear API caches
    await clearAllCaches();
    
    console.log('App data cleared successfully');
    
    // Show restart recommendation
    if (Platform.OS === 'android') {
      Alert.alert(
        'Dane aplikacji wyczyszczone',
        'Zalecane jest całkowite zamknięcie i ponowne uruchomienie aplikacji.',
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    }
  } catch (error) {
    console.error('Failed to clear app data:', error);
    throw new Error('Nie udało się wyczyścić danych aplikacji');
  }
};

// Android-specific network troubleshooting steps
export const showAndroidNetworkTroubleshooting = (): void => {
  if (Platform.OS !== 'android') return;
  
  Alert.alert(
    'Rozwiązywanie problemów sieciowych (Android)',
    'Spróbuj następujących kroków:\n\n' +
    '1. Sprawdź połączenie Wi-Fi lub dane mobilne\n' +
    '2. Wyłącz i włącz ponownie Wi-Fi\n' +
    '3. Sprawdź czy inne aplikacje działają\n' +
    '4. Zrestartuj telefon\n' +
    '5. Sprawdź ustawienia zaporów sieciowych\n' +
    '6. Upewnij się, że aplikacja ma uprawnienia sieciowe',
    [
      {
        text: 'Wyczyść cache aplikacji',
        style: 'default',
        onPress: () => clearAppDataAndRecommendRestart(),
      },
      {
        text: 'OK',
        style: 'cancel',
      },
    ]
  );
};

// Check if error is related to Android network security
export const isAndroidNetworkSecurityError = (error: Error): boolean => {
  if (Platform.OS !== 'android') return false;
  
  const securityKeywords = [
    'cleartext',
    'not permitted',
    'network security config',
    'java.io.IOException',
    'remote update request',
    'SSL',
    'certificate',
    'security policy',
  ];
  
  return securityKeywords.some(keyword =>
    error.message?.toLowerCase().includes(keyword.toLowerCase())
  );
};

// Get user-friendly error message for Android network issues
export const getAndroidNetworkErrorMessage = (error: Error): string => {
  if (Platform.OS !== 'android') return error.message;
  
  if (error.message?.includes('java.io.IOException')) {
    return 'Problem z połączeniem sieciowym. Sprawdź ustawienia sieci i spróbuj ponownie.';
  }
  
  if (error.message?.includes('remote update request')) {
    return 'Błąd aktualizacji aplikacji. Sprawdź połączenie internetowe.';
  }
  
  if (error.message?.includes('cleartext') || error.message?.includes('not permitted')) {
    return 'Problem z konfiguracją sieci. Spróbuj ponownie lub skontaktuj się z obsługą.';
  }
  
  if (error.message?.includes('Network request failed')) {
    return 'Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.';
  }
  
  return error.message || 'Wystąpił nieznany błąd sieciowy.';
}; 