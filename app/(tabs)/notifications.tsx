import React, { useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Trash2, CheckCheck, Clock, Home, Settings, Search, Bookmark } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useNotificationsStore, NotificationItem } from '@/store/notificationsStore';
import EmptyState from '@/components/EmptyState';
import { formatDateTime, getRelativeTime } from '@/utils/dateFormatter';
import { useThemeStore } from '@/store/themeStore';
import { useScrollStore } from '@/store/scrollStore';

// Header component with logo
const NotificationsHeader = () => {
  const { theme } = useThemeStore();

  return (
    <View style={[styles.notificationsHeader, { backgroundColor: theme.colors.background }]}>
      <Image
        source={{ 
          uri: theme.isDarkMode 
            ? 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-białe-01-scaled.png'
            : 'http://kaszuby24.pl/wp-content/uploads/2025/07/Bez-nazwy-2-01-1-scaled.png'
        }}
        style={styles.headerLogo}
        contentFit="contain"
        transition={200}
      />
    </View>
  );
};

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
  const { setScrollDirection, resetScroll } = useScrollStore();
  
  const unreadCount = getUnreadCount();
  
  // Add scroll handler for logo visibility
  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setScrollDirection(scrollY);
  }, [setScrollDirection]);
  
  // Reset scroll state when component mounts
  useEffect(() => {
    resetScroll();
    return () => {
      resetScroll();
    };
  }, [resetScroll]);
  
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
  
  // Bottom navigation functions
  const handleGoHome = useCallback(() => {
    router.push('/(tabs)/');
  }, [router]);

  const handleGoSearch = useCallback(() => {
    router.push('/(tabs)/search');
  }, [router]);

  const handleGoSaved = useCallback(() => {
    router.push('/(tabs)/saved');
  }, [router]);

  const handleGoNotifications = useCallback(() => {
    // Already on notifications
  }, []);

  const handleGoSettings = useCallback(() => {
    router.push('/(tabs)/preferences');
  }, [router]);
  
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
      {/* Header with logo */}
      <NotificationsHeader />
      
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
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
      
      {/* Enhanced Bottom Navigation Menu - Modern & Comfortable */}
      <View style={[styles.modernBottomBar, { backgroundColor: theme.colors.tabBarBackground }]}>
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoSearch}
          activeOpacity={0.8}
        >
          <View style={styles.modernBottomIconWrapper}>
            <Search size={24} color={theme.colors.text} strokeWidth={2} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Szukaj
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoSaved}
          activeOpacity={0.8}
        >
          <View style={styles.modernBottomIconWrapper}>
            <Bookmark size={24} color={theme.colors.text} strokeWidth={2} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Zapisane
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoHome}
          activeOpacity={0.8}
        >
          <View style={styles.modernBottomIconWrapper}>
            <Home size={24} color={theme.colors.text} strokeWidth={2} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Główna
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modernBottomItem, styles.modernBottomItemActive]}
          onPress={handleGoNotifications}
          activeOpacity={0.8}
        >
          <View style={[
            styles.modernBottomIconWrapper, 
            styles.modernBottomIconWrapperActive,
            { backgroundColor: theme.colors.primary }
          ]}>
            <Bell size={26} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.primary, fontFamily: theme.fontFamily.semibold }]}>
            Powiadomienia
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modernBottomItem, { opacity: 0.7 }]}
          onPress={handleGoSettings}
          activeOpacity={0.8}
        >
          <View style={styles.modernBottomIconWrapper}>
            <Settings size={24} color={theme.colors.text} strokeWidth={2} />
          </View>
          <Text style={[styles.modernBottomText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
            Ustawienia
          </Text>
        </TouchableOpacity>
      </View>
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '500',
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
    fontWeight: '500',
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
  notificationsHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerLogo: {
    width: 120,
    height: 32,
  },
  // Enhanced Modern Bottom Bar Styles
  modernBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: Platform.select({
      ios: 28,
      android: 20,
      default: 20,
    }),
    paddingTop: 12,
    borderTopWidth: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: Platform.select({
      ios: 100,
      android: 88,
      default: 88
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  modernBottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  modernBottomItemActive: {
    opacity: 1,
  },
  modernBottomIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  modernBottomIconWrapperActive: {
    shadowColor: '#E84142',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernBottomText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  modernBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modernBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});