import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Bell, Settings, Bookmark } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';

export default function TabLayout() {
  const { getUnreadCount, initializePreferences } = useNotificationsStore();
  const { theme } = useThemeStore();
  const unreadCount = getUnreadCount();
  
  useEffect(() => {
    const initNotifications = async () => {
      try {
        initializePreferences();
        
        // Add delay for Android to ensure app is fully loaded
        if (Platform.OS === 'android') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await notificationService.setupNotificationHandlers();
        notificationService.startPeriodicCheck();
      } catch (error) {
        console.warn('Notification setup failed:', error);
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
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: Platform.select({
            ios: 88,
            android: 72,
            default: 68
          }),
          paddingBottom: Platform.select({
            ios: 24,
            android: 16,
            default: 12
          }),
          paddingTop: 12,
          paddingHorizontal: 16,
          elevation: Platform.OS === 'android' ? 8 : 12,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: Platform.OS === 'android' ? 0.1 : 0.15,
          shadowRadius: 12,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'android' ? 10 : 11,
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
          headerTitle: () => (
            <Image
              source={{ uri: 'https://kaszuby24.pl/wp-content/uploads/2023/05/ikony_Obszar-roboczy-1.png' }}
              style={{ width: 120, height: 30 }}
              contentFit="contain"
              placeholder="Kaszuby24"
              cachePolicy={Platform.OS === 'android' ? 'memory-disk' : 'memory'}
            />
          ),
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
            fontSize: Platform.OS === 'android' ? 9 : 10,
            fontFamily: theme.fontFamily.semibold,
            minWidth: Platform.OS === 'android' ? 16 : 18,
            height: Platform.OS === 'android' ? 16 : 18,
          },
        }}
      />
      
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Zapisane',
          tabBarIcon: ({ color, size }) => (
            <Bookmark size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="preferences"
        options={{
          title: 'Ustawienia',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}