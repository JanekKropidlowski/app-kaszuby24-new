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
  private isInitialized = false;
  
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
      
      // Mobile permissions - with Android-specific handling
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        // Add delay for Android to ensure UI is ready
        if (Platform.OS === 'android') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
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
      
      // Android-specific: Check if device supports push notifications
      if (Platform.OS === 'android') {
        const devicePushToken = await Notifications.getDevicePushTokenAsync();
        console.log('Android device push token:', devicePushToken);
      }
      
      // Get the token with error handling for Android
      let token;
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                         Constants.easConfig?.projectId ||
                         Constants.manifest?.extra?.eas?.projectId;
        
        if (!projectId) {
          console.warn('No project ID found for push notifications');
          return null;
        }
        
        token = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
      } catch (tokenError) {
        console.error('Error getting Expo push token:', tokenError);
        
        // Fallback for Android
        if (Platform.OS === 'android') {
          try {
            const deviceToken = await Notifications.getDevicePushTokenAsync();
            console.log('Using device token as fallback:', deviceToken);
            // For now, we'll skip registration if Expo token fails on Android
            return null;
          } catch (deviceTokenError) {
            console.error('Device token also failed:', deviceTokenError);
            return null;
          }
        }
        
        throw tokenError;
      }
      
      console.log('Expo Push Token:', token.data);
      
      // Store token in state
      const { setExpoPushToken } = useNotificationsStore.getState();
      setExpoPushToken(token.data);
      
      // Register token with backend
      await this.registerTokenWithBackend(token.data);
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      
      // Don't throw error on Android - just log and continue
      if (Platform.OS === 'android') {
        console.warn('Push notifications setup failed on Android, continuing without them');
        return null;
      }
      
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
      // Don't throw - this shouldn't break the app
    }
  }
  
  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      // Don't schedule notifications for sponsored content
      if (data?.categoryId === 554) {
        console.log('Skipping notification for sponsored content');
        return;
      }
      
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
      if (Platform.OS === 'web' || this.isInitialized) return;
      
      // Mark as initialized to prevent multiple setups
      this.isInitialized = true;
      
      // Handle notification received while app is in foreground
      Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
        
        try {
          // Add to notification history
          const { addNotification } = useNotificationsStore.getState();
          const data = notification.request.content.data || {};
          
          // Don't process notifications for sponsored content
          if (data.categoryId === 554) {
            console.log('Ignoring notification for sponsored content');
            return;
          }
          
          addNotification({
            title: notification.request.content.title || 'Nowe powiadomienie',
            body: notification.request.content.body || '',
            articleId: typeof data.articleId === 'number' ? data.articleId : undefined,
            categoryId: typeof data.categoryId === 'number' ? data.categoryId : undefined,
            read: false,
          });
        } catch (error) {
          console.warn('Error processing received notification:', error);
        }
      });
      
      // Handle notification tapped
      Notifications.addNotificationResponseReceivedListener(response => {
        try {
          const data = response.notification.request.content.data || {};
          console.log('Notification tapped:', data);
          
          // Don't handle taps for sponsored content
          if (data.categoryId === 554) {
            console.log('Ignoring tap for sponsored content notification');
            return;
          }
          
          if (data.articleId && typeof data.articleId === 'number') {
            // This will be handled by the deep linking system
            console.log('Navigate to article:', data.articleId);
          }
        } catch (error) {
          console.warn('Error processing notification response:', error);
        }
      });
      
      // Register for push notifications with delay for Android
      if (Platform.OS === 'android') {
        setTimeout(() => {
          this.registerForPushNotifications().catch(error => {
            console.warn('Push notification registration failed:', error);
          });
        }, 2000); // 2 second delay for Android
      } else {
        await this.registerForPushNotifications();
      }
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
    
    // Use longer interval on Android to reduce battery usage
    const interval = Platform.OS === 'android' ? 10 * 60 * 1000 : 5 * 60 * 1000;
    
    this.periodicCheckInterval = setInterval(() => {
      // This could be used to sync with backend for missed notifications
      console.log('Periodic notification check');
    }, interval);
  }
  
  stopPeriodicCheck(): void {
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }
  }
}

export const notificationService = NotificationService.getInstance();