import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, UIManager, Platform } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WeatherSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export const WeatherSection = ({ title, icon, children, defaultCollapsed = false }: WeatherSectionProps) => {
  const { theme } = useThemeStore();
  
  // Fallback if theme is not loaded yet
  if (!theme) {
    return null;
  }
  
  const styles = getStyles(theme);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleCollapse} style={styles.header} activeOpacity={0.8}>
        <View style={styles.titleContainer}>
          {React.cloneElement(icon as React.ReactElement)}
          <Text style={styles.title}>{title}</Text>
        </View>
        {isCollapsed ? <ChevronDown size={22} color={theme.colors.textSecondary} /> : <ChevronUp size={22} color={theme.colors.textSecondary} />}
      </TouchableOpacity>
      {!isCollapsed && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: theme.colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 20,
  },
});
