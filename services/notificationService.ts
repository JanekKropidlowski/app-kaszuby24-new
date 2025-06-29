import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNotificationsStore } from '@/store/notificationsStore';
import { fetchArticles } from './api';

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
  private lastCheckTime: number = 0;
  
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
  
  async checkForNewArticles(): Promise<void> {
    try {
      const { preferences, notificationsEnabled, addNotification } = useNotificationsStore.getState();
      
      if (!notificationsEnabled) return;
      
      const enabledCategories = preferences
        .filter(pref => pref.enabled && pref.type === 'category')
        .map(pref => pref.id);
      
      const enabledRegions = preferences
        .filter(pref => pref.enabled && pref.type === 'region')
        .map(pref => pref.id);
      
      const allEnabledCategories = [...enabledCategories, ...enabledRegions];
      
      if (allEnabledCategories.length === 0) return;
      
      // Check for new articles in enabled categories
      const { articles } = await fetchArticles(1, 10, allEnabledCategories);
      
      const currentTime = Date.now();
      
      // Only notify about articles published in the last hour if this is not the first check
      const oneHourAgo = currentTime - (60 * 60 * 1000);
      
      for (const article of articles) {
        const articleTime = new Date(article.date).getTime();
        
        // Skip if article is older than 1 hour and we've checked before
        if (this.lastCheckTime > 0 && articleTime < oneHourAgo) continue;
        
        // Skip if article was published before our last check
        if (this.lastCheckTime > 0 && articleTime < this.lastCheckTime) continue;
        
        // Find which category this article belongs to
        const matchingCategory = preferences.find(pref => 
          pref.enabled && article.categories.includes(pref.id)
        );
        
        if (matchingCategory) {
          const title = `Nowy artykuł w ${matchingCategory.name}`;
          const body = article.title.rendered
            .replace(/&#8211;/g, '-')
            .replace(/&#8217;/g, "'")
            .substring(0, 100) + '...';
          
          // Add to notification history
          addNotification({
            title,
            body,
            articleId: article.id,
            categoryId: matchingCategory.id,
            read: false,
          });
          
          // Show local notification
          await this.scheduleLocalNotification(title, body, {
            articleId: article.id,
            categoryId: matchingCategory.id,
          });
        }
      }
      
      this.lastCheckTime = currentTime;
    } catch (error) {
      console.error('Error checking for new articles:', error);
    }
  }
  
  startPeriodicCheck(): void {
    // Check every 30 minutes
    setInterval(() => {
      this.checkForNewArticles();
    }, 30 * 60 * 1000);
    
    // Initial check after 5 seconds
    setTimeout(() => {
      this.checkForNewArticles();
    }, 5000);
  }
  
  async setupNotificationHandlers(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      
      // Handle notification received while app is in foreground
      Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });
      
      // Handle notification tapped
      Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.articleId) {
          // Navigate to article - this would need to be implemented with navigation
          console.log('Navigate to article:', data.articleId);
        }
      });
      
      // Request permissions
      await this.requestPermissions();
    } catch (error) {
      console.warn('Error setting up notification handlers:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();