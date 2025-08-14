import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import TabBarButton from './TabBarButton';
import { useRouter } from 'expo-router';

interface GlobalTabBarProps {
  activeTab?: 'search' | 'saved' | 'home' | 'kalendarz' | 'preferences';
}

const GlobalTabBar: React.FC<GlobalTabBarProps> = ({ activeTab = 'home' }) => {
  const { theme } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Oblicz właściwy padding dla Androida z safe area
  const getBottomPadding = () => {
    if (Platform.OS === 'ios') {
      return insets.bottom > 0 ? insets.bottom : 32;
    }
    // Android: zawsze dodaj minimum 20px + safe area
    const androidPadding = Math.max(20, insets.bottom) + 20;
    // console.log('Android Tab Bar - Safe Area Bottom:', insets.bottom, 'Final Padding:', androidPadding);
    return androidPadding;
  };
  
  const getTabBarHeight = () => {
    if (Platform.OS === 'ios') {
      return 110;
    }
    // Android: bazowa wysokość + padding
    return 80 + getBottomPadding();
  };

  return (
    <View style={[
      styles.tabBar, 
      { 
        backgroundColor: theme.colors.tabBarBackground, 
        borderTopColor: theme.colors.border,
        borderTopWidth: 1,
        paddingBottom: getBottomPadding(),
        paddingTop: Platform.OS === 'android' ? 20 : 16,
        height: getTabBarHeight()
      }
    ]}>
      <TabBarButton
        icon="Search"
        label="Szukaj"
        onPress={() => router.push('/(tabs)/search')}
        active={activeTab === 'search'}
      />
      <TabBarButton
        icon="Bookmark"
        label="Zapisane"
        onPress={() => router.push('/(tabs)/saved')}
        active={activeTab === 'saved'}
      />
      <TabBarButton
        icon="Home"
        label="Główna"
        onPress={() => router.push('/(tabs)')}
        active={activeTab === 'home'}
      />
      <TabBarButton
        icon="CalendarIcon"
        label="Kalendarz"
        onPress={() => router.push('/(tabs)/kalendarz')}
        active={activeTab === 'kalendarz'}
      />
      <TabBarButton
        icon="Settings"
        label="Ustawienia"
        onPress={() => router.push('/(tabs)/preferences')}
        active={activeTab === 'preferences'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: Platform.OS === 'android' ? 12 : 8, // Increased elevation for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: Platform.OS === 'android' ? 0.15 : 0.1, // Increased shadow for Android
    shadowRadius: Platform.OS === 'android' ? 12 : 8, // Increased shadow radius for Android
    borderTopLeftRadius: Platform.OS === 'android' ? 32 : 28, // Increased radius for Android
    borderTopRightRadius: Platform.OS === 'android' ? 32 : 28, // Increased radius for Android
    zIndex: 10,
  },
});

export default GlobalTabBar; 