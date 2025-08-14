import React, { useEffect } from 'react';
import { Platform, View, Animated, StyleSheet, Text, Dimensions, PanResponder } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Bell, Bookmark, Search, Calendar as CalendarIcon, Settings, CloudRain } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';
import { useScrollStore } from '@/store/scrollStore';
import { useTTSStore } from '@/store/ttsStore';
import { AudioPlayerBar } from '@/components/AudioPlayerBar';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Scroll-responsive floating logo with gradient
const FloatingLogo = () => {
  const { theme } = useThemeStore();
  const { showLogo } = useScrollStore();
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const logoTranslateY = React.useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: showLogo ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: showLogo ? 0 : -20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showLogo, logoOpacity, logoTranslateY]);

  if (!showLogo) return null;

  return (
    <Animated.View
      style={[
        styles.floatingLogoContainer,
        {
          opacity: logoOpacity,
          transform: [{ translateY: logoTranslateY }],
        }
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={theme.isDarkMode 
          ? ['rgba(30, 41, 59, 0.8)', 'rgba(30, 41, 59, 0.7)']
          : ['rgba(248, 250, 252, 0.8)', 'rgba(248, 250, 252, 0.7)']
        }
        style={styles.logoGradientContainer}
      >
        <Image
          source={{ 
            uri: theme.isDarkMode 
              ? 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png' // white logo
              : 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-scaled.png' // color logo
          }}
          style={styles.floatingLogo}
          contentFit="contain"
          placeholder="Kaszuby24"
          cachePolicy="memory-disk"
          transition={200}
        />
      </LinearGradient>
    </Animated.View>
  );
};

export default function TabLayout() {
  const { theme } = useThemeStore();
  const { hasUnreadNotifications, incrementNotificationCount } = useNotificationsStore();
  const { showTabBar } = useScrollStore();
  const tabBarTranslateY = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const tts = useTTSStore();
  
  // Oblicz właściwy padding dla Androida z safe area
  const getBottomPadding = () => {
    if (Platform.OS === 'ios') {
      return 32;
    }
    // Android: zawsze dodaj minimum 20px + safe area
    const androidPadding = Math.max(20, insets.bottom) + 20;
    // console.log('Android Main Tabs - Safe Area Bottom:', insets.bottom, 'Final Padding:', androidPadding);
    return androidPadding;
  };
  
  const getTabBarHeight = () => {
    if (Platform.OS === 'ios') {
      return 110;
    }
    // Android: bazowa wysokość + padding
    return 80 + getBottomPadding();
  };

  React.useEffect(() => {
    Animated.timing(tabBarTranslateY, {
      toValue: showTabBar ? 0 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showTabBar, tabBarTranslateY]);

  useEffect(() => {
    // Listen for notifications (permissions and registration are handled in _layout.tsx)
    const notificationListener = notificationService.addNotificationReceivedListener((notification) => {
      // console.log('Notification received in TabLayout:', notification);
      incrementNotificationCount();
    });
    
    const responseListener = notificationService.addNotificationResponseReceivedListener((response) => {
              // console.log('Notification response in TabLayout:', response);
      // Handle notification tap - navigation is handled in notificationService
    });
    
    return () => {
      // Use proper cleanup method for Expo notifications
      notificationService.removeNotificationSubscription(notificationListener);
      notificationService.removeNotificationSubscription(responseListener);
    };
  }, [incrementNotificationCount]);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.tabBarBackground,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            paddingTop: Platform.OS === 'android' ? 20 : 16,
            paddingBottom: getBottomPadding(),
            height: getTabBarHeight(),
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: Platform.OS === 'android' ? 12 : 8, // Increased elevation for Android
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: Platform.OS === 'android' ? 0.15 : 0.1, // Increased shadow for Android
            shadowRadius: Platform.OS === 'android' ? 12 : 8, // Increased shadow radius for Android
            borderTopLeftRadius: Platform.OS === 'android' ? 32 : 28, // Increased radius for Android
            borderTopRightRadius: Platform.OS === 'android' ? 32 : 28, // Increased radius for Android
          },
          tabBarLabelStyle: {
            fontSize: Platform.OS === 'android' ? 13 : 12, // Larger font on Android
            fontFamily: theme.fontFamily.medium,
            marginTop: Platform.OS === 'android' ? 8 : 8, // More spacing on Android
            fontWeight: Platform.OS === 'android' ? '500' : '400', // Slightly bolder on Android
          },
          tabBarIconStyle: {
            marginBottom: Platform.OS === 'android' ? 6 : 4, // More spacing on Android
          },
          headerStyle: {
            backgroundColor: theme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontFamily: theme.fontFamily.semibold,
          },
        }}
      >
        <Tabs.Screen
          name="search"
          options={{
            title: 'Szukaj',
            tabBarIcon: ({ color, size, focused }) => {
              const iconSize = focused 
                ? (Platform.OS === 'android' ? 28 : 26) // Larger icons on Android
                : (Platform.OS === 'android' ? 26 : 24);
              
              const strokeWidth = focused 
                ? (Platform.OS === 'android' ? 2.8 : 2.5) // Thicker strokes on Android
                : (Platform.OS === 'android' ? 2.2 : 2);
              
              const containerSize = focused 
                ? (Platform.OS === 'android' ? 52 : 48) // Larger active container on Android
                : 'auto';
              
              return (
                <View style={{
                  backgroundColor: focused ? theme.colors.primary : 'transparent',
                  borderRadius: focused ? (Platform.OS === 'android' ? 26 : 24) : 0,
                  width: focused ? containerSize : 'auto',
                  height: focused ? containerSize : 'auto',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: focused ? (Platform.OS === 'android' ? 12 : 10) : 0, // More padding on Android
                }}>
                  <Search 
                    size={iconSize} 
                    color={focused ? '#FFFFFF' : color} 
                    strokeWidth={strokeWidth}
                  />
                </View>
              );
            },
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="saved"
          options={{
            title: 'Zapisane',
            tabBarIcon: ({ color, size, focused }) => {
              const iconSize = focused 
                ? (Platform.OS === 'android' ? 28 : 26) // Larger icons on Android
                : (Platform.OS === 'android' ? 26 : 24);
              
              const strokeWidth = focused 
                ? (Platform.OS === 'android' ? 2.8 : 2.5) // Thicker strokes on Android
                : (Platform.OS === 'android' ? 2.2 : 2);
              
              const containerSize = focused 
                ? (Platform.OS === 'android' ? 52 : 48) // Larger active container on Android
                : 'auto';
              
              return (
                <View style={{
                  backgroundColor: focused ? theme.colors.primary : 'transparent',
                  borderRadius: focused ? (Platform.OS === 'android' ? 26 : 24) : 0,
                  width: focused ? containerSize : 'auto',
                  height: focused ? containerSize : 'auto',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: focused ? (Platform.OS === 'android' ? 12 : 10) : 0, // More padding on Android
                }}>
                  <Bookmark 
                    size={iconSize} 
                    color={focused ? '#FFFFFF' : color} 
                    strokeWidth={strokeWidth}
                  />
                </View>
              );
            },
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="index"
          options={{
            title: 'Główna',
            tabBarIcon: ({ color, size, focused }) => {
              const iconSize = focused 
                ? (Platform.OS === 'android' ? 28 : 26) // Larger icons on Android
                : (Platform.OS === 'android' ? 26 : 24);
              
              const strokeWidth = focused 
                ? (Platform.OS === 'android' ? 2.8 : 2.5) // Thicker strokes on Android
                : (Platform.OS === 'android' ? 2.2 : 2);
              
              const containerSize = focused 
                ? (Platform.OS === 'android' ? 52 : 48) // Larger active container on Android
                : 'auto';
              
              return (
                <View style={{
                  backgroundColor: focused ? theme.colors.primary : 'transparent',
                  borderRadius: focused ? (Platform.OS === 'android' ? 26 : 24) : 0,
                  width: focused ? containerSize : 'auto',
                  height: focused ? containerSize : 'auto',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: focused ? (Platform.OS === 'android' ? 12 : 10) : 0, // More padding on Android
                }}>
                  <Home 
                    size={iconSize} 
                    color={focused ? '#FFFFFF' : color} 
                    strokeWidth={strokeWidth}
                  />
                </View>
              );
            },
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="kalendarz"
          options={{
            title: 'Kalendarz',
            tabBarIcon: ({ color, size, focused }) => {
              const iconSize = focused 
                ? (Platform.OS === 'android' ? 28 : 26) // Larger icons on Android
                : (Platform.OS === 'android' ? 26 : 24);
              
              const strokeWidth = focused 
                ? (Platform.OS === 'android' ? 2.8 : 2.5) // Thicker strokes on Android
                : (Platform.OS === 'android' ? 2.2 : 2);
              
              const containerSize = focused 
                ? (Platform.OS === 'android' ? 52 : 48) // Larger active container on Android
                : 'auto';
              
              return (
                <View style={{
                  backgroundColor: focused ? theme.colors.primary : 'transparent',
                  borderRadius: focused ? (Platform.OS === 'android' ? 26 : 24) : 0,
                  width: focused ? containerSize : 'auto',
                  height: focused ? containerSize : 'auto',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: focused ? (Platform.OS === 'android' ? 12 : 10) : 0, // More padding on Android
                }}>
                  <CalendarIcon
                    size={iconSize}
                    color={focused ? '#FFFFFF' : color}
                    strokeWidth={strokeWidth}
                  />
                </View>
              );
            },
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="preferences"
          options={{
            title: 'Ustawienia',
            tabBarIcon: ({ color, size, focused }) => {
              const iconSize = focused 
                ? (Platform.OS === 'android' ? 28 : 26) // Larger icons on Android
                : (Platform.OS === 'android' ? 26 : 24);
              
              const strokeWidth = focused 
                ? (Platform.OS === 'android' ? 2.8 : 2.5) // Thicker strokes on Android
                : (Platform.OS === 'android' ? 2.2 : 2);
              
              const containerSize = focused 
                ? (Platform.OS === 'android' ? 52 : 48) // Larger active container on Android
                : 'auto';
              
              return (
                <View style={{
                  backgroundColor: focused ? theme.colors.primary : 'transparent',
                  borderRadius: focused ? (Platform.OS === 'android' ? 26 : 24) : 0,
                  width: focused ? containerSize : 'auto',
                  height: focused ? containerSize : 'auto',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: focused ? (Platform.OS === 'android' ? 12 : 10) : 0, // More padding on Android
                }}>
                  <Settings 
                    size={iconSize} 
                    color={focused ? '#FFFFFF' : color} 
                    strokeWidth={strokeWidth}
                  />
                </View>
              );
            },
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="weather"
          options={{
            // This screen is totally hidden from the tab bar.
            href: null,
            headerShown: false,
          }}
        />

      </Tabs>
      
      {/* Floating Logo - tymczasowo wyłączony  <FloatingLogo /> */}
    </>
  );
}

const styles = StyleSheet.create({
  floatingLogoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 8, // Zmniejszony margines pod status barem
    left: '50%',
    marginLeft: -75, // Half of logo width
    zIndex: 1000,
  },
  logoGradientContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: 'transparent',
  },
  floatingLogo: {
    width: 110,
    height: 30,
  },
});