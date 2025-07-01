import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { notificationService } from '@/services/notificationService';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { MemoryOptimizer } from '@/utils/memoryOptimizer';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { theme, isDarkMode } = useThemeStore();
  const [appIsReady, setAppIsReady] = useState(false);
  
  const [loaded, error] = useFonts({
    'Poppins-Thin': require('../assets/fonts/Poppins/Poppins-Thin.ttf'),
    'Poppins-ExtraLight': require('../assets/fonts/Poppins/Poppins-ExtraLight.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins/Poppins-Light.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins/Poppins-ExtraBold.ttf'),
    'Poppins-Black': require('../assets/fonts/Poppins/Poppins-Black.ttf'),
  });

  // Add performance monitoring
  const performance = usePerformanceMonitor('RootLayout', __DEV__);
  
  useEffect(() => {
    performance.markRenderStart();
    
    // Initialize app performance optimizations
    if (Platform.OS !== 'web') {
      // Clear image cache on app start to prevent memory issues
      MemoryOptimizer.clearImageCache();
    }
    
    performance.markRenderEnd('initialization');
    
    return () => {
      // Clean up resources when app is closed
      if (Platform.OS !== 'web') {
        MemoryOptimizer.clearImageCache();
      }
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
          if (Platform.OS !== 'web') {
            notificationService.setupNotificationHandlers().catch((err) => {
              console.warn('Notification service setup failed:', err);
            });
          }
          
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

  // Show nothing until fonts are loaded or failed to load
  if (!appIsReady) {
    return null;
  }

  // Log font loading status for debugging
  if (error) {
    console.warn('Font loading error:', error);
  }

  return (
    <>
      <StatusBar 
        style={isDarkMode ? "light" : "dark"} 
        backgroundColor={theme.colors.background}
        translucent={Platform.OS === 'android'}
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
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}