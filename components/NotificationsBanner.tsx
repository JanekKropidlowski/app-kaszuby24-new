import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface NotificationsBannerProps {
  onPress: () => void;
  onDismiss: () => void;
  image?: string;
  icon?: string;
}

const NotificationsBanner: React.FC<NotificationsBannerProps> = ({
  onPress,
  onDismiss,
  image,
  icon,
}) => {
  const { theme } = useThemeStore();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.content}>
        {image ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: image }} 
              style={styles.notificationImage}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
            {icon ? (
              <Image 
                source={{ uri: icon }} 
                style={styles.appIcon}
                resizeMode="contain"
              />
            ) : (
              <Bell size={20} color={theme.colors.primary} />
            )}
          </View>
        )}
        
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

export const NotificationItem: React.FC<{
  notification: {
    title: string;
    body: string;
    image?: string;
    icon?: string;
    timestamp: number;
    read: boolean;
  };
  onPress: () => void;
}> = ({ notification, onPress }) => {
  const { theme } = useThemeStore();
  
  return (
    <TouchableOpacity 
      style={[
        styles.notificationItem,
        { 
          backgroundColor: notification.read ? theme.colors.background : theme.colors.card,
          opacity: notification.read ? 0.7 : 1
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {notification.image ? (
        <View style={styles.notificationImageContainer}>
          <Image 
            source={{ uri: notification.image }} 
            style={styles.notificationItemImage}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={[styles.notificationIconContainer, { backgroundColor: theme.colors.subtle }]}>
          {notification.icon ? (
            <Image 
              source={{ uri: notification.icon }} 
              style={styles.notificationItemIcon}
              resizeMode="contain"
            />
          ) : (
            <Bell size={20} color={theme.colors.primary} />
          )}
        </View>
      )}
      
      <View style={styles.notificationTextContainer}>
        <Text style={[
          styles.notificationTitle,
          { 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.semibold
          }
        ]}>
          {notification.title}
        </Text>
        <Text style={[
          styles.notificationBody,
          { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular
          }
        ]}>
          {notification.body}
        </Text>
        <Text style={[
          styles.notificationTime,
          { 
            color: theme.colors.textSecondary,
            fontFamily: theme.fontFamily.regular
          }
        ]}>
          {new Date(notification.timestamp).toLocaleString('pl-PL')}
        </Text>
      </View>
      
      {!notification.read && (
        <View style={[styles.unreadIndicator, { backgroundColor: theme.colors.primary }]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  notificationImage: {
    width: '100%',
    height: '100%',
  },
  appIcon: {
    width: 24,
    height: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  notificationItemImage: {
    width: '100%',
    height: '100%',
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationItemIcon: {
    width: 24,
    height: 24,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
});

export default NotificationsBanner;