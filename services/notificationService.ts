import * as Location from 'expo-location';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationsStore } from '@/store/notificationsStore';
import { registerExpoPushToken } from './api';
import { router } from 'expo-router';
import { analyticsService } from './analyticsService';

// Sprawdź czy działa w Expo Go (nie wspiera push notifications od SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Warunkowy import expo-notifications - tylko jeśli nie w Expo Go
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.log('expo-notifications not available in Expo Go');
  }
}

class NotificationService {
  private isInitialized = false;
  private initializationFailed = false;
  private notificationListener: any = null;
  private responseListener: any = null;
  private dailyWeatherNotificationId: string | null = null;

  // Retries navigation until Expo Router's root navigator is mounted.
  // Needed when a notification opens the app cold — the response listener fires
  // before the Root Layout renders, so router.push() throws assertIsReady.
  private navigateSafely(route: string, attempt = 0): void {
    try {
      router.push(route as any);
    } catch (e) {
      if (attempt < 15) {
        setTimeout(() => this.navigateSafely(route, attempt + 1), 100);
      }
    }
  }

  async setupNotificationHandlers() {
    if (this.isInitialized || this.initializationFailed) return;

    // Pomiń inicjalizację w Expo Go
    if (isExpoGo) {
      console.log('Running inside Expo Go - skipping push notification setup (use development build for full notifications)');
      this.initializationFailed = true;
      return;
    }

    try {
      console.log('Initializing Expo Push Notifications...');
      // Ensure notifications are presented while app is in foreground (iOS by default hides them)
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true
        }),
      });
      
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
      
      // Request permissions and register push token after setup, unless running in Expo Go
      if (Constants.appOwnership === 'expo') {
        console.log('Running inside Expo Go - skipping push token registration (use development build for full notifications)');
      } else {
        setTimeout(() => {
          this.requestPermissionsAndRegister().catch(console.warn);
        }, 1000);
      }

      // Restore daily weather schedule if user enabled it
      setTimeout(() => {
        try {
          const { dailyWeatherEnabled, dailyWeatherHour } = useNotificationsStore.getState();
          if (dailyWeatherEnabled) {
            this.scheduleDailyWeatherSummary(dailyWeatherHour).catch(console.warn);
          }
        } catch (e) {
          console.warn('Failed to restore daily weather schedule:', e);
        }
      }, 1500);
      
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
      // Usuwam nieistniejące właściwości image i icon
      // const image = data.image || notification.request.content.image;
      // const icon = data.icon || notification.request.content.icon;
      
      // Track notification received analytics
      if (data.notification_id) {
        this.trackNotificationAnalytics(data.notification_id as string, 'received', data.articleId as string);
      }

      // GA4: notification_received event — dzielimy przez notification_clicked
      // żeby policzyć Open Rate per kampanię/typ. Foreground delivery only —
      // background delivery iOS nie odpala tego callbacka, więc to NIE jest
      // total delivery, tylko foreground delivery (partial Open Rate).
      const notificationType = (data?.type as string) ||
                                (data?.articleId ? 'article' : data?.slug ? 'article' : 'general');
      analyticsService.logCustomEvent('notification_received', {
        notification_id: (data?.notification_id as string) || 'unknown',
        notification_type: notificationType,
        platform: Platform.OS,
        in_foreground: true,
      });
      
      addNotification({
        title: notification.request.content.title || 'Nowe powiadomienie',
        body: notification.request.content.body || '',
        data: data,
        read: false,
        articleId: data.articleId && typeof data.articleId === 'string' ? parseInt(data.articleId) : undefined,
        categoryId: data.categoryId && typeof data.categoryId === 'string' ? parseInt(data.categoryId) : undefined,
        image: data.image as string | undefined,
        icon: data.icon as string | undefined,
      });
      
      // Show rich notification if supported
      if (Platform.OS === 'android' && data.image) {
        this.showRichNotification(notification, data.image as string);
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

      // Track notification clicked analytics — stary WP endpoint (legacy)
      if (data.notification_id) {
        this.trackNotificationAnalytics(data.notification_id as string, 'clicked', data.articleId as string);
      }

      // GA4: notification_open event z bogatym kontekstem (typ, route, article).
      // Pozwoli zbudować w dashboardzie funnel "push wysłany → otwarty → przeczytany"
      // i policzyć CTR per typ powiadomienia.
      const notificationType = (data?.type as string) ||
                                (data?.articleId ? 'article' : data?.slug ? 'article' : 'general');
      analyticsService.logNotificationOpen(
        notificationType,
        (data?.notification_id as string) || (notification.request.identifier || 'unknown'),
      );
      // Dodatkowy custom event z pełnym kontekstem — dla głębszej analizy w GA4 Explore
      analyticsService.logCustomEvent('notification_clicked', {
        notification_id: (data?.notification_id as string) || 'unknown',
        notification_type: notificationType,
        article_id: data?.articleId ? parseInt(data.articleId as string) : null,
        article_slug: (data?.slug as string) || null,
        route: (data?.route as string) || null,
        platform: Platform.OS,
      });
      
      // Mark as read - fix type error by ensuring we have a string identifier
      const { markAsRead } = useNotificationsStore.getState();
      const notificationId = notification.request.identifier;
      if (notificationId && typeof notificationId === 'string') {
        markAsRead(notificationId);
      }
      
      // Handle navigation based on notification data with improved routing
      if (data?.route && typeof data.route === 'string') {
        console.log('Navigate to route:', data.route);
        this.navigateSafely(data.route);
      } else if (data?.type === 'event' || data?.type === 'event_reminder' || data?.type === 'weekend_events') {
        console.log('Navigate to events tab for event notification');
        this.navigateSafely('/(tabs)/kalendarz');
      } else if (data?.type === 'nekrolog') {
        console.log('Navigate to home tab for nekrolog notification');
        this.navigateSafely('/(tabs)');
      } else if (data?.type === 'daily_weather' || data?.type === 'weather_warning' || data?.type === 'air_quality') {
        console.log('Navigate to weather tab for weather notification');
        this.navigateSafely('/(tabs)/weather');
      } else if (data?.articleId) {
        console.log('Navigate to article:', data.articleId);
        this.navigateSafely(`/article/${data.articleId}`);
      } else if (data?.slug) {
        console.log('Navigate to article by slug:', data.slug);
        this.navigateSafely(`/article/${data.slug}`);
      } else if (data?.url) {
        console.log('Navigate to URL:', data.url);
        this.handleNotificationUrl(data.url as string);
      } else {
        console.log('No navigation data, going to home');
        this.navigateSafely('/(tabs)');
      }

      // Handle action button responses
      if (response.actionIdentifier) {
        this.handleNotificationAction(response.actionIdentifier, data);
      }

    } catch (error) {
      console.warn('Error handling notification response:', error);
      this.navigateSafely('/(tabs)');
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
      this.navigateSafely('/(tabs)');
    }
  };
  
  async requestPermissions(): Promise<boolean> {
    try {
      // Pomiń w Expo Go
      if (isExpoGo || this.initializationFailed) {
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
      // Pomiń w Expo Go
      if (isExpoGo || this.initializationFailed) {
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
    // Pomiń w Expo Go
    if (isExpoGo) {
      console.log('Running inside Expo Go - skipping push token registration (use development build for full notifications)');
      return;
    }

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

  // Build concise daily forecast summary using Open-Meteo via weatherService
  private async buildTodayForecastSummary(): Promise<{ title: string; body: string; data: any }> {
    try {
      const { userLocation } = useNotificationsStore.getState();
      // Try last known position; avoid prompting if possible
      let coords: { latitude: number; longitude: number } | null = null;
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last && last.coords) {
          coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        }
      } catch {}

      if (!coords) {
        // Fallback to Gdańsk SYNOP
        coords = { latitude: 54.3775, longitude: 18.4667 };
      }

      const { fetchForecast } = await import('@/services/weatherService');
      const forecast = await fetchForecast({ latitude: coords.latitude, longitude: coords.longitude }, { ttlMs: 10 * 60 * 1000 });
      const locationLabel = userLocation?.name || 'Kaszuby';
      let title = 'Hej! Pogoda na dziś 🌤️';
      let body = 'Rzuć okiem w aplikacji Kaszuby24 po pełną prognozę.';
      if (forecast && forecast.daily) {
        const d = forecast.daily;
        const idx = 0; // today
        const tmax = Array.isArray(d.temperature_2m_max) ? Math.round(d.temperature_2m_max[idx]) : null;
        const precipProb = Array.isArray(d.precipitation_probability_max) ? Math.round(d.precipitation_probability_max[idx]) : null;
        const wind = Array.isArray(d.windspeed_10m_max) ? Math.round(d.windspeed_10m_max[idx]) : null;
        const uv = Array.isArray(d.uv_index_max) ? Math.round(d.uv_index_max[idx]) : null;

        // Krótko, bez szczegółowych liczb
        const sentences: string[] = [];
        // Odczucie temperatury bez liczb
        if (tmax !== null) {
          if (tmax <= 0) sentences.push(`Dziś w ${locationLabel} będzie bardzo zimno.`);
          else if (tmax <= 10) sentences.push(`Dziś w ${locationLabel} raczej chłodno.`);
          else if (tmax <= 20) sentences.push(`Dziś w ${locationLabel} umiarkowanie.`);
          else sentences.push(`Dziś w ${locationLabel} ciepło i przyjemnie.`);
        } else {
          sentences.push(`Dziś w ${locationLabel} spokojna pogoda.`);
        }
        // Opady bez mm
        if (precipProb !== null && precipProb >= 50) {
          sentences.push('Możliwe przelotne opady ☔, warto mieć coś przeciwdeszczowego.');
        }
        // Wiatr bez km/h
        if (wind !== null && wind >= 35) {
          sentences.push('Miej na uwadze mocniejsze podmuchy wiatru.');
        }
        // UV bez wartości
        if (uv !== null && uv >= 6) {
          sentences.push('Słońce będzie mocniejsze, pamiętaj o ochronie.');
        }
        // Jedno zdanie o ubraniu (bez liczb)
        if (tmax !== null) {
          if (tmax <= 0) sentences.push('Ubierz się bardzo ciepło 🧣🧤.');
          else if (tmax <= 10) sentences.push('Cieplejsza kurtka będzie w sam raz 🧥.');
          else if (tmax <= 20) sentences.push('Lekka warstwa wystarczy 🧥.');
          else sentences.push('Postaw na lżejsze, przewiewne rzeczy 🧢👕.');
        }
        sentences.push('Pełna prognoza czeka w aplikacji Kaszuby24.');
        body = sentences.join(' ');
      }
      return { title, body, data: { type: 'daily_weather', route: '/(tabs)/weather' } };
    } catch (error) {
      console.warn('Failed to build daily forecast summary:', error);
      return {
        title: 'Hej! Pogoda na dziś 🌤️',
        body: 'Sprawdź pełną prognozę w aplikacji Kaszuby24.',
        data: { type: 'daily_weather', route: '/(tabs)/weather' },
      };
    }
  }

  // Schedule a repeating local notification every day at given hour (local time)
  async scheduleDailyWeatherSummary(hour: number = 8) {
    try {
      const hasPerm = await this.requestPermissions();
      if (!hasPerm) return;

      // Cancel existing if any
      await this.cancelDailyWeatherSummary();

      // Build current summary content
      const content = await this.buildTodayForecastSummary();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data,
          sound: 'default',
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour, 
          minute: 0, 
          repeats: true 
        },
      });

      this.dailyWeatherNotificationId = notificationId as unknown as string;
      await AsyncStorage.setItem('daily_weather_notification_id', String(notificationId));
      await AsyncStorage.setItem('daily_weather_hour', String(hour));
      console.log('Scheduled daily weather summary at', hour, 'ID:', notificationId);
      return notificationId;
    } catch (error) {
      console.warn('Failed to schedule daily weather summary:', error);
      throw error;
    }
  }

  async cancelDailyWeatherSummary() {
    try {
      if (!this.dailyWeatherNotificationId) {
        const stored = await AsyncStorage.getItem('daily_weather_notification_id');
        if (stored) this.dailyWeatherNotificationId = stored;
      }
      if (this.dailyWeatherNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(this.dailyWeatherNotificationId);
        console.log('Canceled daily weather summary:', this.dailyWeatherNotificationId);
      }
    } catch (error) {
      console.warn('Failed to cancel daily weather summary:', error);
    } finally {
      this.dailyWeatherNotificationId = null;
      await AsyncStorage.removeItem('daily_weather_notification_id');
    }
  }

  // Public helper: send preview immediately
  async sendDailyWeatherPreview() {
    const content = await this.buildTodayForecastSummary();
    await this.scheduleLocalNotification(content.title, content.body, content.data);
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
          // image: imageUrl, // Removed - not supported in NotificationContentInput
          sound: 'default',
          priority: Notifications.AndroidImportance.HIGH as any,
          // Rich notification style - removed style property as it's not supported
          // style: {
          //   type: 'bigPicture',
          //   picture: imageUrl,
          //   largeIcon: data.icon || 'https://kaszuby24.pl/wp-content/uploads/2024/app-icon.png',
          // },
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
            if (data.notification_id) {
              this.trackNotificationAnalytics(data.notification_id as string, 'action_read', data.articleId as string);
            }
            this.navigateSafely(`/article/${data.articleId}`);
          }
          break;

        case 'save_article':
          if (data.articleId) {
            if (data.notification_id) {
              this.trackNotificationAnalytics(data.notification_id as string, 'action_save', data.articleId as string);
            }
            console.log('Save article:', data.articleId);
          }
          break;

        default:
          console.log('Unknown notification action:', actionId);
          this.navigateSafely('/(tabs)');
          break;
      }
    } catch (error) {
      console.warn('Error handling notification action:', error);
      this.navigateSafely('/(tabs)');
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
        priority: Notifications.AndroidImportance.HIGH as any,
      };

      // Add rich content for Android
      if (Platform.OS === 'android' && imageUrl) {
        // Usuwam nieistniejącą właściwość image
        // notificationContent.image = imageUrl;
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
  addNotificationReceivedListener(callback: (notification: any) => void) {
    if (!Notifications || isExpoGo) {
      console.log('Notifications not available in Expo Go');
      return { remove: () => {} }; // Return dummy subscription
    }
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(callback: (response: any) => void) {
    if (!Notifications || isExpoGo) {
      console.log('Notifications not available in Expo Go');
      return { remove: () => {} }; // Return dummy subscription
    }
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  removeNotificationSubscription(subscription: any) {
    if (subscription && subscription.remove) {
      subscription.remove();
    }
  }
}

export const notificationService = new NotificationService();