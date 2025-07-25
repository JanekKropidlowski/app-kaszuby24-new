import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Trash2, Check, ArrowLeft, Settings } from 'lucide-react-native';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useThemeStore } from '@/store/themeStore';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { EmptyState } from '@/components/EmptyState';
import { formatDateTime } from '@/utils/dateFormatter';

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const {
    notifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    hasUnreadNotifications,
  } = useNotificationsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const unreadCount = getUnreadCount();

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleGoSettings = useCallback(() => {
    router.push('/(tabs)/preferences');
  }, [router]);

  const handleMarkAsRead = useCallback((notificationId: string) => {
    markAsRead(notificationId);
  }, [markAsRead]);

  const handleMarkAllAsRead = useCallback(() => {
    if (hasUnreadNotifications()) {
      markAllAsRead();
    }
  }, [markAllAsRead, hasUnreadNotifications]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Wyczyść powiadomienia',
      'Czy na pewno chcesz usunąć wszystkie powiadomienia?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyczyść',
          style: 'destructive',
          onPress: () => clearNotifications(),
        },
      ]
    );
  }, [clearNotifications]);

  const handleNotificationPress = useCallback((notification: any) => {
    // Mark as read when pressed
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to article if available
    if (notification.articleId) {
      router.push(`/article/${notification.articleId}`);
    }
  }, [markAsRead, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderNotification = (notification: any) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.read 
            ? theme.colors.card 
            : theme.colors.primary + '10',
          borderLeftColor: notification.read 
            ? 'transparent' 
            : theme.colors.primary,
        }
      ]}
      onPress={() => handleNotificationPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text
            style={[
              styles.notificationTitle,
              {
                color: theme.colors.text,
                fontFamily: theme.fontFamily.semibold,
              }
            ]}
            numberOfLines={2}
          >
            {notification.title}
          </Text>
          {!notification.read && (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={() => handleMarkAsRead(notification.id)}
              activeOpacity={0.7}
            >
              <Check size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        
        <Text
          style={[
            styles.notificationBody,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.fontFamily.regular,
            }
          ]}
          numberOfLines={3}
        >
          {notification.body}
        </Text>
        
        <Text
          style={[
            styles.notificationTime,
            {
              color: theme.colors.textTertiary,
              fontFamily: theme.fontFamily.regular,
            }
          ]}
        >
          {formatDateTime(new Date(notification.timestamp))}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        style={theme.isDarkMode ? "light" : "dark"} 
        backgroundColor={theme.colors.background}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text
          style={[
            styles.headerTitle,
            {
              color: theme.colors.text,
              fontFamily: theme.fontFamily.bold,
            }
          ]}
        >
          Powiadomienia
          {unreadCount > 0 && (
            <Text style={[styles.unreadBadge, { color: theme.colors.primary }]}>
              {' '}({unreadCount})
            </Text>
          )}
        </Text>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleGoSettings}
          activeOpacity={0.7}
        >
          <Settings size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      {(hasUnreadNotifications() || notifications.length > 0) && (
        <View style={[styles.actionBar, { backgroundColor: theme.colors.card }]}>
          {hasUnreadNotifications() && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleMarkAllAsRead}
              activeOpacity={0.7}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF', fontFamily: theme.fontFamily.medium }]}>
                Oznacz jako przeczytane
              </Text>
            </TouchableOpacity>
          )}
          
          {notifications.length > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF', fontFamily: theme.fontFamily.medium }]}>
                Wyczyść wszystkie
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <LoadingIndicator />
        ) : notifications.length > 0 ? (
          <View style={styles.notificationsList}>
            {notifications.map(renderNotification)}
          </View>
        ) : (
          <EmptyState
            icon={<Bell size={64} color={theme.colors.textSecondary} />}
            title="Brak powiadomień"
            description="Nie masz jeszcze żadnych powiadomień. Będą się tutaj pojawiać nowe wiadomości."
            actionText="Przejdź do ustawień"
            onAction={handleGoSettings}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  unreadBadge: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  notificationsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  notificationItem: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    lineHeight: 22,
  },
  markReadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 