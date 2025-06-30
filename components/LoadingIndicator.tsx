import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

interface LoadingIndicatorProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'large',
  fullScreen = false,
}) => {
  const { theme } = useThemeStore();
  
  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size={size} color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoadingIndicator;