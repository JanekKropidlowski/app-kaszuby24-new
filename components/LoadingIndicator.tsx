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
  showConnecting = true,
}) => {
  const { theme } = useThemeStore();
  
  const displayMessage = message || (showConnecting ? 'Łączenie...' : '');
  
  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size={size} color={theme.colors.primary} />
        {displayMessage && (
          <Text style={[
            styles.message,
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.medium
            }
          ]}>
            {displayMessage}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {displayMessage && (
        <Text style={[
          styles.message,
          { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.medium
          }
        ]}>
          {displayMessage}
        </Text>
      )}
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
  message: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LoadingIndicator;