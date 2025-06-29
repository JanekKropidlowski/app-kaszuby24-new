import React, { useState, useEffect } from 'react';
import { Platform, StatusBar, View, Text } from 'react-native';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts only if they exist
        try {
          await Font.loadAsync({
            'Poppins-Regular': require('../assets/fonts/Poppins/Poppins-Regular.ttf'),
            'Poppins-Medium': require('../assets/fonts/Poppins/Poppins-Medium.ttf'),
            'Poppins-SemiBold': require('../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
            'Poppins-Bold': require('../assets/fonts/Poppins/Poppins-Bold.ttf'),
          });
        } catch (fontError) {
          console.warn('Font loading failed, using system fonts:', fontError);
        }
      } catch (e) {
        console.warn('App preparation error:', e);
        setError('Wystąpił problem podczas ładowania zasobów. Aplikacja może działać nieprawidłowo.');
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

  if (error) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: theme.colors.background,
        padding: 20
      }}>
        <Text style={{ 
          color: theme.colors.error, 
          fontSize: 16, 
          textAlign: 'center', 
          marginBottom: 16
        }}>
          {error}
        </Text>
        <Text style={{ 
          color: theme.colors.text, 
          fontSize: 14, 
          textAlign: 'center' 
        }}>
          Spróbuj uruchomić aplikację ponownie lub sprawdź połączenie internetowe.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={Platform.OS === 'android' ? theme.colors.background : undefined}
        translucent={Platform.OS === 'android'}
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
            fontFamily: Platform.select({
              ios: 'Poppins-SemiBold',
              android: 'Poppins-SemiBold',
              default: 'System'
            }),
          },
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          headerShadowVisible: false,
          animation: Platform.select({
            ios: 'slide_from_right',
            android: 'slide_from_right',
            default: 'default'
          }),
          headerBackTitle: 'Wróć',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="article/[id]" 
          options={{ 
            title: '',
            headerBackTitle: 'Wróć',
            animation: Platform.select({
              ios: 'slide_from_right',
              android: 'slide_from_right',
              default: 'default'
            }),
          }} 
        />
        <Stack.Screen 
          name="search" 
          options={{ 
            title: 'Szukaj',
            headerBackTitle: 'Wróć',
            animation: Platform.select({
              ios: 'slide_from_bottom',
              android: 'slide_from_bottom',
              default: 'default'
            }),
          }} 
        />
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal',
            title: 'Modal',
            animation: Platform.select({
              ios: 'slide_from_bottom',
              android: 'slide_from_bottom',
              default: 'default'
            }),
          }} 
        />
      </Stack>
    </View>
  );
}