import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '@/store/themeStore';
import * as Linking from 'expo-linking';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Define the URL scheme for deep linking
const prefix = Linking.createURL('/');

export default function RootLayout() {
  const { isDarkMode, theme } = useThemeStore();
  
  const [loaded] = useFonts({
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
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Handle deep linking
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      
      // Parse the URL to extract article ID
      // Expected format: kaszuby24://article/123 or https://kaszuby24.pl/article/123
      const articleMatch = url.match(/article\/(\d+)/);
      if (articleMatch) {
        const articleId = articleMatch[1];
        console.log('Navigate to article:', articleId);
        // The navigation will be handled by Expo Router automatically
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={theme.colors.background} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
            color: theme.colors.text,
            fontFamily: theme.fontFamily.semibold,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen 
          name="article/[id]" 
          options={{ 
            title: 'Artykuł',
            headerBackTitle: 'Wstecz'
          }} 
        />
        <Stack.Screen 
          name="search" 
          options={{ 
            title: 'Wyszukiwanie',
            headerBackTitle: 'Wstecz'
          }} 
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}