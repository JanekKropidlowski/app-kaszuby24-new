import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationsStore } from '@/store/notificationsStore';

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
  const { connectionStatus } = useNotificationsStore();
  
  const getDisplayMessage = () => {
    if (message) return message;
    
    if (!showConnecting) return '';
    
    switch (connectionStatus) {
      case 'connecting':
        return 'Łączenie z serwerem...';
      case 'connected':
        return 'Połączono';
      case 'error':
        return 'Błąd połączenia';
      case 'disconnected':
      default:
        return 'Łączenie...';
    }
  };

  const getIndicatorColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return theme.colors.success;
      case 'error':
        return theme.colors.notification;
      case 'connecting':
      case 'disconnected':
      default:
        return theme.colors.primary;
    }
  };
  
  const displayMessage = getDisplayMessage();
  
  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size={size} color={getIndicatorColor()} />
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
        {connectionStatus === 'error' && (
          <Text style={[
            styles.errorMessage,
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular
            }
          ]}>
            Sprawdź połączenie internetowe
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={getIndicatorColor()} />
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
    paddingHorizontal: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoadingIndicator;