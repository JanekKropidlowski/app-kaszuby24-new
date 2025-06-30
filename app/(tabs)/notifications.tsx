import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Trash2, CheckCheck, Clock } from 'lucide-react-native';
import { useNotificationsStore, NotificationItem } from '@/store/notificationsStore';
import EmptyState from '@/components/EmptyState';
import { formatDateTime, getRelativeTime } from '@/utils/dateFormatter';
import { useThemeStore } from '@/store/themeStore';

export default function NotificationsScreen() {
  const router = useRouter();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    getUnreadCount 
  } = useNotificationsStore();
  const { theme } = useThemeStore();
  
  const unreadCount = getUnreadCount();
  
  // Filter out any notifications for sponsored content (category 554)
  const filteredNotifications = notifications.filter(notif => notif.categoryId !== 554);
  
  const handleNotificationPress = (notification: NotificationItem) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.articleId) {
      router.push(`/article/${notification.articleId}`);
    }
  };
  
  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };
  
  const handleClearAll = () => {
    Alert.alert(
      'Wyczyść powiadomienia',
      'Czy na pewno chcesz usunąć wszystkie powiadomienia?',
      [
        { text: 'Anuluj', style: 'cancel' },
        { 
          text: 'Usuń', 
          style: 'destructive',
          onPress: clearNotifications 
        }
      ]
    );
  };
  
  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { 
          backgroundColor: theme.colors.card,
          borderLeftColor: theme.colors.primary 
        },
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[
            styles.notificationTitle,
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.medium
            },
            !item.read && styles.unreadText
          ]}>
            {item.title}
          </Text>
          {!item.read && (
            <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
          )}
        </View>
        
        <Text 
          style={[
            styles.notificationBody, 
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular
            }
          ]} 
          numberOfLines={2}
        >
          {item.body}
        </Text>
        
        <View style={styles.notificationFooter}>
          <Clock size={12} color={theme.colors.textSecondary} />
          <Text style={[
            styles.notificationTime, 
            { 
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular
            }
          ]}>
            {getRelativeTime(new Date(item.timestamp).toISOString())}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[
            styles.headerTitle, 
            { 
              color: theme.colors.text,
              fontFamily: theme.fontFamily.semibold
            }
          ]}>
            Powiadomienia
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.colors.notification }]}>
              <Text style={[
                styles.unreadBadgeText,
                { fontFamily: theme.fontFamily.semibold }
              ]}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
        
        {filteredNotifications.length > 0 && (
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.colors.subtle }]}
                onPress={handleMarkAllAsRead}
              >
                <CheckCheck size={16} color={theme.colors.primary} />
                <Text style={[
                  styles.actionButtonText, 
                  { 
                    color: theme.colors.primary,
                    fontFamily: theme.fontFamily.medium
                  }
                ]}>
                  Oznacz jako przeczytane
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.subtle }]}
              onPress={handleClearAll}
            >
              <Trash2 size={16} color={theme.colors.error} />
              <Text style={[
                styles.actionButtonText, 
                { 
                  color: theme.colors.error,
                  fontFamily: theme.fontFamily.medium
                }
              ]}>
                Wyczyść wszystkie
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="Brak powiadomień"
            message="Gdy pojawią się nowe artykuły z Twoich ulubionych sekcji, zobaczysz je tutaj."
            actionLabel="Ustaw preferencje"
            onAction={() => router.push('/(tabs)/preferences')}
            icon={<Bell size={48} color={theme.colors.primary} />}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    marginRight: 8,
  },
  unreadBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    marginLeft: 4,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  notificationItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  unreadNotification: {
    borderLeftWidth: 4,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  separator: {
    height: 8,
  },
});