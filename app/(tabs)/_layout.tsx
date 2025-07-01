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
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
      }}
    >
      <Image
        source={{ uri: theme.logo.header }}
        style={{ width: 150, height: 42 }}
        contentFit="contain"
        placeholder="Kaszuby24"
        cachePolicy="memory-disk"
        transition={200}
      />
    </Animated.View>
  );
};

// Animated header component that wraps the logo
const AnimatedHeader = () => {
  const { showLogo } = useScrollStore();
  const headerOpacity = React.useRef(new Animated.Value(1)).current;
  const headerTranslateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: showLogo ? 1 : 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: showLogo ? 0 : -10,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showLogo, headerOpacity, headerTranslateY]);

  return (
    <Animated.View
      style={{
        opacity: headerOpacity,
        transform: [{ translateY: headerTranslateY }],
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
      }}
    >
      <AnimatedLogo />
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
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: Platform.select({
            ios: 85,
            android: 75,
            default: 75
          }),
          paddingBottom: Platform.select({
            ios: 20,
            android: 15,
            default: 15
          }),
          paddingTop: 10,
          paddingHorizontal: 12,
          elevation: 8,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
          fontFamily: theme.fontFamily.medium,
        },
        tabBarIconStyle: {
          marginTop: 4,
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
        name="search"
        options={{
          title: 'Szukaj',
          tabBarIcon: ({ color, size }) => (
            <Search size={size} color={color} strokeWidth={2} />
          ),
          headerTitle: () => <AnimatedHeader />,
        }}
      />
      
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Zapisane',
          tabBarIcon: ({ color, size }) => (
            <Bookmark size={size} color={color} strokeWidth={2} />
          ),
          headerTitle: () => <AnimatedHeader />,
        }}
      />
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Główna',
          tabBarIcon: ({ color, size }) => (
            <Home size={size + 2} color={color} strokeWidth={2.5} />
          ),
          headerTitle: () => <AnimatedHeader />,
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
          headerTitle: () => <AnimatedHeader />,
        }}
      />
      
      <Tabs.Screen
        name="preferences"
        options={{
          title: 'Ustawienia',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={2} />
          ),
          headerTitle: () => <AnimatedHeader />,
        }}
      />
    </Tabs>
  );
}