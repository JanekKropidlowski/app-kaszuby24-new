import React, { useState, useEffect } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { useThemeStore } from '@/store/themeStore';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error */
});

export default function RootLayout() {
  const { isDarkMode, theme } = useThemeStore();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          'Poppins-Regular': require('../assets/fonts/Poppins/Poppins-Regular.ttf'),
          'Poppins-Medium': require('../assets/fonts/Poppins/Poppins-Medium.ttf'),
          'Poppins-SemiBold': require('../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
          'Poppins-Bold': require('../assets/fonts/Poppins/Poppins-Bold.ttf'),
        });
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore error */
      });
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
            color: theme.colors.text,
            fontFamily: 'Poppins-SemiBold',
          },
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          headerShadowVisible: false,
          animation: 'slide_from_right',
          headerBackTitle: 'Wróć',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="article/[id]" 
          options={{ 
            title: '',
            headerBackTitle: 'Wróć',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="search" 
          options={{ 
            title: 'Szukaj',
            headerBackTitle: 'Wróć',
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal',
            title: 'Modal',
            animation: 'slide_from_bottom',
          }} 
        />
      </Stack>
    </View>
  );
}