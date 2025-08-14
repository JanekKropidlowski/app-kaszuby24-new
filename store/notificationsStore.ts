import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreference {
  id: number;
  name: string;
  type: 'region' | 'category';
  enabled: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  timestamp: number;
  articleId?: number;
  categoryId?: number;
  image?: string;
  icon?: string;
}

export interface UserLocation {
  id: number;
  name: string;
  slug: string;
}

interface NotificationsState {
  // Expo Push token and location
  expoPushToken: string | null;
  userLocation: UserLocation | null;
  
  // Preferences
  preferences: NotificationPreference[];
  notificationsEnabled: boolean;
  
  // First time user experience
  isFirstTimeUser: boolean;
  hasSeenWelcome: boolean;
  bannerDismissed: boolean;
  hasSelectedLocation: boolean;
  
  // Notification history
  notifications: Notification[];
  
  // Daily weather push
  dailyWeatherEnabled: boolean;
  dailyWeatherHour: number; // 0-23, local time (default 8)
  
  // Actions
  setExpoPushToken: (token: string) => void;
  setUserLocation: (location: UserLocation) => void;
  toggleNotifications: () => void;
  updatePreference: (id: number, enabled: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  getUnreadCount: () => number;
  hasUnreadNotifications: () => boolean;
  incrementNotificationCount: () => void;
  
  // Daily weather actions
  setDailyWeatherEnabled: (enabled: boolean) => void;
  setDailyWeatherHour: (hour: number) => void;
  
  // First time user actions
  completeFirstTimeSetup: () => void;
  dismissBanner: () => void;
  shouldShowWelcome: () => boolean;
  shouldShowBanner: () => boolean;
  
  // Initialize default preferences
  initializePreferences: () => void;
}

const defaultRegions: NotificationPreference[] = [
  { id: 2583, name: 'Wejherowo', type: 'region', enabled: false },
  { id: 7, name: 'Trójmiasto', type: 'region', enabled: false },
  { id: 2128, name: 'Puck', type: 'region', enabled: false },
  { id: 76797, name: 'Reda', type: 'region', enabled: false },
  { id: 65546, name: 'Kościerzyna', type: 'region', enabled: false },
  { id: 65545, name: 'Kartuzy', type: 'region', enabled: false },
  { id: 65558, name: 'Lębork', type: 'region', enabled: false },
];

const defaultCategories: NotificationPreference[] = [
  { id: 17, name: 'Bezpieczeństwo', type: 'category', enabled: false },
  { id: 11, name: 'Biznes', type: 'category', enabled: false },
  { id: 16, name: 'Kultura i Rozrywka', type: 'category', enabled: false },
  { id: 22, name: 'Religia', type: 'category', enabled: false },
  { id: 24, name: 'Sport i Rekreacja', type: 'category', enabled: false },
  { id: 2246, name: 'Zdrowie', type: 'category', enabled: false },
  { id: 3, name: 'Wiadomości', type: 'category', enabled: false },
  // Note: Sponsored category (554) is intentionally excluded from default preferences
];

// Available locations for users to choose from
export const availableLocations: UserLocation[] = [
  { id: 2583, name: 'Wejherowo', slug: 'wejherowo' },
  { id: 7, name: 'Trójmiasto', slug: 'trojmiasto' },
  { id: 2128, name: 'Puck', slug: 'puck' },
  { id: 76797, name: 'Reda', slug: 'reda' },
  { id: 65546, name: 'Kościerzyna', slug: 'koscierzyna' },
  { id: 65545, name: 'Kartuzy', slug: 'kartuzy' },
  { id: 65558, name: 'Lębork', slug: 'lebork' },
];

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      expoPushToken: null,
      userLocation: null,
      preferences: [],
      notificationsEnabled: false,
      notifications: [],
      
      // Daily weather defaults
      dailyWeatherEnabled: false,
      dailyWeatherHour: 8,
      
      // First time user state
      isFirstTimeUser: true,
      hasSeenWelcome: false,
      bannerDismissed: false,
      hasSelectedLocation: false,
      
      setExpoPushToken: (token: string) => set({ expoPushToken: token }),
      
      setUserLocation: (location: UserLocation) => 
        set((state) => {
          // Update push notification location when user changes it
          setTimeout(async () => {
            try {
              const { notificationService } = await import('@/services/notificationService');
              await notificationService.updateLocationAndReregister();
            } catch (error) {
              console.warn('Failed to update push location:', error);
            }
          }, 100);
          
          return { 
            userLocation: location, 
            hasSelectedLocation: true 
          };
        }),
      
      toggleNotifications: () => 
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      
      updatePreference: (id: number, enabled: boolean) =>
        set((state) => {
          const updatedPreferences = state.preferences.map(pref =>
            pref.id === id ? { ...pref, enabled } : pref
          );
          
          // Update push notification preferences when user changes settings
          setTimeout(async () => {
            try {
              const { notificationService } = await import('@/services/notificationService');
              await notificationService.updatePreferences();
            } catch (error) {
              console.warn('Failed to update push preferences:', error);
            }
          }, 100);
          
          return { preferences: updatedPreferences };
        }),
      
      addNotification: (notification) => {
        set((state) => {
          const newNotification: Notification = {
            id: `notification_${Date.now()}_${Math.random()}`,
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            read: false,
            timestamp: Date.now(),
            articleId: notification.articleId,
            categoryId: notification.categoryId,
            image: notification.image,
            icon: notification.icon,
          };
          
          return {
            notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep last 100
          };
        });
      },
      
      markAsRead: (notificationId: string) =>
        set((state) => ({
          notifications: state.notifications.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        })),
      
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map(notif => ({ ...notif, read: true }))
        })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      getUnreadCount: () => {
        const state = get();
        return state.notifications.filter(notif => !notif.read).length;
      },
      
      hasUnreadNotifications: () => {
        const state = get();
        return state.notifications.some(notif => !notif.read);
      },
      
      incrementNotificationCount: () => {
        // This is for real-time notification count increment
        // The actual notification will be added via addNotification
        // This function can be used for UI updates
      },
      
      // Daily weather actions
      setDailyWeatherEnabled: (enabled: boolean) => {
        set({ dailyWeatherEnabled: enabled });
        // Side-effect: schedule/cancel in service
        setTimeout(async () => {
          try {
            const { notificationService } = await import('@/services/notificationService');
            if (enabled) {
              const hour = get().dailyWeatherHour;
              await notificationService.scheduleDailyWeatherSummary(hour);
            } else {
              await notificationService.cancelDailyWeatherSummary();
            }
          } catch (error) {
            console.warn('Failed to update daily weather schedule:', error);
          }
        }, 0);
      },
      setDailyWeatherHour: (hour: number) => {
        const normalized = Math.min(23, Math.max(0, Math.floor(hour)));
        set({ dailyWeatherHour: normalized });
        // If enabled, reschedule with new hour
        setTimeout(async () => {
          try {
            const state = get();
            if (state.dailyWeatherEnabled) {
              const { notificationService } = await import('@/services/notificationService');
              await notificationService.scheduleDailyWeatherSummary(state.dailyWeatherHour);
            }
          } catch (error) {
            console.warn('Failed to reschedule daily weather after hour change:', error);
          }
        }, 0);
      },
      
      // First time user actions
      completeFirstTimeSetup: () => 
        set({ 
          isFirstTimeUser: false, 
          hasSeenWelcome: true,
          bannerDismissed: true 
        }),
      
      dismissBanner: () => 
        set({ bannerDismissed: true }),
      
      shouldShowWelcome: () => {
        const state = get();
        return state.isFirstTimeUser && !state.hasSeenWelcome;
      },
      
      shouldShowBanner: () => {
        const state = get();
        return state.isFirstTimeUser && 
               !state.notificationsEnabled && 
               !state.bannerDismissed &&
               state.hasSeenWelcome;
      },
      
      initializePreferences: () => {
        const state = get();
        if (state.preferences.length === 0) {
          set({ preferences: [...defaultRegions, ...defaultCategories] });
        }
      },
    }),
    {
      name: 'notifications-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Filter out any sponsored notifications that might exist
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.notifications = state.notifications.filter(notif => notif.categoryId !== 554);
        }
      },
    }
  )
);