import { Platform } from 'react-native';
import OneSignal from 'react-native-onesignal';
import * as Device from 'expo-device';
import { useNotificationsStore } from '@/store/notificationsStore';
import { registerPushToken } from '@/services/api';

class NotificationService {
  private isInitialized = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  async setupNotificationHandlers() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.setConnectionStatus('connecting');
      
      // Initialize OneSignal
      OneSignal.setAppId('03c10d51-376c-4651-a25e-bbc3aa7cfb63');
      
      // Set up notification handlers
      OneSignal.setNotificationWillShowInForegroundHandler(notificationReceivedEvent => {
        console.log('OneSignal: notification will show in foreground:', notificationReceivedEvent);
        
        const notification = notificationReceivedEvent.getNotification();
        console.log('notification: ', notification);
        
        // Add to notification store
        const { addNotification } = useNotificationsStore.getState();
        
        // Extract article ID from additional data
        const articleId = notification.additionalData?.article_id ? 
          parseInt(notification.additionalData.article_id, 10) : undefined;
        
        // Extract category ID from additional data
        const categoryId = notification.additionalData?.category_id ? 
          parseInt(notification.additionalData.category_id, 10) : undefined;
        
        // Don't add notifications for sponsored content (category 554)
        if (categoryId === 554) {
          notificationReceivedEvent.complete();
          return;
        }
        
        addNotification({
          title: notification.title || 'Nowy artykuł',
          body: notification.body || '',
          articleId,
          categoryId,
          read: false,
        });
        
        // Complete with notification to show it
        notificationReceivedEvent.complete(notification);
      });

      OneSignal.setNotificationOpenedHandler(notification => {
        console.log('OneSignal: notification opened:', notification);
        
        // Mark as read in store
        const { markAsRead } = useNotificationsStore.getState();
        const notificationId = notification.notification.notificationId;
        if (notificationId) {
          markAsRead(notificationId);
        }
        
        // Handle navigation based on additional data
        if (notification.notification.additionalData?.article_id) {
          // Navigation will be handled by the app's navigation system
          console.log('Navigate to article:', notification.notification.additionalData.article_id);
        }
      });

      // Request permission for iOS
      if (Platform.OS === 'ios') {
        OneSignal.promptForPushNotificationsWithUserResponse(response => {
          console.log('Prompt response:', response);
          this.setConnectionStatus(response ? 'connected' : 'disconnected');
        });
      }

      // Get device token and register with backend
      await this.registerDeviceToken();
      
      this.isInitialized = true;
      this.setConnectionStatus('connected');
      console.log('Notification service initialized successfully');
      
    } catch (error) {
      console.error('Error setting up notification handlers:', error);
      this.setConnectionStatus('disconnected');
      throw error;
    }
  }

  private setConnectionStatus(status: 'disconnected' | 'connecting' | 'connected') {
    this.connectionStatus = status;
    console.log('Notification connection status:', status);
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  private async registerDeviceToken() {
    try {
      this.setConnectionStatus('connecting');
      
      // Get device state
      const deviceState = await OneSignal.getDeviceState();
      
      if (!deviceState?.userId) {
        console.warn('No OneSignal user ID available');
        this.setConnectionStatus('disconnected');
        return;
      }

      // Get user location from store
      const { userLocation } = useNotificationsStore.getState();
      
      if (!userLocation) {
        console.log('No user location set, skipping token registration');
        this.setConnectionStatus('connected');
        return;
      }

      // Get device info
      let deviceInfo = {};
      try {
        deviceInfo = {
          brand: Device.brand,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        };
      } catch (deviceError) {
        console.warn('Error getting device info:', deviceError);
      }

      // Register with backend
      await registerPushToken({
        token: deviceState.userId,
        location: userLocation.slug,
        locationId: userLocation.id,
        platform: Platform.OS,
        deviceInfo,
      });

      console.log('Device token registered successfully');
      this.setConnectionStatus('connected');
      
    } catch (error) {
      console.error('Error registering device token:', error);
      this.setConnectionStatus('disconnected');
    }
  }

  startPeriodicCheck() {
    // Check notification status every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkNotificationStatus();
    }, 30000);
  }

  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkNotificationStatus() {
    try {
      const deviceState = await OneSignal.getDeviceState();
      
      if (!deviceState?.userId) {
        this.setConnectionStatus('disconnected');
        return;
      }

      // Check if notifications are enabled
      const isSubscribed = deviceState.isSubscribed;
      
      if (!isSubscribed) {
        this.setConnectionStatus('disconnected');
      } else if (this.connectionStatus !== 'connected') {
        this.setConnectionStatus('connected');
      }
      
    } catch (error) {
      console.warn('Error checking notification status:', error);
      this.setConnectionStatus('disconnected');
    }
  }

  async updateUserTags() {
    try {
      this.setConnectionStatus('connecting');
      
      const { userLocation, preferences } = useNotificationsStore.getState();
      
      // Set location tag
      if (userLocation) {
        OneSignal.sendTag('region', userLocation.slug);
      }
      
      // Set enabled regions
      const enabledRegions = preferences
        .filter(p => p.type === 'region' && p.enabled)
        .map(p => p.id.toString());
      
      if (enabledRegions.length > 0) {
        OneSignal.sendTag('regions', enabledRegions.join(','));
      }
      
      // Set enabled categories
      const enabledCategories = preferences
        .filter(p => p.type === 'category' && p.enabled)
        .map(p => p.id.toString());
      
      if (enabledCategories.length > 0) {
        OneSignal.sendTag('categories', enabledCategories.join(','));
      }
      
      console.log('User tags updated successfully');
      this.setConnectionStatus('connected');
      
    } catch (error) {
      console.error('Error updating user tags:', error);
      this.setConnectionStatus('disconnected');
    }
  }

  async enableNotifications() {
    try {
      this.setConnectionStatus('connecting');
      
      if (Platform.OS === 'ios') {
        OneSignal.promptForPushNotificationsWithUserResponse(response => {
          console.log('Prompt response:', response);
          this.setConnectionStatus(response ? 'connected' : 'disconnected');
        });
      } else {
        // For Android, just enable
        OneSignal.disablePush(false);
        this.setConnectionStatus('connected');
      }
      
      // Update user tags
      await this.updateUserTags();
      
    } catch (error) {
      console.error('Error enabling notifications:', error);
      this.setConnectionStatus('disconnected');
    }
  }

  async disableNotifications() {
    try {
      OneSignal.disablePush(true);
      this.setConnectionStatus('disconnected');
      console.log('Notifications disabled');
    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();