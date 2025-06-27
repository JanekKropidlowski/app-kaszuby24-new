import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Bell, Settings, Bookmark, User } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';

export default function TabLayout() {
  const { getUnreadCount, initializePreferences } = useNotificationsStore();
  const { theme } = useThemeStore();
  const unreadCount = getUnreadCount();
  
  useEffect(() => {
    // Initialize notifications
    const initNotifications = async () => {
      initializePreferences();
      await notificationService.setupNotificationHandlers();
      notificationService.startPeriodicCheck();
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
          elevation: 0,
          height: 60,
          paddingBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        headerStyle: {
          backgroundColor: theme.colors.card,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: theme.colors.text,
          fontFamily: theme.fontFamily?.semibold || 'Poppins-SemiBold',
        },
        headerTintColor: theme.colors.primary,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => (
            <Image
              source={{ uri: 'https://kaszuby24.pl/wp-content/uploads/2023/05/ikony_Obszar-roboczy-1.png' }}
              style={{ width: 140, height: 35 }}
              contentFit="contain"
            />
          ),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Powiadomienia',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Bell size={size} color={color} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  backgroundColor: theme.colors.notification,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: '600',
                    fontFamily: theme.fontFamily?.regular || 'Poppins-Regular',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          title: 'Moje Sekcje',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Zapisane',
          tabBarIcon: ({ color, size }) => <Bookmark size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Więcej',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}