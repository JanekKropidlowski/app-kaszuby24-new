import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Home, Search, Bookmark, Calendar as CalendarIcon, Settings, LayoutGrid } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface TabBarButtonProps {
  icon: 'Home' | 'Search' | 'Bookmark' | 'CalendarIcon' | 'Settings' | 'Menu';
  label: string;
  onPress: () => void;
  active: boolean;
}

const TabBarButton: React.FC<TabBarButtonProps> = ({ icon, label, onPress, active }) => {
  const { theme } = useThemeStore();

  const iconMap = {
    Home,
    Search,
    Bookmark,
    CalendarIcon,
    Settings,
    Menu: LayoutGrid
  };

  const Icon = iconMap[icon];

  if (!Icon) return null;

  // Platform-specific sizes
  const iconSize = active
    ? (Platform.OS === 'android' ? 28 : 26) // Larger icons on Android
    : (Platform.OS === 'android' ? 26 : 24);

  const strokeWidth = active
    ? (Platform.OS === 'android' ? 2.8 : 2.5) // Thicker strokes on Android
    : (Platform.OS === 'android' ? 2.2 : 2);

  const containerSize = active
    ? (Platform.OS === 'android' ? 52 : 48) // Larger active container on Android
    : 'auto';

  return (
    <TouchableOpacity
      style={[
        styles.tabItem,
        {
          paddingVertical: Platform.OS === 'android' ? 12 : 8, // More padding on Android
          minHeight: Platform.OS === 'android' ? 60 : 50 // Minimum height for better touch targets
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        {
          backgroundColor: active ? theme.colors.primary : 'transparent',
          borderRadius: active ? (Platform.OS === 'android' ? 26 : 24) : 0,
          width: active ? containerSize : 'auto',
          height: active ? containerSize : 'auto',
          padding: active ? (Platform.OS === 'android' ? 12 : 10) : 0, // More padding on Android
        }
      ]}>
        <Icon
          size={iconSize}
          color={active ? '#FFFFFF' : theme.colors.textSecondary}
          strokeWidth={strokeWidth}
        />
      </View>
      <Text style={[
        styles.tabLabel,
        {
          color: active ? theme.colors.primary : theme.colors.textSecondary,
          fontFamily: theme.fontFamily.medium,
          fontSize: Platform.OS === 'android' ? 13 : 12, // Larger font on Android
          marginTop: Platform.OS === 'android' ? 6 : 4, // More spacing on Android
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    textAlign: 'center',
    fontWeight: Platform.OS === 'android' ? '500' : '400', // Slightly bolder on Android
  },
});

export default TabBarButton; 