import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useNotificationsStore } from '@/store/notificationsStore';
import { registerExpoPushToken } from './api';

class NotificationService {
  private isInitialized = false;
  private initializationFailed = false;
  private notificationListener: any = null;
  private responseListener: any = null;
  
  async setupNotificationHandlers() {
    if (this.isInitialized || this.initializationFailed) return;
    
    try {
      console.log('Initializing Expo Push Notifications...');
      
      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Kaszuby24 Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          // Enable large icon and image support for Android
          enableVibrate: true,
          enableLights: true,
        });
      }
      
      // Handle notification received while app is in foreground
      this.notificationListener = Notifications.addNotificationReceivedListener(this.handleNotificationReceived);
      
      // Handle notification taps
      this.responseListener = Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);
      
      this.isInitialized = true;
      console.log('Expo Push notification handlers setup complete');
      
      // Request permissions after setup
      setTimeout(() => {
        this.requestPermissionsAndRegister().catch(console.warn);
      }, 1000);
      
    } catch (error) {
      console.warn('Failed to setup Expo Push notification handlers:', error);
      this.initializationFailed = true;
    }
  }
  
  private handleNotificationReceived = (notification: Notifications.Notification) => {
    try {
      console.log('Expo Push notification received in foreground:', notification);
      
      const { addNotification } = useNotificationsStore.getState();
      
      // Extract image and icon from notification data
      const data = notification.request.content.data || {};
      const image = data.image || notification.request.content.image;
      const icon = data.icon || notification.request.content.icon;
      
      addNotification({
        title: notification.request.content.title || 'Nowe powiadomienie',
        body: notification.request.content.body || '',
        data: data,
        read: false,
        articleId: data.articleId && typeof data.articleId === 'string' ? parseInt(data.articleId) : undefined,
        categoryId: data.categoryId && typeof data.categoryId === 'string' ? parseInt(data.categoryId) : undefined,
        image: image,
        icon: icon,
      });
    } catch (error) {
      console.warn('Error handling notification received:', error);
    }
  };
  
  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    try {
      console.log('Expo Push notification opened:', response);
      
      const notification = response.notification;
      
      // Mark as read - fix type error by ensuring we have a string identifier
      const { markAsRead } = useNotificationsStore.getState();
      const notificationId = notification.request.identifier;
      if (notificationId && typeof notificationId === 'string') {
        markAsRead(notificationId);
      }
      
      // Handle navigation based on notification data
      const data = notification.request.content.data;
      if (data?.articleId) {
        console.log('Navigate to article:', data.articleId);
      }
    } catch (error) {
      console.warn('Error handling notification response:', error);
    }
  };
  
  async requestPermissions(): Promise<boolean> {
    try {
      if (this.initializationFailed) {
        return false;
      }
      
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return false;
      }
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }
      
      console.log('Expo Push permission granted');
      return true;
    } catch (error) {
      console.error('Error requesting Expo Push permissions:', error);
      return false;
    }
  }
  
  async requestPermissionsAndRegister() {
    try {
      if (this.initializationFailed) {
        return;
      }
      
      // Request permission
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.log('Expo Push permission denied');
        return;
      }
      
      // Get push token
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        
        if (!projectId) {
          console.warn('No project ID found for Expo Push notifications');
          return;
        }
        
        const pushToken = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        
        console.log('Expo Push token:', pushToken.data);
        
        if (pushToken.data) {
          const { setExpoPushToken } = useNotificationsStore.getState();
          setExpoPushToken(pushToken.data);
          
          // Register with backend
          await this.registerTokenWithBackend(pushToken.data);
        }
      } catch (error) {
        console.warn('Failed to get Expo Push token:', error);
      }
      
    } catch (error) {
      console.error('Error setting up Expo Push notifications:', error);
    }
  }
  
  async registerForPushNotifications() {
    try {
      
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.log('Expo Push permission denied');
        return;
      }
      
      // Get push token
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        
        if (!projectId) {
          console.warn('No project ID found for Expo Push notifications');
          return;
        }
        
        const pushToken = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        
        if (pushToken.data) {
          const { setExpoPushToken } = useNotificationsStore.getState();
          setExpoPushToken(pushToken.data);
          
          // Register with backend
          await this.registerTokenWithBackend(pushToken.data);
        }
      } catch (error) {
        console.warn('Failed to get Expo Push token:', error);
      }
      
      console.log('Expo Push notifications registered');
    } catch (error) {
      console.error('Error registering for Expo Push notifications:', error);
    }
  }
  
  async updateLocationAndReregister() {
    try {
      const { expoPushToken } = useNotificationsStore.getState();
      
      if (expoPushToken) {
        // Re-register with new location
        await this.registerTokenWithBackend(expoPushToken);
      }
    } catch (error) {
      console.error('Error updating location for Expo Push:', error);
    }
  }
  
  private async registerTokenWithBackend(pushToken: string) {
    try {
      const { userLocation, preferences } = useNotificationsStore.getState();
      
      // Extract enabled region and category IDs from preferences
      const enabledRegions = preferences
        .filter(pref => pref.type === 'region' && pref.enabled)
        .map(pref => pref.id);
      
      const enabledCategories = preferences
        .filter(pref => pref.type === 'category' && pref.enabled)
        .map(pref => pref.id);
      
      await registerExpoPushToken({
        pushToken,
        location: userLocation?.name || 'Kaszuby',
        locationId: userLocation?.id || 1,
        platform: Platform.OS,
        preferences: {
          regions: enabledRegions,
          categories: enabledCategories,
        },
      });
      
      console.log('Expo Push token registered with backend successfully');
      console.log('Enabled regions:', enabledRegions);
      console.log('Enabled categories:', enabledCategories);
    } catch (error) {
      console.warn('Failed to register Expo Push token with backend:', error);
    }
  }
  
  async updatePreferences() {
    try {
      const { preferences, userLocation, expoPushToken } = useNotificationsStore.getState();
      
      if (!expoPushToken) {
        console.log('No Expo Push token available for preference update');
        return;
      }
      
      console.log('Updating push notification preferences...');
      
      // Re-register with updated preferences
      await this.registerTokenWithBackend(expoPushToken);
      
      console.log('Push notification preferences updated successfully');
      
    } catch (error) {
      console.warn('Failed to update Expo Push preferences:', error);
    }
  }
  
  async scheduleLocalNotification(title: string, body: string, data?: any) {
    try {
      
      // Get notification ID for tracking
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
      
      console.log('Scheduled local notification with ID:', notificationId);
      
      // Also add to store
      const { addNotification } = useNotificationsStore.getState();
      addNotification({
        title,
        body,
        data: data || {},
        read: false,
      });
      
      return notificationId;
    } catch (error) {
      console.warn('Failed to schedule local notification:', error);
      throw error; // Re-throw to allow handling in UI
    }
  }
  
  async clearNotifications() {
    try {
      
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.warn('Failed to clear Expo Push notifications:', error);
    }
  }
  
  startPeriodicCheck() {
    // Expo handles this automatically, no need for manual checks
    console.log('Expo Push handles notification checks automatically');
  }
  
  stopPeriodicCheck() {
    // Expo handles this automatically, no need for manual checks
    console.log('Expo Push handles notification checks automatically');
  }
  
  // Public methods for adding listeners
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }
  
  addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Helper to properly remove notification subscriptions
  removeNotificationSubscription(subscription: Notifications.Subscription): void {
    try {
      subscription.remove();
    } catch (error) {
      console.warn('Error removing notification subscription:', error);
    }
  }

  cleanup() {
    try {
      if (this.initializationFailed) {
        return;
      }
      
      // Remove event listeners
      if (this.notificationListener) {
        this.notificationListener.remove();
      }
      if (this.responseListener) {
        this.responseListener.remove();
      }
      
      this.isInitialized = false;
      console.log('Expo Push notification service cleaned up');
    } catch (error) {
      console.warn('Error cleaning up Expo Push:', error);
    }
  }
}

export const notificationService = new NotificationService();