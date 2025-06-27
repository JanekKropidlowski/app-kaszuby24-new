import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  
  const renderTabBarIcon = (Icon: any, focused: boolean, badgeCount?: number) => {
    return (
      <View style={styles.tabIconContainer}>
        <View style={[
          styles.iconBackground, 
          focused && { backgroundColor: theme.colors.primary + '15' }
        ]}>
          <Icon 
            size={22} 
            color={focused ? theme.colors.primary : theme.colors.textSecondary} 
          />
        </View>
        
        {badgeCount && badgeCount > 0 ? (
          <View style={[
            styles.badge, 
            { backgroundColor: theme.colors.notification }
          ]}>
            <Text style={styles.badgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };
  
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
          tabBarIcon: ({ focused }) => renderTabBarIcon(Home, focused),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Powiadomienia',
          tabBarIcon: ({ focused }) => renderTabBarIcon(Bell, focused, unreadCount),
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          title: 'Moje Sekcje',
          tabBarIcon: ({ focused }) => renderTabBarIcon(Settings, focused),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Zapisane',
          tabBarIcon: ({ focused }) => renderTabBarIcon(Bookmark, focused),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Więcej',
          tabBarIcon: ({ focused }) => renderTabBarIcon(User, focused),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});