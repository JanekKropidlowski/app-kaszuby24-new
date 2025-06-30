import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface NotificationsBannerProps {
  onPress: () => void;
  onDismiss: () => void;
}

const NotificationsBanner: React.FC<NotificationsBannerProps> = ({
  onPress,
  onDismiss,
}) => {
  const { theme } = useThemeStore();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
          <Bell size={20} color={theme.colors.primary} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            styles.title,
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.semibold
            }
          ]}>
            Nie przegap ważnych wiadomości!
          </Text>
          <Text style={[
            styles.subtitle,
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular
            }
          ]}>
            Włącz powiadomienia i wybierz swoje regiony
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.dismissButton}
          onPress={onDismiss}
        >
          <X size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
        onPress={onPress}
      >
        <Text style={[
          styles.actionButtonText,
          { fontFamily: theme.fontFamily.semibold }
        ]}>
          Skonfiguruj teraz
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationsBanner;