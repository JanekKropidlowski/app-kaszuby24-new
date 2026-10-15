import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import TabBarButton from './TabBarButton';
import { useRouter } from 'expo-router';

interface GlobalTabBarProps {
  activeTab?: 'search' | 'saved' | 'home' | 'kalendarz' | 'menu';
}

/**
 * Wysokość paska zakładek — wspólna dla elementów, które muszą stać tuż nad nim
 * (pasek postępu czytania, odtwarzacz, dolny odstęp treści artykułu).
 */
export const useGlobalTabBarMetrics = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 32 : 20;
  const height = Platform.OS === 'ios' ? 110 : 80 + bottomPadding;
  return { height, bottomPadding };
};

// navigate, nie push: push dokładał nową kopię zakładki na stos przy każdym dotknięciu
// (Główna ładowała się od nowa, Wstecz cofał przez wszystkie kopie).
const GlobalTabBar: React.FC<GlobalTabBarProps> = ({ activeTab = 'home' }) => {
  const { theme } = useThemeStore();
  const router = useRouter();
  const { height: tabBarHeight, bottomPadding } = useGlobalTabBarMetrics();

  return (
    <View style={[
      styles.tabBar,
      {
        backgroundColor: theme.colors.tabBarBackground,
        borderTopColor: theme.colors.border,
        borderTopWidth: 1,
        paddingBottom: bottomPadding,
        paddingTop: Platform.OS === 'android' ? 20 : 16,
        height: tabBarHeight
      }
    ]}>
      <TabBarButton
        icon="Search"
        label="Szukaj"
        onPress={() => router.navigate('/(tabs)/search')}
        active={activeTab === 'search'}
      />
      <TabBarButton
        icon="Bookmark"
        label="Zapisane"
        onPress={() => router.navigate('/(tabs)/saved')}
        active={activeTab === 'saved'}
      />
      <TabBarButton
        icon="Home"
        label="Główna"
        onPress={() => router.navigate('/(tabs)')}
        active={activeTab === 'home'}
      />
      <TabBarButton
        icon="CalendarIcon"
        label="Kalendarz"
        onPress={() => router.navigate('/(tabs)/kalendarz')}
        active={activeTab === 'kalendarz'}
      />
      <TabBarButton
        icon="Menu"
        label="Menu"
        onPress={() => router.navigate('/(tabs)/menu')}
        active={activeTab === 'menu'}
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
    zIndex: 9999,
  },
});

export default GlobalTabBar; 