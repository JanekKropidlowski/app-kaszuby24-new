import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useThemeStore } from '@/store/themeStore';
import EmptyState from '@/components/EmptyState';

export default function NotificationsPreferencesScreen() {
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

  const handleNotificationPress = (notification: any) => {
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

  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notification, { backgroundColor: item.read ? theme.colors.card : theme.colors.primary + '22' }]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.85}
    >
      <Text style={[styles.notificationTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
      <Text style={[styles.notificationMeta, { color: theme.colors.textSecondary }]}>{item.date}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Text style={[styles.header, { color: theme.colors.text }]}>Twoje powiadomienia</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleMarkAllAsRead}>
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>Oznacz wszystkie jako przeczytane</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleClearAll}>
          <Text style={[styles.actionText, { color: theme.colors.error }]}>Wyczyść wszystkie</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={filteredNotifications.length === 0 ? styles.center : undefined}
        ListEmptyComponent={
          <EmptyState
            title="Brak powiadomień"
            message="Gdy pojawią się nowe artykuły z Twoich ulubionych sekcji, zobaczysz je tutaj."
            icon={<Bell size={48} color={theme.colors.primary} />}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 30 },
  header: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notification: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 14,
    marginVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  separator: {
    height: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
}); 