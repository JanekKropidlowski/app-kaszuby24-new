import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useNotificationsStore } from '@/store/notificationsStore';
import { registerPushToken } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private periodicCheckInterval: NodeJS.Timeout | null = null;
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Web notification permissions
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        return false;
      }
      
      // Mobile permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.warn('Error requesting notification permissions:', error);
      return false;
    }
  }
  
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        console.log('Push notifications not supported on web');
        return null;
      }
      
      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Permission not granted for push notifications');
        return null;
      }
      
      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      console.log('Expo Push Token:', token.data);
      
      // Store token in state
      const { setExpoPushToken } = useNotificationsStore.getState();
      setExpoPushToken(token.data);
      
      // Register token with backend
      await this.registerTokenWithBackend(token.data);
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }
  
  async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const { userLocation } = useNotificationsStore.getState();
      
      if (!userLocation) {
        console.log('No user location selected, skipping token registration');
        return;
      }
      
      await registerPushToken({
        token,
        location: userLocation.slug,
        locationId: userLocation.id,
        platform: Platform.OS,
        deviceInfo: {
          brand: 'unknown',
          modelName: 'unknown',
          osName: Platform.OS,
          osVersion: 'unknown',
        }
      });
      
      console.log('Push token registered with backend successfully');
    } catch (error) {
      console.error('Error registering token with backend:', error);
    }
  }
  
  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            data,
          });
        }
        return;
      }
      
      // Mobile notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.warn('Error scheduling notification:', error);
    }
  }
  
  async setupNotificationHandlers(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      
      // Handle notification received while app is in foreground
      Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
        
        // Add to notification history
        const { addNotification } = useNotificationsStore.getState();
        const data = notification.request.content.data || {};
        
        addNotification({
          title: notification.request.content.title || 'Nowe powiadomienie',
          body: notification.request.content.body || '',
          articleId: typeof data.articleId === 'number' ? data.articleId : undefined,
          categoryId: typeof data.categoryId === 'number' ? data.categoryId : undefined,
          read: false,
        });
      });
      
      // Handle notification tapped
      Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data || {};
        console.log('Notification tapped:', data);
        
        if (data.articleId && typeof data.articleId === 'number') {
          // This will be handled by the deep linking system
          console.log('Navigate to article:', data.articleId);
        }
      });
      
      // Register for push notifications
      await this.registerForPushNotifications();
    } catch (error) {
      console.warn('Error setting up notification handlers:', error);
    }
  }
  
  async updateLocationAndReregister(): Promise<void> {
    try {
      const { expoPushToken } = useNotificationsStore.getState();
      
      if (expoPushToken) {
        await this.registerTokenWithBackend(expoPushToken);
      } else {
        // If no token, try to get one
        await this.registerForPushNotifications();
      }
    } catch (error) {
      console.error('Error updating location and reregistering:', error);
    }
  }
  
  startPeriodicCheck(): void {
    // Check for new notifications every 5 minutes when app is active
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
    }
    
    this.periodicCheckInterval = setInterval(() => {
      // This could be used to sync with backend for missed notifications
      console.log('Periodic notification check');
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  stopPeriodicCheck(): void {
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }
  }
}

export const notificationService = NotificationService.getInstance();