import React, { useEffect } from 'react';
import { Platform, View, Animated, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Bell, Settings, Bookmark, Search } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';
import { useScrollStore } from '@/store/scrollStore';
import { WelcomeGreeting } from '@/components/WelcomeGreeting';
import { WeatherWidget } from '@/components/WeatherWidget';
import { HeaderLogo } from '@/components/HeaderLogo';

// Enhanced iOS-style header - Wariant 1: Logo Inline
const IOSStyleHeader = () => {
  const { theme } = useThemeStore();
  const { showLogo } = useScrollStore();
  const headerOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: showLogo ? 1 : 0.98,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showLogo, headerOpacity]);

  return (
    <View style={[styles.headerWrapper, { backgroundColor: theme.colors.background }]}>
      <Animated.View 
        style={[
          styles.headerContainer, 
          { 
            backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            opacity: headerOpacity,
          }
        ]}
      >
        <View style={styles.headerContent}>
          {/* Left: Greeting */}
          <WelcomeGreeting />
          
          {/* Center: Subtle Logo */}
          <View style={styles.logoContainer}>
            <Text style={[styles.logoText, { 
              color: theme.colors.primary,
              fontFamily: theme.fontFamily.bold
            }]}>
              Kaszuby24
            </Text>
          </View>
          
          {/* Right: Weather */}
          <WeatherWidget />
        </View>
      </Animated.View>
    </View>
  );
};

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
    // Request permissions on app load
    notificationService.requestPermissions();
    
    // Register for push notifications
    notificationService.registerForPushNotifications();
    
    // Listen for notifications
    const notificationListener = notificationService.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      incrementNotificationCount();
    });
    
    const responseListener = notificationService.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
      // Handle notification tap
    });
    
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [incrementNotificationCount]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          height: Platform.OS === 'ios' ? 80 : 65,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: theme.fontFamily.medium,
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
        name="index"
        options={{
          title: 'Start',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          header: () => <IOSStyleHeader />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Szukaj',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Zapisane',
          tabBarIcon: ({ color, size }) => <Bookmark size={size} color={color} />,
          headerTitle: 'Zapisane artykuły',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Powiadomienia',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Bell size={size} color={color} />
              {hasUnreadNotifications && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.colors.notification,
                }} />
              )}
            </View>
          ),
          headerTitle: 'Powiadomienia',
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          title: 'Ustawienia',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          headerTitle: 'Ustawienia',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    paddingTop: Platform.OS === 'ios' ? 54 : 34,
    paddingBottom: 0,
  },
  headerContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  logoText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
    opacity: 0.3,
  },
});