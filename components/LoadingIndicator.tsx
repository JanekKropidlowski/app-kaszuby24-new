import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

interface LoadingIndicatorProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
  message?: string;
  showConnecting?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'large',
  fullScreen = false,
  message,
  showConnecting = false,
}) => {
  const { theme } = useThemeStore();
  
  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size={size} color={theme.colors.primary} />
        {message && (
          <Text style={[styles.message, { color: theme.colors.text, fontFamily: theme.fontFamily?.medium }]}>
            {message}
          </Text>
        )}
        {showConnecting && (
          <Text style={[styles.connectingText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily?.regular }]}>
            Trwa łączenie z serwerem...
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && (
        <Text style={[styles.message, { color: theme.colors.text, fontFamily: theme.fontFamily?.medium }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  connectingText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default LoadingIndicator;