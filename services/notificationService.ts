import { Platform } from 'react-native';
import OneSignal from 'react-native-onesignal';
import * as Device from 'expo-device';
import { useNotificationsStore } from '@/store/notificationsStore';
import { registerPushToken } from '@/services/api';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class NotificationService {
  private isInitialized = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private initializationPromise: Promise<void> | null = null;

  async setupNotificationHandlers(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized) {
      return Promise.resolve();
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('Starting notification service initialization...');
      this.setConnectionStatus('connecting');
      
      // Initialize OneSignal with proper error handling
      try {
        OneSignal.setAppId('03c10d51-376c-4651-a25e-bbc3aa7cfb63');
        console.log('OneSignal app ID set successfully');
      } catch (error) {
        console.error('Failed to set OneSignal app ID:', error);
        throw new Error('OneSignal initialization failed');
      }
      
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
          console.log('Navigate to article:', notification.notification.additionalData.article_id);
        }
      });

      // Request permission for iOS
      if (Platform.OS === 'ios') {
        OneSignal.promptForPushNotificationsWithUserResponse(response => {
          console.log('iOS permission prompt response:', response);
          this.setConnectionStatus(response ? 'connected' : 'error');
        });
      }

      // Get device token and register with backend
      await this.registerDeviceToken();
      
      this.isInitialized = true;
      this.setConnectionStatus('connected');
      console.log('Notification service initialized successfully');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error setting up notification handlers:', errorMessage);
      this.setConnectionStatus('error');
      throw error;
    }
  }

  private setConnectionStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    console.log('Notification connection status changed to:', status);
    
    // Update store with connection status
    const store = useNotificationsStore.getState();
    if (store.setConnectionStatus) {
      store.setConnectionStatus(status);
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  private async registerDeviceToken(): Promise<void> {
    try {
      console.log('Registering device token...');
      this.setConnectionStatus('connecting');
      
      // Get device state with timeout
      const deviceStatePromise = OneSignal.getDeviceState();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Device state timeout')), 10000)
      );
      
      const deviceState = await Promise.race([deviceStatePromise, timeoutPromise]) as any;
      
      if (!deviceState?.userId) {
        console.warn('No OneSignal user ID available');
        this.setConnectionStatus('error');
        return;
      }

      console.log('OneSignal device state:', deviceState);

      // Get user location from store
      const { userLocation } = useNotificationsStore.getState();
      
      if (!userLocation) {
        console.log('No user location set, skipping backend registration');
        this.setConnectionStatus('connected');
        return;
      }

      // Get device info safely
      let deviceInfo = {};
      try {
        if (Device.brand) {
          deviceInfo = {
            brand: Device.brand,
            modelName: Device.modelName,
            osName: Device.osName,
            osVersion: Device.osVersion,
          };
        }
      } catch (deviceError: unknown) {
        const deviceErrorMessage = deviceError instanceof Error ? deviceError.message : 'Unknown device error';
        console.warn('Error getting device info:', deviceErrorMessage);
      }

      // Register with backend
      try {
        await registerPushToken({
          token: deviceState.userId,
          location: userLocation.slug,
          locationId: userLocation.id,
          platform: Platform.OS,
          deviceInfo,
        });
        console.log('Device token registered with backend successfully');
      } catch (backendError: unknown) {
        const backendErrorMessage = backendError instanceof Error ? backendError.message : 'Backend registration failed';
        console.warn('Backend registration failed, but continuing:', backendErrorMessage);
        // Don't fail the whole process if backend registration fails
      }

      this.setConnectionStatus('connected');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during token registration';
      console.error('Error registering device token:', errorMessage);
      this.setConnectionStatus('error');
    }
  }

  startPeriodicCheck() {
    // Clear existing interval
    this.stopPeriodicCheck();
    
    // Check notification status every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkNotificationStatus();
    }, 30000);
    
    console.log('Started periodic notification status check');
  }

  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Stopped periodic notification status check');
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
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during status check';
      console.warn('Error checking notification status:', errorMessage);
      this.setConnectionStatus('error');
    }
  }

  async updateUserTags() {
    try {
      console.log('Updating user tags...');
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
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error updating tags';
      console.error('Error updating user tags:', errorMessage);
      this.setConnectionStatus('error');
    }
  }

  async enableNotifications() {
    try {
      console.log('Enabling notifications...');
      this.setConnectionStatus('connecting');
      
      if (Platform.OS === 'ios') {
        OneSignal.promptForPushNotificationsWithUserResponse(response => {
          console.log('iOS permission prompt response:', response);
          this.setConnectionStatus(response ? 'connected' : 'error');
        });
      } else {
        // For Android, just enable
        OneSignal.disablePush(false);
        this.setConnectionStatus('connected');
      }
      
      // Update user tags
      await this.updateUserTags();
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error enabling notifications';
      console.error('Error enabling notifications:', errorMessage);
      this.setConnectionStatus('error');
    }
  }

  async disableNotifications() {
    try {
      OneSignal.disablePush(true);
      this.setConnectionStatus('disconnected');
      console.log('Notifications disabled');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error disabling notifications';
      console.error('Error disabling notifications:', errorMessage);
    }
  }

  // Force reconnection
  async reconnect() {
    console.log('Forcing notification service reconnection...');
    this.isInitialized = false;
    this.initializationPromise = null;
    this.setConnectionStatus('connecting');
    
    try {
      await this.setupNotificationHandlers();
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.setConnectionStatus('error');
    }
  }
}

export const notificationService = new NotificationService();