import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Home, Search, Bookmark, Calendar as CalendarIcon, Settings } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface TabBarButtonProps {
  icon: 'Home' | 'Search' | 'Bookmark' | 'CalendarIcon' | 'Settings';
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
    Settings 
  };
  
  const Icon = iconMap[icon];
  
  if (!Icon) return null;
  
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
      <View style={[
        styles.iconContainer,
        {
          backgroundColor: active ? theme.colors.primary : 'transparent',
          borderRadius: active ? 24 : 0,
          width: active ? 48 : 'auto',
          height: active ? 48 : 'auto',
        }
      ]}>
        <Icon 
          size={active ? 26 : 24} 
          color={active ? '#FFFFFF' : theme.colors.textSecondary} 
          strokeWidth={active ? 2.5 : 2} 
        />
      </View>
      <Text style={[
        styles.tabLabel, 
        { 
          color: active ? theme.colors.primary : theme.colors.textSecondary, 
          fontFamily: theme.fontFamily.medium 
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
    paddingVertical: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default TabBarButton; 