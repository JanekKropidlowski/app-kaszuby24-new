import React, { useEffect } from 'react';
import { Platform, View, Animated, StyleSheet, Text, Dimensions, PanResponder } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Bell, Settings, Bookmark, Search, Calendar as CalendarIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';
import { useScrollStore } from '@/store/scrollStore';
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
          ? ['rgba(30, 41, 59, 0.95)', 'rgba(30, 41, 59, 0.85)']
          : ['rgba(248, 250, 252, 0.95)', 'rgba(248, 250, 252, 0.85)']
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
      console.log('Notification received in TabLayout:', notification);
      incrementNotificationCount();
    });
    
    const responseListener = notificationService.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response in TabLayout:', response);
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
            paddingTop: 16,
            paddingBottom: Platform.OS === 'ios' ? 32 : 18,
            height: Platform.OS === 'ios' ? 110 : 98,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: theme.fontFamily.medium,
            marginTop: 8,
          },
          tabBarIconStyle: {
            marginBottom: 4,
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
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{
                backgroundColor: focused ? theme.colors.primary : 'transparent',
                borderRadius: focused ? 24 : 0,
                width: focused ? 48 : 'auto',
                height: focused ? 48 : 'auto',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Search 
                  size={focused ? 26 : 24} 
                  color={focused ? '#FFFFFF' : color} 
                  strokeWidth={focused ? 2.5 : 2}
                />
              </View>
            ),
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="saved"
          options={{
            title: 'Zapisane',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{
                backgroundColor: focused ? theme.colors.primary : 'transparent',
                borderRadius: focused ? 24 : 0,
                width: focused ? 48 : 'auto',
                height: focused ? 48 : 'auto',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Bookmark 
                  size={focused ? 26 : 24} 
                  color={focused ? '#FFFFFF' : color} 
                  strokeWidth={focused ? 2.5 : 2}
                />
              </View>
            ),
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="index"
          options={{
            title: 'Główna',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{
                backgroundColor: focused ? theme.colors.primary : 'transparent',
                borderRadius: focused ? 24 : 0,
                width: focused ? 48 : 'auto',
                height: focused ? 48 : 'auto',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Home 
                  size={focused ? 26 : 24} 
                  color={focused ? '#FFFFFF' : color} 
                  strokeWidth={focused ? 2.5 : 2}
                />
              </View>
            ),
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="kalendarz"
          options={{
            title: 'Kalendarz',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{
                backgroundColor: focused ? theme.colors.primary : 'transparent',
                borderRadius: focused ? 24 : 0,
                width: focused ? 48 : 'auto',
                height: focused ? 48 : 'auto',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CalendarIcon
                  size={focused ? 26 : 24}
                  color={focused ? '#FFFFFF' : color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              </View>
            ),
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="preferences"
          options={{
            title: 'Ustawienia',
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{
                backgroundColor: focused ? theme.colors.primary : 'transparent',
                borderRadius: focused ? 24 : 0,
                width: focused ? 48 : 'auto',
                height: focused ? 48 : 'auto',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Settings 
                  size={focused ? 26 : 24} 
                  color={focused ? '#FFFFFF' : color} 
                  strokeWidth={focused ? 2.5 : 2}
                />
              </View>
            ),
            headerShown: false,
          }}
        />
      </Tabs>
      
      {/* Floating Logo */}
      <FloatingLogo />
    </>
  );
}

const styles = StyleSheet.create({
  floatingLogoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 48, // Increased for Android
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingLogo: {
    width: 110,
    height: 30,
  },
});