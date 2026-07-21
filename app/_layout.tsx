import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, Linking, AppState, Text as RNText, TextInput as RNTextInput } from 'react-native';
import * as Sentry from '@sentry/react-native';
import * as Clarity from '@microsoft/react-native-clarity';
import Constants from 'expo-constants';

// Sentry init MUST być na samej górze pliku — przed dowolnym importem appki —
// żeby errory w innych modułach (load order, top-level code) były złapane.
// DSN siedzi w app.json `extra.sentryDsn` — Constants.expoConfig.extra to read.
const sentryDsn = (Constants.expoConfig as any)?.extra?.sentryDsn || (Constants as any).manifest?.extra?.sentryDsn;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    // Środowisko: 'production' dla store builds, 'development' dla Expo Go / dev client.
    // expo-updates channel jest najpewniejszym wskaźnikiem — production / preview / development.
    environment: ((Constants.expoConfig as any)?.updates?.requestHeaders?.['expo-channel-name']) || 'production',
    // Release tag: app version + build = "1.0.44+46". Sentry agreguje crashes per release,
    // żeby widzieć regresje gdy nowa wersja zaczyna sypać.
    release: `kaszuby24@${Constants.expoConfig?.version || '0.0.0'}+${Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '0'}`,
    // 10% sesji wysyłane do Sentry Performance — wystarczy do złapania regresji
    // (RN startup time, screen transition lag), bez zalewania quota.
    tracesSampleRate: 0.1,
    // Replay sesji wyłączone — żre baterię i waga bundla. Crashy bez replay
    // i tak mają breadcrumbs (nawigacja, network calls, console).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Ignorujemy 2 najczęstsze "noise" errors w RN apkach — ScreenStackHostView
    // memory warnings (iOS, niezwiązane z naszym kodem) i AbortError z fetch
    // (user cancel, normal flow).
    ignoreErrors: [
      'Non-Error promise rejection captured',
      /AbortError/,
      /Network request failed/,
    ],
  });
}

// Microsoft Clarity init — heatmaps + session replay. Native module, działa
// tylko w EAS build (nie w Expo Go). try/catch żeby dev na symulatorze bez
// natywnego linkowania nie wywalał startup.
try {
  Clarity.initialize('wnk4loedj7', { logLevel: Clarity.LogLevel.None });
} catch (e) {
  // dev/Expo Go — native module niedostępny, pomijamy
}

// Set Poppins as default font for ALL <Text> and <TextInput> in the app.
// Without this, RN Text falls back to the platform default (San Francisco / Roboto)
// even though Poppins is loaded via useFonts. Per-style fontFamily still overrides.
{
  const TextAny = RNText as unknown as { defaultProps?: any };
  TextAny.defaultProps = TextAny.defaultProps || {};
  TextAny.defaultProps.style = [{ fontFamily: 'Poppins_Regular' }, TextAny.defaultProps.style];
  const TextInputAny = RNTextInput as unknown as { defaultProps?: any };
  TextInputAny.defaultProps = TextInputAny.defaultProps || {};
  TextInputAny.defaultProps.style = [{ fontFamily: 'Poppins_Regular' }, TextInputAny.defaultProps.style];
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import { notificationService } from '@/services/notificationService';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { MemoryOptimizer } from '@/utils/memoryOptimizer';
import { useRouter } from 'expo-router';
import ErrorBoundary from '@/components/ErrorBoundary';
import { handleDeepLinkWithValidation } from '@/utils/linkHandler';
import { syncWidget } from '@/lib/widget-sync';
import SupportModal from '@/components/SupportModal';
import SupportPromptModal from '@/components/SupportPromptModal';

// Callable from any screen — avoids prop-drilling or a second Zustand store
// for a single boolean. Article screen calls this after tracking the read.
let _showSupportPrompt: (() => void) | null = null;
export function triggerSupportPrompt() { _showSupportPrompt?.(); }
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Updates from 'expo-updates';
import { analyticsService } from '@/services/analyticsService';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const { isDarkMode, theme } = useThemeStore();
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [themeReady, setThemeReady] = useState(false);
  const [supportPromptVisible, setSupportPromptVisible] = useState(false);

  // Register the global trigger as soon as this component mounts.
  useEffect(() => {
    _showSupportPrompt = () => setSupportPromptVisible(true);
    return () => { _showSupportPrompt = null; };
  }, []);

  // Odświeżanie danych widgetów: przy starcie + po powrocie na pierwszy plan (best-effort).
  useEffect(() => {
    syncWidget();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncWidget();
    });
    return () => sub.remove();
  }, []);

  // Performance monitoring
  usePerformanceMonitor('RootLayout');

  // Load fonts - must be before any conditional returns
  const [fontsLoaded, fontError] = useFonts({
    'Poppins_Thin': require('../assets/fonts/Poppins/Poppins_Thin.ttf'),
    'Poppins-Thin': require('../assets/fonts/Poppins/Poppins_Thin.ttf'),
    'Poppins_ThinItalic': require('../assets/fonts/Poppins/Poppins_ThinItalic.ttf'),
    'Poppins-ThinItalic': require('../assets/fonts/Poppins/Poppins_ThinItalic.ttf'),
    'Poppins_ExtraLight': require('../assets/fonts/Poppins/Poppins_ExtraLight.ttf'),
    'Poppins-ExtraLight': require('../assets/fonts/Poppins/Poppins_ExtraLight.ttf'),
    'Poppins_ExtraLightItalic': require('../assets/fonts/Poppins/Poppins_ExtraLightItalic.ttf'),
    'Poppins-ExtraLightItalic': require('../assets/fonts/Poppins/Poppins_ExtraLightItalic.ttf'),
    'Poppins_Light': require('../assets/fonts/Poppins/Poppins_Light.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins/Poppins_Light.ttf'),
    'Poppins_LightItalic': require('../assets/fonts/Poppins/Poppins_LightItalic.ttf'),
    'Poppins-LightItalic': require('../assets/fonts/Poppins/Poppins_LightItalic.ttf'),
    'Poppins_Regular': require('../assets/fonts/Poppins/Poppins_Regular.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins/Poppins_Regular.ttf'),
    'Poppins_Italic': require('../assets/fonts/Poppins/Poppins_Italic.ttf'),
    'Poppins-Italic': require('../assets/fonts/Poppins/Poppins_Italic.ttf'),
    'Poppins_Medium': require('../assets/fonts/Poppins/Poppins_Medium.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins/Poppins_Medium.ttf'),
    'Poppins_MediumItalic': require('../assets/fonts/Poppins/Poppins_MediumItalic.ttf'),
    'Poppins-MediumItalic': require('../assets/fonts/Poppins/Poppins_MediumItalic.ttf'),
    'Poppins_SemiBold': require('../assets/fonts/Poppins/Poppins_SemiBold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins/Poppins_SemiBold.ttf'),
    'Poppins_SemiBoldItalic': require('../assets/fonts/Poppins/Poppins_SemiBoldItalic.ttf'),
    'Poppins-SemiBoldItalic': require('../assets/fonts/Poppins/Poppins_SemiBoldItalic.ttf'),
    'Poppins_Bold': require('../assets/fonts/Poppins/Poppins_Bold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins/Poppins_Bold.ttf'),
    'Poppins_BoldItalic': require('../assets/fonts/Poppins/Poppins_BoldItalic.ttf'),
    'Poppins-BoldItalic': require('../assets/fonts/Poppins/Poppins_BoldItalic.ttf'),
    'Poppins_ExtraBold': require('../assets/fonts/Poppins/Poppins_ExtraBold.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins/Poppins_ExtraBold.ttf'),
    'Poppins_ExtraBoldItalic': require('../assets/fonts/Poppins/Poppins_ExtraBoldItalic.ttf'),
    'Poppins-ExtraBoldItalic': require('../assets/fonts/Poppins/Poppins_ExtraBoldItalic.ttf'),
    'Poppins_Black': require('../assets/fonts/Poppins/Poppins_Black.ttf'),
    'Poppins-Black': require('../assets/fonts/Poppins/Poppins_Black.ttf'),
    'Poppins_BlackItalic': require('../assets/fonts/Poppins/Poppins_BlackItalic.ttf'),
    'Poppins-BlackItalic': require('../assets/fonts/Poppins/Poppins_BlackItalic.ttf'),
  });

  // Wait for theme to be ready with timeout
  useEffect(() => {
    if (theme && theme.colors) {
      setThemeReady(true);
    } else {
      // Add timeout to prevent infinite waiting
      const timeout = setTimeout(() => {
        console.warn('RootLayout: theme timeout, using fallback');
        setThemeReady(true);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [theme]);

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
        // Check for OTA updates (skip in Expo Go where Updates APIs aren't available)
        if (Updates.isEnabled && Constants.appOwnership !== 'expo') {
          try {
            console.log('📱 Current Update Info:', {
              channel: Updates.channel,
              runtimeVersion: Updates.runtimeVersion,
              updateId: Updates.updateId,
              isEmbeddedLaunch: Updates.isEmbeddedLaunch
            });

            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
              console.log('✅ Update available, downloading...');
              await Updates.fetchUpdateAsync();
              console.log('✅ Update downloaded, reloading...');
              await Updates.reloadAsync();
            } else {
              console.log('✅ App is up to date');
            }
          } catch (updateError) {
            console.warn('Error checking for updates:', updateError);
          }
        } else if (Constants.appOwnership === 'expo') {
          console.log('Skipping OTA update check in Expo Go');
        }

        // Initialize notification service
        await notificationService.setupNotificationHandlers();

        // Initialize Firebase Analytics
        try {
          await analyticsService.initialize();
          await analyticsService.logAppOpen('direct');
          console.log('✅ Firebase Analytics initialized');
        } catch (analyticsError) {
          console.warn('Analytics initialization failed:', analyticsError);
        }

        // Memory optimization - no initialization needed

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

  // Deep links: cold-start URLs are handled by `app/+not-found.tsx` which
  // resolves slug→id via linkHandler and does router.replace(), so no flash
  // and no manual setTimeout. Here we only handle the "app already running"
  // case where iOS/Android delivers a URL via the Linking event.
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      try {
        handleDeepLinkWithValidation(event.url);
      } catch (error) {
        console.error('Error handling deep link in _layout:', error);
        router.push('/(tabs)');
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [router]);

  // Early return if theme is not ready
  if (!theme || !theme.colors || !themeReady) {
    console.log('RootLayout: theme not ready, waiting...', {
      hasTheme: !!theme,
      hasColors: !!(theme && theme.colors),
      themeReady
    });
    return null;
  }

  // Additional safety check for theme structure
  if (!theme.colors || typeof theme.colors !== 'object') {
    console.error('RootLayout: theme.colors is invalid:', theme.colors);
    return null;
  }

  // Check if all required theme properties exist
  const requiredThemeProps = ['background', 'text', 'primary', 'secondary'];
  const hasRequiredProps = requiredThemeProps.every(prop => {
    const value = theme.colors[prop as keyof typeof theme.colors];
    return value !== undefined && value !== null && typeof value === 'string';
  });

  if (!hasRequiredProps) {
    console.error('RootLayout: missing required theme properties');
    return null;
  }

  // Validate hex color format
  const isValidHexColor = (color: string) => /^#[0-9A-F]{6}$/i.test(color);
  const hasValidColors = requiredThemeProps.every(prop => {
    const value = theme.colors[prop as keyof typeof theme.colors];
    return isValidHexColor(value);
  });

  if (!hasValidColors) {
    console.error('RootLayout: invalid color format detected');
    return null;
  }

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar
            style={isDarkMode ? "light" : "dark"}
            backgroundColor="transparent"
            translucent={Platform.OS === 'android'} // Only translucent on Android
          />
          <Stack
            screenOptions={{
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
              animation: 'default',
              animationDuration: 300
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="essentials/index"
              options={{
                animationTypeForReplace: 'push',
                headerShown: false,
                presentation: 'card',
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="article/[id]"
              options={{
                animationTypeForReplace: 'push',
                headerShown: false,
                presentation: 'card',
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="event/[id]"
              options={{
                animationTypeForReplace: 'push',
                headerShown: false,
                presentation: 'card',
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="lzs/[slug]"
              options={{
                animationTypeForReplace: 'push',
                headerShown: false,
                presentation: 'card',
                gestureEnabled: true,
              }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          {/* Globalna nakładka wsparcia (fundacja). Trzymamy ją na poziomie roota
              żeby otwarcie z dowolnego ekranu nie wymagało ponownego renderu drzewa. */}
          <SupportModal />
          <SupportPromptModal
            visible={supportPromptVisible}
            onClose={() => setSupportPromptVisible(false)}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Sentry.wrap() owija root żeby errory w React tree (crashes podczas render)
// były automatycznie wysłane. Wrap NO-OP gdy DSN nie ustawione (dev/Expo Go).
export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;
