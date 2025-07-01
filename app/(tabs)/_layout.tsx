import React, { useEffect } from 'react';
import { Platform, View, Animated, StyleSheet } from 'react-native';
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

// Enhanced iOS-style header
const IOSStyleHeader = () => {
  const { theme } = useThemeStore();
  const { showLogo } = useScrollStore();
  const headerOpacity = React.useRef(new Animated.Value(1)).current;
  const headerTranslate = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: showLogo ? 1 : 0.95,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslate, {
        toValue: showLogo ? 0 : -10,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showLogo, headerOpacity, headerTranslate]);

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }],
        }
      ]}
    >
      {/* Top section with greeting and weather */}
      <View style={styles.topSection}>
        <WelcomeGreeting />
        <WeatherWidget />
      </View>

      {/* Logo section */}
      <View style={styles.logoSection}>
        <HeaderLogo variant="text" />
      </View>
    </Animated.View>
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
          paddingTop: 5,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 75 : 60,
          transform: [{ translateY: tabBarTranslateY }],
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
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 12,
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  logoSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});