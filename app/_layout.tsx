import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

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

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        if (loaded || error) {
          // Fonts loaded successfully or failed to load
          setAppIsReady(true);
        }
      } catch (e) {
        console.warn('Error loading fonts:', e);
        // Even if fonts fail, we should still show the app
        setAppIsReady(true);
      }
    }

    prepare();
  }, [loaded, error]);

  useEffect(() => {
    if (appIsReady) {
      // Hide splash screen with a small delay to ensure everything is ready
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(console.warn);
      }, Platform.OS === 'android' ? 200 : 100);
      
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
          // Performance optimizations
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
          // Android-specific optimizations
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
            // Android-specific optimizations
            ...(Platform.OS === 'android' && {
              animationTypeForReplace: 'push',
            }),
          }} 
        />
        <Stack.Screen 
          name="search" 
          options={{ 
            headerShown: false,
            presentation: 'card',
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}