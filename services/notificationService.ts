import { OneSignal } from 'react-native-onesignal';
import { Platform } from 'react-native';
import { useNotificationsStore } from '@/store/notificationsStore';
import { registerOneSignalPlayer } from './api';

// OneSignal App ID
const ONESIGNAL_APP_ID = '03c10d51-376c-4651-a25e-bbc3aa7cfb63';

class NotificationService {
  private isInitialized = false;
  
  async setupNotificationHandlers() {
    if (this.isInitialized) return;
    
    try {
      if (Platform.OS === 'web') {
        console.log('OneSignal not supported on web');
        return;
      }

      // Initialize OneSignal
      OneSignal.initialize(ONESIGNAL_APP_ID);
      
      // Handle notification received while app is in foreground
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', this.handleNotificationReceived);
      
      // Handle notification taps
      OneSignal.Notifications.addEventListener('click', this.handleNotificationOpened);
      
      // Handle subscription changes
      OneSignal.User.pushSubscription.addEventListener('change', this.handleSubscriptionChange);
      
      // Request permissions and get player ID
      await this.requestPermissionsAndRegister();
      
      this.isInitialized = true;
      console.log('OneSignal notification handlers setup complete');
    } catch (error) {
      console.warn('Failed to setup OneSignal notification handlers:', error);
    }
  }
  
  private handleNotificationReceived = (event: any) => {
    console.log('OneSignal notification received in foreground:', event);
    
    const notification = event.notification;
    
    // Add to store
    const { addNotification } = useNotificationsStore.getState();
    addNotification({
      title: notification.title || 'Nowe powiadomienie',
      body: notification.body || '',
      data: notification.additionalData || {},
      read: false,
      articleId: notification.additionalData?.articleId ? parseInt(notification.additionalData.articleId) : undefined,
      categoryId: notification.additionalData?.categoryId ? parseInt(notification.additionalData.categoryId) : undefined,
    });
    
    // Display the notification
    event.preventDefault();
    event.notification.display();
  };
  
  private handleNotificationOpened = (event: any) => {
    console.log('OneSignal notification opened:', event);
    
    const notification = event.notification;
    
    // Mark as read
    const { markAsRead } = useNotificationsStore.getState();
    if (notification.notificationId) {
      markAsRead(notification.notificationId);
    }
    
    // Handle navigation based on notification data
    const data = notification.additionalData;
    if (data?.articleId) {
      // Navigate to article - this would need to be implemented with navigation
      console.log('Navigate to article:', data.articleId);
    }
  };
  
  private handleSubscriptionChange = (event: any) => {
    console.log('OneSignal subscription changed:', event);
    
    const { setOneSignalPlayerId } = useNotificationsStore.getState();
    
    if (event.current.optedIn) {
      const playerId = event.current.id;
      if (playerId) {
        setOneSignalPlayerId(playerId);
        this.registerPlayerWithBackend(playerId);
      }
    }
  };
  
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        console.log('OneSignal not supported on web');
        return false;
      }
      
      // Request permission
      const permission = await OneSignal.Notifications.requestPermission(true);
      console.log('OneSignal permission result:', permission);
      
      return permission;
    } catch (error) {
      console.error('Error requesting OneSignal permissions:', error);
      return false;
    }
  }
  
  async requestPermissionsAndRegister() {
    try {
      if (Platform.OS === 'web') {
        console.log('OneSignal not supported on web');
        return;
      }
      
      // Request permission
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.log('OneSignal permission denied');
        return;
      }
      
      // Get subscription state
      const subscription = OneSignal.User.pushSubscription;
      console.log('OneSignal subscription state:', subscription);
      
      if (subscription.id) {
        const { setOneSignalPlayerId } = useNotificationsStore.getState();
        setOneSignalPlayerId(subscription.id);
        
        // Register with backend
        await this.registerPlayerWithBackend(subscription.id);
      }
      
    } catch (error) {
      console.error('Error setting up OneSignal:', error);
    }
  }
  
  async registerForPushNotifications() {
    try {
      if (Platform.OS === 'web') {
        console.log('OneSignal not supported on web');
        return;
      }
      
      // Opt in to push notifications
      OneSignal.User.pushSubscription.optIn();
      
      // Get current subscription
      const subscription = OneSignal.User.pushSubscription;
      
      if (subscription.id) {
        const { setOneSignalPlayerId } = useNotificationsStore.getState();
        setOneSignalPlayerId(subscription.id);
        
        // Register with backend
        await this.registerPlayerWithBackend(subscription.id);
      }
      
      console.log('OneSignal push notifications registered');
    } catch (error) {
      console.error('Error registering for OneSignal push notifications:', error);
    }
  }
  
  async updateLocationAndReregister() {
    try {
      const subscription = OneSignal.User.pushSubscription;
      
      if (subscription.id) {
        // Re-register with new location
        await this.registerPlayerWithBackend(subscription.id);
      }
    } catch (error) {
      console.error('Error updating location for OneSignal:', error);
    }
  }
  
  private async registerPlayerWithBackend(playerId: string) {
    try {
      const { userLocation } = useNotificationsStore.getState();
      
      await registerOneSignalPlayer({
        playerId,
        location: userLocation?.name || 'Kaszuby',
        locationId: userLocation?.id || 1,
        platform: Platform.OS,
      });
      
      console.log('OneSignal player registered with backend successfully');
    } catch (error) {
      console.warn('Failed to register OneSignal player with backend:', error);
    }
  }
  
  async setTags(tags: Record<string, string>) {
    try {
      if (Platform.OS === 'web') {
        return;
      }
      
      OneSignal.User.addTags(tags);
      console.log('OneSignal tags set:', tags);
    } catch (error) {
      console.warn('Failed to set OneSignal tags:', error);
    }
  }
  
  async updatePreferences() {
    try {
      const { preferences, userLocation } = useNotificationsStore.getState();
      
      // Create tags based on enabled preferences
      const tags: Record<string, string> = {};
      
      // Add location tag
      if (userLocation) {
        tags.location = userLocation.slug;
        tags.locationId = userLocation.id.toString();
      }
      
      // Add enabled region tags
      const enabledRegions = preferences
        .filter(pref => pref.type === 'region' && pref.enabled)
        .map(pref => pref.id.toString());
      
      if (enabledRegions.length > 0) {
        tags.regions = enabledRegions.join(',');
      }
      
      // Add enabled category tags
      const enabledCategories = preferences
        .filter(pref => pref.type === 'category' && pref.enabled)
        .map(pref => pref.id.toString());
      
      if (enabledCategories.length > 0) {
        tags.categories = enabledCategories.join(',');
      }
      
      // Set tags in OneSignal
      await this.setTags(tags);
      
    } catch (error) {
      console.warn('Failed to update OneSignal preferences:', error);
    }
  }
  
  async scheduleLocalNotification(title: string, body: string, data?: any) {
    try {
      if (Platform.OS === 'web') {
        return;
      }
      
      // OneSignal doesn't have local notifications, but we can add to store
      const { addNotification } = useNotificationsStore.getState();
      addNotification({
        title,
        body,
        data: data || {},
        read: false,
      });
      
    } catch (error) {
      console.warn('Failed to schedule local notification:', error);
    }
  }
  
  async clearNotifications() {
    try {
      if (Platform.OS === 'web') {
        return;
      }
      
      OneSignal.Notifications.clearAll();
    } catch (error) {
      console.warn('Failed to clear OneSignal notifications:', error);
    }
  }
  
  startPeriodicCheck() {
    // OneSignal handles this automatically, no need for manual checks
    console.log('OneSignal handles notification checks automatically');
  }
  
  stopPeriodicCheck() {
    // OneSignal handles this automatically, no need for manual checks
    console.log('OneSignal handles notification checks automatically');
  }
  
  cleanup() {
    try {
      if (Platform.OS === 'web') {
        return;
      }
      
      // Remove event listeners
      OneSignal.Notifications.removeEventListener('foregroundWillDisplay', this.handleNotificationReceived);
      OneSignal.Notifications.removeEventListener('click', this.handleNotificationOpened);
      OneSignal.User.pushSubscription.removeEventListener('change', this.handleSubscriptionChange);
      
      this.isInitialized = false;
      console.log('OneSignal notification service cleaned up');
    } catch (error) {
      console.warn('Error cleaning up OneSignal:', error);
    }
  }
}

export const notificationService = new NotificationService();