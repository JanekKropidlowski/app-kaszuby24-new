import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import { notificationService } from '@/services/notificationService';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { MemoryOptimizer } from '@/utils/memoryOptimizer';
import { useRouter } from 'expo-router';
import ErrorBoundary from '@/components/ErrorBoundary';
import { handleDeepLinkWithValidation } from '@/utils/linkHandler';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isDarkMode, theme } = useThemeStore();
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Performance monitoring
  usePerformanceMonitor();

  // Load fonts
  const [fontsLoaded, fontError] = useFonts({
    'Poppins_Thin': require('../assets/fonts/Poppins/Poppins_Thin.ttf'),
    'Poppins_ThinItalic': require('../assets/fonts/Poppins/Poppins_ThinItalic.ttf'),
    'Poppins_ExtraLight': require('../assets/fonts/Poppins/Poppins_ExtraLight.ttf'),
    'Poppins_ExtraLightItalic': require('../assets/fonts/Poppins/Poppins_ExtraLightItalic.ttf'),
    'Poppins_Light': require('../assets/fonts/Poppins/Poppins_Light.ttf'),
    'Poppins_LightItalic': require('../assets/fonts/Poppins/Poppins_LightItalic.ttf'),
    'Poppins_Regular': require('../assets/fonts/Poppins/Poppins_Regular.ttf'),
    'Poppins_Italic': require('../assets/fonts/Poppins/Poppins_Italic.ttf'),
    'Poppins_Medium': require('../assets/fonts/Poppins/Poppins_Medium.ttf'),
    'Poppins_MediumItalic': require('../assets/fonts/Poppins/Poppins_MediumItalic.ttf'),
    'Poppins_SemiBold': require('../assets/fonts/Poppins/Poppins_SemiBold.ttf'),
    'Poppins_SemiBoldItalic': require('../assets/fonts/Poppins/Poppins_SemiBoldItalic.ttf'),
    'Poppins_Bold': require('../assets/fonts/Poppins/Poppins_Bold.ttf'),
    'Poppins_BoldItalic': require('../assets/fonts/Poppins/Poppins_BoldItalic.ttf'),
    'Poppins_ExtraBold': require('../assets/fonts/Poppins/Poppins_ExtraBold.ttf'),
    'Poppins_ExtraBoldItalic': require('../assets/fonts/Poppins/Poppins_ExtraBoldItalic.ttf'),
    'Poppins_Black': require('../assets/fonts/Poppins/Poppins_Black.ttf'),
    'Poppins_BlackItalic': require('../assets/fonts/Poppins/Poppins_BlackItalic.ttf'),
  });

  // Handle font loading errors
  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
      setError(fontError);
    }
  }, [fontError]);

  // Initialize app
  useEffect(() => {
    async function prepare() {
      try {
        // Initialize notification service
        await notificationService.setupNotificationHandlers();
        
        // Memory optimization
        MemoryOptimizer.initialize();
        
        // Preload critical assets
        await Promise.all([
          // Add any critical asset preloading here
        ]);
        
      } catch (e) {
        console.warn('Error during app preparation:', e);
        setError(e as Error);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Hide splash screen when app is ready
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Add deep linking handler with improved error handling
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('Deep link received in _layout:', url);
      
      try {
        // Use the enhanced link handler with validation
        handleDeepLinkWithValidation(url);
      } catch (error) {
        console.error('Error handling deep link in _layout:', error);
        // Fallback to home
        router.push('/(tabs)');
      }
    };

    // Handle initial URL (when app is opened from a link)
    const getInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('Initial URL:', initialUrl);
          // Add a small delay to ensure the app is fully loaded
          setTimeout(() => {
            handleDeepLink(initialUrl);
          }, 1000);
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    // Handle URL changes (when app is already running)
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Get initial URL when app starts, but only after app is ready
    if (appIsReady) {
      getInitialURL();
    }

    return () => {
      subscription?.remove();
    };
  }, [appIsReady, router]);

  // Show nothing until fonts are loaded or failed to load
  if (!appIsReady) {
    return null;
  }

  // Log font loading status for debugging
  if (error) {
    console.warn('Font loading error:', error);
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar 
          style={isDarkMode ? "light" : "dark"} 
          backgroundColor="transparent"
          translucent={Platform.OS === 'android'} // Only translucent on Android
        />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: Platform.select({
              ios: 'default',
              android: 'slide_from_right', // Changed from 'fade' to 'slide_from_right' for better Android experience
              web: 'default',
              default: 'default',
            }),
            animationDuration: Platform.select({
              android: 200, // Increased from 150 to 200 for smoother animations
              default: undefined,
            }),
            ...(Platform.OS === 'android' && {
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              gestureResponseDistance: 50, // Added for better gesture handling on Android
            }),
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="article/[id]" 
            options={{ 
              headerShown: false,
              presentation: 'card',
              gestureEnabled: true,
              ...(Platform.OS === 'android' && {
                animationTypeForReplace: 'push',
                gestureResponseDistance: 50,
              }),
            }} 
          />
          <Stack.Screen 
            name="article/[slug]" 
            options={{ 
              headerShown: false,
              presentation: 'card',
              gestureEnabled: true,
              ...(Platform.OS === 'android' && {
                animationTypeForReplace: 'push',
                gestureResponseDistance: 50,
              }),
            }} 
          />
          <Stack.Screen 
            name="event/[id]" 
            options={{ 
              headerShown: false,
              presentation: 'card',
              gestureEnabled: true,
              ...(Platform.OS === 'android' && {
                animationTypeForReplace: 'push',
                gestureResponseDistance: 50,
              }),
            }} 
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}