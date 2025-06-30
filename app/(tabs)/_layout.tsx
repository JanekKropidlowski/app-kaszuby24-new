import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
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
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  useEffect(() => {
    const initNotifications = async () => {
      try {
        initializePreferences();
        setConnectionStatus('connecting');
        
        // Small delay to ensure app is fully loaded
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await notificationService.setupNotificationHandlers();
        notificationService.startPeriodicCheck();
        
        setConnectionStatus('connected');
      } catch (error) {
        console.warn('Notification setup failed:', error);
        setConnectionStatus('disconnected');
      }
    };
    
    initNotifications();
    
    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = notificationService.getConnectionStatus();
      setConnectionStatus(status);
    }, 5000);
    
    return () => {
      clearInterval(statusInterval);
    };
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
          ...Platform.select({
            ios: {
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            },
            android: {
              elevation: 8,
            },
          }),
          position: 'absolute',
          bottom: 0,
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
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: 'https://kaszuby24.pl/wp-content/uploads/2023/05/ikony_Obszar-roboczy-1.png' }}
                style={{ width: 120, height: 30 }}
                contentFit="contain"
                placeholder="Kaszuby24"
                cachePolicy="memory-disk"
              />
              {connectionStatus === 'connecting' && (
                <View style={{ 
                  marginLeft: 8, 
                  paddingHorizontal: 8, 
                  paddingVertical: 2, 
                  backgroundColor: theme.colors.primary, 
                  borderRadius: 8 
                }}>
                  <Text style={{ 
                    color: '#FFFFFF', 
                    fontSize: 10, 
                    fontFamily: theme.fontFamily.medium 
                  }}>
                    Łączenie...
                  </Text>
                </View>
              )}
            </View>
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
            fontSize: 10,
            fontWeight: '600',
            minWidth: 18,
            height: 18,
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