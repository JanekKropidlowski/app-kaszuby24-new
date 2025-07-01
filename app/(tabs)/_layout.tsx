import React, { useEffect } from 'react';
import { Platform, View, Animated, StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Bell, Settings, Bookmark, Search } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';
import { useScrollStore } from '@/store/scrollStore';

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
    <>
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
            headerShown: false, // Completely hide the header
            tabBarStyle: { display: 'none' }, // Hide default tab bar on home screen
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
      
      {/* Floating Logo */}
      <FloatingLogo />
    </>
  );
}

const styles = StyleSheet.create({
  floatingLogoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 34,
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