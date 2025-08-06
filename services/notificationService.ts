import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationsStore } from '@/store/notificationsStore';
import { registerExpoPushToken } from './api';
import { router } from 'expo-router';

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
      console.error('Error setting up notification handlers:', error);
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
      
      // Track notification received analytics
      if (data.notification_id) {
        this.trackNotificationAnalytics(data.notification_id, 'received', data.articleId);
      }
      
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
      
      // Show rich notification if supported
      if (Platform.OS === 'android' && image) {
        this.showRichNotification(notification, image);
      }
      
    } catch (error) {
      console.warn('Error handling notification received:', error);
    }
  };
  
  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    try {
      console.log('Expo Push notification opened:', response);
      
      const notification = response.notification;
      const data = notification.request.content.data || {};
      
      // Track notification clicked analytics
      if (data.notification_id) {
        this.trackNotificationAnalytics(data.notification_id, 'clicked', data.articleId);
      }
      
      // Mark as read - fix type error by ensuring we have a string identifier
      const { markAsRead } = useNotificationsStore.getState();
      const notificationId = notification.request.identifier;
      if (notificationId && typeof notificationId === 'string') {
        markAsRead(notificationId);
      }
      
      // Handle navigation based on notification data
      if (data?.articleId) {
        console.log('Navigate to article:', data.articleId);
        // Navigate to article by ID
        router.push(`/article/${data.articleId}`);
      } else if (data?.slug) {
        console.log('Navigate to article by slug:', data.slug);
        // Navigate to article by slug
        router.push(`/article/${data.slug}`);
      } else if (data?.url) {
        console.log('Navigate to URL:', data.url);
        // Handle external URL or deep link
        this.handleNotificationUrl(data.url);
      } else {
        console.log('No navigation data, going to home');
        // Default to home if no specific navigation data
        router.push('/(tabs)');
      }
      
      // Handle action button responses
      if (response.actionIdentifier) {
        this.handleNotificationAction(response.actionIdentifier, data);
      }
      
    } catch (error) {
      console.warn('Error handling notification response:', error);
      // Fallback to home
      router.push('/(tabs)');
    }
  };

  // Handle notification URLs (deep links, external links, etc.)
  private handleNotificationUrl = (url: string) => {
    try {
      console.log('Handling notification URL:', url);
      
      // Check if it's a kaszuby24.pl link
      if (url.includes('kaszuby24.pl')) {
        // Use the deep link handler
        const { handleDeepLinkWithValidation } = require('@/utils/linkHandler');
        handleDeepLinkWithValidation(url);
      } else {
        // External link - open in browser
        const { Linking } = require('react-native');
        Linking.openURL(url);
      }
    } catch (error) {
      console.warn('Error handling notification URL:', error);
      // Fallback to home
      router.push('/(tabs)');
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
  
  private async registerTokenWithBackend(pushToken: string, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
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
      
    } catch (error: any) {
      console.warn(`Failed to register Expo Push token (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      // Implement exponential backoff retry
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Retrying token registration in ${delay}ms...`);
        
        setTimeout(() => {
          this.registerTokenWithBackend(pushToken, retryCount + 1);
        }, delay);
      } else {
        console.error('Max retries reached for token registration. Giving up.');
        
        // Store failed registration for later retry
        this.scheduleTokenRegistrationRetry(pushToken);
      }
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

  // Analytics tracking
  private async trackNotificationAnalytics(notificationId: string, action: string, articleId?: string) {
    try {
      const { userLocation } = useNotificationsStore.getState();
      
      const analyticsData = {
        notification_id: notificationId,
        action: action,
        platform: Platform.OS,
        location: userLocation?.name || 'Unknown',
        article_id: articleId ? parseInt(articleId) : null,
      };
      
      // Send to backend analytics endpoint
      await fetch('https://kaszuby24.pl/wp-json/kaszuby24/v1/track-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analyticsData),
      });
      
      console.log('Notification analytics tracked:', analyticsData);
    } catch (error) {
      console.warn('Failed to track notification analytics:', error);
    }
  }

  // Rich notification display for Android
  private async showRichNotification(notification: Notifications.Notification, imageUrl: string) {
    try {
      if (Platform.OS !== 'android') return;
      
      const data = notification.request.content.data || {};
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.request.content.title || 'Kaszuby24',
          body: notification.request.content.body || '',
          data: data,
          image: imageUrl,
          sound: 'default',
          priority: Notifications.AndroidImportance.HIGH,
          // Rich notification style
          style: {
            type: 'bigPicture',
            picture: imageUrl,
            largeIcon: data.icon || 'https://kaszuby24.pl/wp-content/uploads/2024/app-icon.png',
          },
        },
        trigger: null, // Show immediately
      });
      
      console.log('Rich notification displayed');
    } catch (error) {
      console.warn('Failed to show rich notification:', error);
    }
  }

  // Handle notification action buttons
  private async handleNotificationAction(actionId: string, data: any) {
    try {
      console.log('Notification action triggered:', actionId, data);
      
      switch (actionId) {
        case 'read_article':
          if (data.articleId) {
            // Track action
            if (data.notification_id) {
              this.trackNotificationAnalytics(data.notification_id, 'action_read', data.articleId);
            }
            // Navigate to article
            router.push(`/article/${data.articleId}`);
          }
          break;
          
        case 'save_article':
          if (data.articleId) {
            // Track action
            if (data.notification_id) {
              this.trackNotificationAnalytics(data.notification_id, 'action_save', data.articleId);
            }
            // Save article logic - you can implement this
            console.log('Save article:', data.articleId);
          }
          break;
          
        default:
          console.log('Unknown notification action:', actionId);
      }
    } catch (error) {
      console.warn('Error handling notification action:', error);
    }
  }

  // Enhanced local notification with rich content
  async scheduleRichLocalNotification(
    title: string, 
    body: string, 
    imageUrl?: string, 
    data?: any
  ) {
    try {
      const notificationContent: Notifications.NotificationContentInput = {
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: Notifications.AndroidImportance.HIGH,
      };

      // Add rich content for Android
      if (Platform.OS === 'android' && imageUrl) {
        notificationContent.image = imageUrl;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
      });
      
      console.log('Rich local notification scheduled with ID:', notificationId);
      
      // Also add to store
      const { addNotification } = useNotificationsStore.getState();
      addNotification({
        title,
        body,
        data: data || {},
        read: false,
        image: imageUrl,
      });
      
      return notificationId;
    } catch (error) {
      console.warn('Failed to schedule rich local notification:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats() {
    try {
      const { notifications } = useNotificationsStore.getState();
      
      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        read: notifications.filter(n => n.read).length,
        withImages: notifications.filter(n => n.image).length,
        withActions: notifications.filter(n => n.data?.articleId).length,
      };
      
      return stats;
    } catch (error) {
      console.warn('Failed to get notification stats:', error);
      return null;
    }
  }

  // Schedule token registration retry
  private async scheduleTokenRegistrationRetry(token: string) {
    try {
      const failedTokensStr = await AsyncStorage.getItem('failed_push_tokens');
      const failedTokens = failedTokensStr ? JSON.parse(failedTokensStr) : [];
      
      failedTokens.push({
        token,
        timestamp: Date.now(),
        retryCount: 0
      });
      
      await AsyncStorage.setItem('failed_push_tokens', JSON.stringify(failedTokens));
      console.log('Token registration failure stored for retry');
    } catch (error) {
      console.warn('Failed to store failed token for retry:', error);
    }
  }

  // Retry failed token registrations
  private async retryFailedTokenRegistrations() {
    try {
      const failedTokensStr = await AsyncStorage.getItem('failed_push_tokens');
      if (!failedTokensStr) return;
      
      const failedTokens = JSON.parse(failedTokensStr);
      const remainingTokens: any[] = [];
      
      for (const tokenData of failedTokens) {
        // Only retry tokens that are less than 24 hours old
        const age = Date.now() - tokenData.timestamp;
        if (age < 24 * 60 * 60 * 1000 && tokenData.retryCount < 5) {
          try {
            await this.registerTokenWithBackend(tokenData.token, 0);
            console.log('Successfully registered previously failed token');
          } catch (error) {
            // Keep for next retry
            remainingTokens.push({
              ...tokenData,
              retryCount: tokenData.retryCount + 1
            });
          }
        }
      }
      
      // Update storage with remaining failed tokens
      await AsyncStorage.setItem('failed_push_tokens', JSON.stringify(remainingTokens));
      
    } catch (error) {
      console.warn('Failed to retry token registrations:', error);
    }
  }

  // Notification templates
  getNotificationTemplate(type: 'breaking' | 'weather' | 'event' | 'article', data: any) {
    const templates = {
      breaking: {
        title: `🚨 PILNE: ${data.title}`,
        body: 'Najważniejsze wiadomości z Kaszub. Sprawdź szczegóły.',
        priority: 'high' as const,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      },
      weather: {
        title: `⚠️ ${data.title}`,
        body: data.body || 'Sprawdź aktualne ostrzeżenia pogodowe.',
        priority: 'high' as const,
        sound: 'default',
        vibrationPattern: [0, 500, 200, 500],
      },
      event: {
        title: `📅 ${data.title}`,
        body: data.body || 'Nowe wydarzenie w Twojej okolicy.',
        priority: 'normal' as const,
        sound: 'default',
        vibrationPattern: [0, 200, 100, 200],
      },
      article: {
        title: data.title,
        body: data.body || 'Nowy artykuł na Kaszuby24.',
        priority: 'normal' as const,
        sound: 'default',
        vibrationPattern: [0, 100],
      }
    };

    return templates[type] || templates.article;
  }

  // Enhanced error recovery
  async recoverFromErrors() {
    try {
      console.log('Starting notification service error recovery...');
      
      // Clear any stuck initialization state
      this.isInitialized = false;
      this.initializationFailed = false;
      
      // Cleanup existing listeners
      if (this.notificationListener) {
        this.notificationListener.remove();
        this.notificationListener = null;
      }
      if (this.responseListener) {
        this.responseListener.remove();
        this.responseListener = null;
      }
      
      // Re-initialize the service
      await this.setupNotificationHandlers();
      
      // Retry failed token registrations
      await this.retryFailedTokenRegistrations();
      
      console.log('Notification service recovery completed');
      
    } catch (error) {
      console.error('Failed to recover notification service:', error);
    }
  }

  // Public methods for external listeners
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  removeNotificationSubscription(subscription: any) {
    if (subscription && subscription.remove) {
      subscription.remove();
    }
  }
}

export const notificationService = new NotificationService();