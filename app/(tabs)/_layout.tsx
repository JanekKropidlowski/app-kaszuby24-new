import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, Bell, Settings, Bookmark, User } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useNotificationsStore } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';
import { useThemeStore } from '@/store/themeStore';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width * 0.9;
const TAB_WIDTH = TAB_BAR_WIDTH / 5;

export default function TabLayout() {
  const { getUnreadCount, initializePreferences } = useNotificationsStore();
  const { theme } = useThemeStore();
  const unreadCount = getUnreadCount();
  const router = useRouter();
  
  useEffect(() => {
    // Initialize notifications
    const initNotifications = async () => {
      try {
        initializePreferences();
        await notificationService.setupNotificationHandlers();
        notificationService.startPeriodicCheck();
      } catch (error) {
        console.warn('Notification setup failed:', error);
      }
    };
    
    initNotifications();
  }, [initializePreferences]);
  
  const renderTabBarIcon = (Icon: any, focused: boolean, badgeCount?: number) => {
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
          display: 'none', // Hide the default tab bar
        },
        headerStyle: {
          backgroundColor: theme.colors.card,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: theme.colors.text,
          fontFamily: Platform.select({
            ios: 'Poppins-SemiBold',
            android: 'Poppins-SemiBold',
            default: 'System'
          }),
        },
        headerTintColor: theme.colors.primary,
      }}
      tabBar={({ state, descriptors, navigation }) => (
        <View style={styles.customTabBarContainer}>
          <View style={[
            styles.customTabBar,
            { 
              backgroundColor: theme.colors.card,
              shadowColor: Platform.OS === 'android' ? theme.colors.shadow : '#000',
            }
          ]}>
            {/* Custom tab bar implementation */}
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              
              let icon;
              switch (route.name) {
                case 'index':
                  icon = renderTabBarIcon(Home, isFocused);
                  break;
                case 'notifications':
                  icon = renderTabBarIcon(Bell, isFocused, unreadCount);
                  break;
                case 'preferences':
                  icon = renderTabBarIcon(Settings, isFocused);
                  break;
                case 'saved':
                  icon = renderTabBarIcon(Bookmark, isFocused);
                  break;
                case 'more':
                  icon = renderTabBarIcon(User, isFocused);
                  break;
                default:
                  icon = null;
              }
              
              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                
                if (!isFocused && !event.defaultPrevented) {
                  router.replace(route.name);
                }
              };
              
              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={[
                    styles.tabButton,
                    isFocused && { backgroundColor: theme.colors.primary + '15' }
                  ]}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  android_ripple={{ 
                    color: theme.colors.primary + '20',
                    borderless: true,
                    radius: 30
                  }}
                >
                  {icon}
                </Pressable>
              );
            })}
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
              placeholder="Kaszuby24"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Powiadomienia',
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          title: 'Moje Sekcje',
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Zapisane',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Więcej',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  customTabBarContainer: {
    position: 'absolute',
    bottom: Platform.select({
      ios: 20,
      android: 16,
      default: 20
    }),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  customTabBar: {
    width: TAB_BAR_WIDTH,
    height: 70,
    borderRadius: 35,
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 70,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
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