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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { theme, isDarkMode } = useThemeStore();
  const [appIsReady, setAppIsReady] = useState(false);
  const router = useRouter();
  
  const [loaded, error] = useFonts({
    'Poppins_Thin': require('../assets/fonts/Poppins/Poppins_Thin.ttf'),
    'Poppins_ExtraLight': require('../assets/fonts/Poppins/Poppins_ExtraLight.ttf'),
    'Poppins_Light': require('../assets/fonts/Poppins/Poppins_Light.ttf'),
    'Poppins_Regular': require('../assets/fonts/Poppins/Poppins_Regular.ttf'),
    'Poppins_Medium': require('../assets/fonts/Poppins/Poppins_Medium.ttf'),
    'Poppins_SemiBold': require('../assets/fonts/Poppins/Poppins_SemiBold.ttf'),
    'Poppins_Bold': require('../assets/fonts/Poppins/Poppins_Bold.ttf'),
    'Poppins_ExtraBold': require('../assets/fonts/Poppins/Poppins_ExtraBold.ttf'),
    'Poppins_Black': require('../assets/fonts/Poppins/Poppins_Black.ttf'),
  });

  // Add performance monitoring
  const performance = usePerformanceMonitor('RootLayout', __DEV__);
  
  useEffect(() => {
    performance.markRenderStart();
    
    // Initialize app performance optimizations
    // Clear image cache on app start to prevent memory issues
    MemoryOptimizer.clearImageCache();
    
    performance.markRenderEnd('initialization');
    
    return () => {
      // Clean up resources when app is closed
      MemoryOptimizer.clearImageCache();
    };
  }, []);
  
  useEffect(() => {
    async function prepare() {
      try {
        console.log('App initialization started...');
        
        // Pre-load fonts, make any API calls you need to do here
        if (loaded || error) {
          console.log('Fonts loaded:', loaded ? 'success' : 'failed');
          
          // Initialize notification service (don't wait for it)
          notificationService.setupNotificationHandlers().catch((err) => {
            console.warn('Notification service setup failed:', err);
          });
          
          setAppIsReady(true);
        }
      } catch (e) {
        console.warn('Error during app preparation:', e);
        // Even if something fails, we should still show the app
        setAppIsReady(true);
      }
    }

    prepare();
  }, [loaded, error]);

  useEffect(() => {
    if (appIsReady) {
      console.log('App is ready, hiding splash screen...');
      // Hide splash screen with a small delay to ensure everything is ready
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(console.warn);
      }, Platform.OS === 'android' ? 300 : 100);
      
      return () => clearTimeout(timer);
    }
  }, [appIsReady]);

  // Add deep linking handler
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      
      try {
        const urlObj = new URL(url);
        
        // Check if it's a kaszuby24.pl link
        if (urlObj.hostname === 'kaszuby24.pl' || urlObj.hostname === 'www.kaszuby24.pl') {
          const pathname = urlObj.pathname;
          
          // Extract slug from pathname (remove leading and trailing slashes)
          const slug = pathname.replace(/^\/+|\/+$/g, '');
          
          if (slug && slug.length > 0) {
            console.log('Navigating to article with slug:', slug);
            
            // Navigate to the slug-based article route
            router.push(`/article/${slug}`);
          } else {
            // If no slug, navigate to home
            console.log('No slug found, navigating to home');
            router.push('/(tabs)');
          }
        }
      } catch (error) {
        console.error('Error parsing deep link:', error);
        // Fallback to home page
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
          translucent={true}
        />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: Platform.select({
              ios: 'default',
              android: 'fade',
              web: 'default',
              default: 'default',
            }),
            animationDuration: Platform.select({
              android: 150,
              default: undefined,
            }),
            ...(Platform.OS === 'android' && {
              gestureEnabled: true,
              gestureDirection: 'horizontal',
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