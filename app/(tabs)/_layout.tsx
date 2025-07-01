import React, { useEffect } from 'react';
import { Platform, View, Animated } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Bell, Settings, Bookmark, Search } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';
import { useScrollStore } from '@/store/scrollStore';

// Animated logo component
const AnimatedLogo = () => {
  const { theme } = useThemeStore();
  const { showLogo } = useScrollStore();
  const logoOpacity = React.useRef(new Animated.Value(1)).current;
  const logoScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: showLogo ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: showLogo ? 1 : 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showLogo, logoOpacity, logoScale]);

  // Add safety check for theme and logo
  if (!theme || !theme.logo || !theme.logo.header) {
    return null;
  }

  return (
    <Animated.View
      style={{
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }}
    >
      <Image
        source={{ uri: theme.logo.header }}
        style={{ width: 110, height: 32 }}
        contentFit="contain"
        placeholder="Kaszuby24"
        cachePolicy="memory-disk"
        transition={200}
      />
    </Animated.View>
  );
};

export default function TabLayout() {
  const { getUnreadCount, initializePreferences } = useNotificationsStore();
  const { theme } = useThemeStore();
  const unreadCount = getUnreadCount();
  
  useEffect(() => {
    const initNotifications = async () => {
      try {
        initializePreferences();
        
        // Small delay to ensure app is fully loaded
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await notificationService.setupNotificationHandlers();
        notificationService.startPeriodicCheck();
      } catch (error) {
        // Usunięto: console.warn('OneSignal notification setup failed:', error);
      }
    };
    
    initNotifications();
  }, [initializePreferences]);
  
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopWidth: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: Platform.select({
              ios: 88,
              android: 80,
              default: 80
            }),
            paddingBottom: Platform.select({
              ios: 24,
              android: 20,
              default: 20
            }),
            paddingTop: 12,
            paddingHorizontal: 16,
            elevation: 12,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
            fontFamily: theme.fontFamily.medium,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
          headerStyle: {
            backgroundColor: theme.colors.card,
            shadowOpacity: 0,
            elevation: 0,
          },
          headerTitleStyle: {
            fontWeight: '600',
            color: theme.colors.text,
            fontSize: 18,
            fontFamily: theme.fontFamily.semibold,
          },
          headerTintColor: theme.colors.primary,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Główna',
            tabBarIcon: ({ color, size }) => (
              <Home size={size} color={color} strokeWidth={2} />
            ),
            headerTitle: () => <AnimatedLogo />,
          }}
        />
        
        <Tabs.Screen
          name="search"
          options={{
            title: 'Szukaj',
            tabBarIcon: ({ color, size }) => (
              <Search size={size} color={color} strokeWidth={2} />
            ),
            headerTitle: () => <AnimatedLogo />,
          }}
        />
        
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Powiadomienia',
            tabBarIcon: ({ color, size }) => (
              <Bell size={size} color={color} strokeWidth={2} />
            ),
            tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount.toString()) : undefined,
            tabBarBadgeStyle: {
              backgroundColor: theme.colors.notification,
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '600',
              minWidth: 18,
              height: 18,
            },
            headerTitle: () => <AnimatedLogo />,
          }}
        />
        
        <Tabs.Screen
          name="saved"
          options={{
            title: 'Zapisane',
            tabBarIcon: ({ color, size }) => (
              <Bookmark size={size} color={color} strokeWidth={2} />
            ),
            headerTitle: () => <AnimatedLogo />,
          }}
        />
        
        <Tabs.Screen
          name="preferences"
          options={{
            title: 'Ustawienia',
            tabBarIcon: ({ color, size }) => (
              <Settings size={size} color={color} strokeWidth={2} />
            ),
            headerTitle: () => <AnimatedLogo />,
          }}
        />
      </Tabs>
      
      {/* White background fill for the gap below tab bar */}
      <View 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 20,
          backgroundColor: theme.colors.background,
          zIndex: -1,
        }}
      />
    </>
  );
}