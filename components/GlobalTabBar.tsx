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

  return (
    <View style={[
      styles.tabBar, 
      { 
        backgroundColor: theme.colors.tabBarBackground, 
        borderTopColor: theme.colors.border,
        borderTopWidth: 1,
        paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 32 : 18),
        paddingTop: 16,
        height: Platform.OS === 'ios' ? 110 : 98
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 10,
  },
});

export default GlobalTabBar; 