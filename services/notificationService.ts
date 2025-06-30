import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useNotificationsStore } from '@/store/notificationsStore';
import { registerPushToken } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private checkInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  
  async setupNotificationHandlers() {
    if (this.isInitialized) return;
    
    try {
      // Handle notifications received while app is in foreground
      Notifications.addNotificationReceivedListener(this.handleNotificationReceived);
      
      // Handle notification taps
      Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);
      
      // Request permissions and get token
      await this.requestPermissionsAndRegister();
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to setup notification handlers:', error);
    }
  }
  
  private handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('Notification received in foreground:', notification);
    
    // Add to store
    const { addNotification } = useNotificationsStore.getState();
    addNotification({
      id: notification.request.identifier,
      title: notification.request.content.title || 'Nowe powiadomienie',
      body: notification.request.content.body || '',
      data: notification.request.content.data || {},
      timestamp: new Date().toISOString(),
      read: false,
    });
  };
  
  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    console.log('Notification tapped:', response);
    
    // Mark as read
    const { markAsRead } = useNotificationsStore.getState();
    markAsRead(response.notification.request.identifier);
    
    // Handle navigation based on notification data
    const data = response.notification.request.content.data;
    if (data?.articleId) {
      // Navigate to article - this would need to be implemented with navigation
      console.log('Navigate to article:', data.articleId);
    }
  };
  
  async requestPermissionsAndRegister() {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }
    
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '457899111233', // Your project ID from google-services.json
      });
      
      console.log('Push token:', tokenData.data);
      
      // Register token with backend
      await this.registerTokenWithBackend(tokenData.data);
      
      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
    } catch (error: unknown) {
      const deviceTokenError = error as Error;
      console.error('Error getting push token:', deviceTokenError);
      
      // Handle specific Firebase errors
      if (deviceTokenError.message?.includes('SERVICE_NOT_AVAILABLE')) {
        console.warn('Google Play Services not available. Push notifications will not work.');
      } else if (deviceTokenError.message?.includes('NETWORK_ERROR')) {
        console.warn('Network error while getting push token. Will retry later.');
      }
    }
  }
  
  private async registerTokenWithBackend(token: string) {
    try {
      const deviceInfo = Device.isDevice ? {
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
      } : undefined;
      
      await registerPushToken({
        token,
        location: 'Kaszuby', // Default location
        locationId: 1, // Default location ID
        platform: Platform.OS,
        deviceInfo,
      });
      
      console.log('Push token registered successfully');
    } catch (error: unknown) {
      const registrationError = error as Error;
      console.warn('Failed to register push token with backend:', registrationError);
    }
  }
  
  startPeriodicCheck() {
    // Check for new notifications every 5 minutes when app is active
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      // This could fetch latest notifications from server
      // For now, we'll just log
      console.log('Periodic notification check');
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  async scheduleLocalNotification(title: string, body: string, data?: any) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.warn('Failed to schedule local notification:', error);
    }
  }
  
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.warn('Failed to cancel notifications:', error);
    }
  }
  
  cleanup() {
    this.stopPeriodicCheck();
    this.isInitialized = false;
  }
}

export const notificationService = new NotificationService();