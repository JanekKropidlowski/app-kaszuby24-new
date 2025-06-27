import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Bell, Settings, Bookmark, User } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width * 0.9;
const TAB_WIDTH = TAB_BAR_WIDTH / 5;

export default function TabLayout() {
  const { getUnreadCount, initializePreferences } = useNotificationsStore();
  const { theme } = useThemeStore();
  const unreadCount = getUnreadCount();
  
  // Shared value for the indicator position
  const indicatorPosition = useSharedValue(0);
  
  useEffect(() => {
    // Initialize notifications
    const initNotifications = async () => {
      initializePreferences();
      await notificationService.setupNotificationHandlers();
      notificationService.startPeriodicCheck();
    };
    
    initNotifications();
  }, [initializePreferences]);
  
  // Animated style for the indicator
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(indicatorPosition.value, {
        damping: 15,
        stiffness: 120,
      }) }],
    };
  });
  
  const renderTabBarIcon = (Icon: any, focused: boolean, badgeCount?: number, index?: number) => {
    // Update indicator position when tab is focused
    if (focused && index !== undefined) {
      indicatorPosition.value = index * TAB_WIDTH;
    }
    
    return (
      <View style={styles.tabIconContainer}>
        <Icon 
          size={22} 
          color={focused ? theme.colors.primary : theme.colors.textSecondary} 
          strokeWidth={focused ? 2.5 : 1.8}
        />
        
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
          position: 'absolute',
          bottom: 20,
          left: '5%',
          right: '5%',
          width: '90%',
          height: 70,
          backgroundColor: theme.colors.card,
          borderRadius: 35,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          borderTopWidth: 0,
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
        tabBarItemStyle: {
          height: 70,
        },
      }}
      tabBar={(props) => (
        <View style={styles.customTabBarContainer}>
          <View style={[
            styles.customTabBar,
            { backgroundColor: theme.colors.card }
          ]}>
            {/* Animated indicator */}
            {Platform.OS !== 'web' && (
              <Animated.View 
                style={[
                  styles.indicator, 
                  { backgroundColor: theme.colors.primary + '15' },
                  indicatorStyle
                ]} 
              />
            )}
            
            {/* Regular tab bar */}
            <Tabs.DefaultTabBar {...props} />
          </View>
        </View>
      )}
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
          tabBarIcon: ({ focused }) => renderTabBarIcon(Home, focused, undefined, 0),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Powiadomienia',
          tabBarIcon: ({ focused }) => renderTabBarIcon(Bell, focused, unreadCount, 1),
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          title: 'Moje Sekcje',
          tabBarIcon: ({ focused }) => renderTabBarIcon(Settings, focused, undefined, 2),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Zapisane',
          tabBarIcon: ({ focused }) => renderTabBarIcon(Bookmark, focused, undefined, 3),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Więcej',
          tabBarIcon: ({ focused }) => renderTabBarIcon(User, focused, undefined, 4),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  customTabBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  customTabBar: {
    width: TAB_BAR_WIDTH,
    height: 70,
    borderRadius: 35,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    width: TAB_WIDTH,
    height: 70,
    borderRadius: 35,
    zIndex: 0,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 70,
    width: '100%',
  },
  badge: {
    position: 'absolute',
    top: 15,
    right: '30%',
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