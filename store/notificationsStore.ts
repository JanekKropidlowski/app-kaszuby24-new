import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreference {
  id: number;
  name: string;
  type: 'region' | 'category';
  enabled: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  articleId?: number;
  categoryId?: number;
  timestamp: number;
  read: boolean;
  data?: any;
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
  notifications: NotificationItem[];
  
  // Actions
  setExpoPushToken: (token: string) => void;
  setUserLocation: (location: UserLocation) => void;
  toggleNotifications: () => void;
  updatePreference: (id: number, enabled: boolean) => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  getUnreadCount: () => number;
  hasUnreadNotifications: () => boolean;
  incrementNotificationCount: () => void;
  
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
      
      addNotification: (notification) =>
        set((state) => {
          // Don't add notifications for sponsored content (category 554)
          if (notification.categoryId === 554) {
            return state;
          }
          
          return {
            notifications: [
              {
                ...notification,
                id: Date.now().toString(),
                timestamp: Date.now(),
                read: false,
              },
              ...state.notifications
            ].slice(0, 100) // Keep only last 100 notifications
          };
        }),
      
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