import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import OneSignal from 'react-native-onesignal';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isDarkMode } = useThemeStore();
  
  const [loaded, error] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins/Poppins-Bold.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins/Poppins-Light.ttf'),
    'Poppins-ExtraLight': require('../assets/fonts/Poppins/Poppins-ExtraLight.ttf'),
    'Poppins-Thin': require('../assets/fonts/Poppins/Poppins-Thin.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins/Poppins-ExtraBold.ttf'),
    'Poppins-Black': require('../assets/fonts/Poppins/Poppins-Black.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
      
      if (error) {
        console.warn('Font loading failed:', error);
      }
    }
  }, [loaded, error]);

  // Always render the app, even if fonts fail to load
  // The theme system will handle fallbacks
  if (!loaded && !error) {
    return null;
  }

  // Inicjalizacja OneSignal
  useEffect(() => {
    OneSignal.setAppId('03c10d51-376c-4651-a25e-bbc3aa7cfb63');
    OneSignal.setNotificationOpenedHandler(notification => {
      console.log('Powiadomienie otwarte:', notification);
      // Możesz tu dodać nawigację do konkretnego ekranu na podstawie danych z powiadomienia
    });
    if (Platform.OS === 'ios') {
      OneSignal.promptForPushNotificationsWithUserResponse();
    }
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen 
          name="search" 
          options={{ 
            title: 'Wyszukaj',
            headerBackTitle: 'Wróć',
          }} 
        />
        <Stack.Screen 
          name="article/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
      </Stack>
      <StatusBar 
        style={isDarkMode ? 'light' : 'dark'} 
        backgroundColor={Platform.OS === 'android' ? 'transparent' : undefined}
        translucent={Platform.OS === 'android'}
      />
    </>
  );
}