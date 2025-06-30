import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OneSignal from 'react-native-onesignal';
import type { ConnectionStatus } from '@/services/notificationService';

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
}

export interface UserLocation {
  id: number;
  name: string;
  slug: string;
}

interface NotificationsState {
  // Connection status
  connectionStatus: ConnectionStatus;
  
  // Push token and location
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
  setConnectionStatus: (status: ConnectionStatus) => void;
  setUserLocation: (location: UserLocation) => void;
  toggleNotifications: () => void;
  updatePreference: (id: number, enabled: boolean) => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  getUnreadCount: () => number;
  
  // First time user actions
  completeFirstTimeSetup: () => void;
  dismissBanner: () => void;
  shouldShowWelcome: () => boolean;
  shouldShowBanner: () => boolean;
  
  // Initialize default preferences
  initializePreferences: () => void;
  
  // User name
  userName: string;
  setUserName: (name: string) => void;
  getUserName: () => string;
}

const defaultRegions: NotificationPreference[] = [
  { id: 65556, name: 'Chojnice', type: 'region', enabled: false },
  { id: 65545, name: 'Kartuzy', type: 'region', enabled: false },
  { id: 65546, name: 'Kościerzyna', type: 'region', enabled: false },
  { id: 66165, name: 'Kraj', type: 'region', enabled: false },
  { id: 65558, name: 'Lębork', type: 'region', enabled: false },
  { id: 2128, name: 'Puck', type: 'region', enabled: false },
  { id: 7, name: 'Trójmiasto', type: 'region', enabled: false },
  { id: 2583, name: 'Wejherowo', type: 'region', enabled: false },
  { id: 996, name: 'Władysławowo', type: 'region', enabled: false },
  { id: 998, name: 'Hel', type: 'region', enabled: false },
];

const defaultCategories: NotificationPreference[] = [
  { id: 17, name: 'Bezpieczeństwo', type: 'category', enabled: false },
  { id: 11, name: 'Biznes', type: 'category', enabled: false },
  { id: 16, name: 'Kultura i Rozrywka', type: 'category', enabled: false },
  { id: 22, name: 'Religia', type: 'category', enabled: false },
  { id: 24, name: 'Sport i Rekreacja', type: 'category', enabled: false },
  { id: 2246, name: 'Zdrowie', type: 'category', enabled: false },
  { id: 3, name: 'Wiadomości', type: 'category', enabled: false },
];

// Available locations for users to choose from
export const availableLocations: UserLocation[] = [
  { id: 65556, name: 'Chojnice', slug: 'chojnice' },
  { id: 65545, name: 'Kartuzy', slug: 'kartuzy' },
  { id: 65546, name: 'Kościerzyna', slug: 'koscierzyna' },
  { id: 66165, name: 'Kraj', slug: 'kraj' },
  { id: 65558, name: 'Lębork', slug: 'lebork' },
  { id: 2128, name: 'Puck', slug: 'puck' },
  { id: 7, name: 'Trójmiasto', slug: 'trojmiasto' },
  { id: 2583, name: 'Wejherowo', slug: 'wejherowo' },
  { id: 996, name: 'Władysławowo', slug: 'wladyslawowo' },
  { id: 998, name: 'Hel', slug: 'hel' },
];

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      connectionStatus: 'connecting',
      userLocation: null,
      preferences: [],
      notificationsEnabled: false,
      notifications: [],
      
      // First time user state
      isFirstTimeUser: true,
      hasSeenWelcome: false,
      bannerDismissed: false,
      hasSelectedLocation: false,
      
      // User name
      userName: '',
      
      setConnectionStatus: (status: ConnectionStatus) => {
        console.log('Store: Setting connection status to:', status);
        set({ connectionStatus: status });
      },
      
      setUserLocation: (location: UserLocation) => {
        try {
          OneSignal.sendTag('region', location.slug);
        } catch (error) {
          console.warn('Failed to send OneSignal tag:', error);
        }
        set({
          userLocation: location,
          hasSelectedLocation: true,
        });
      },
      
      toggleNotifications: () => 
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      
      updatePreference: (id: number, enabled: boolean) => {
        set((state) => {
          const newPreferences = state.preferences.map(pref =>
            pref.id === id ? { ...pref, enabled } : pref
          );
          
          // Update OneSignal tags safely
          try {
            const enabledRegions = newPreferences.filter(p => p.type === 'region' && p.enabled);
            const regionSlugs = enabledRegions.map(region => {
              const loc = availableLocations.find(l => l.id === region.id);
              return loc ? loc.slug : null;
            }).filter(Boolean);
            OneSignal.sendTag('regions', regionSlugs.join(','));
            
            const enabledCategories = newPreferences.filter(p => p.type === 'category' && p.enabled);
            OneSignal.sendTag('categories', enabledCategories.map(c => c.id.toString()).join(','));
          } catch (error) {
            console.warn('Failed to update OneSignal tags:', error);
          }
          
          return { preferences: newPreferences };
        });
      },
      
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
      
      // User name actions
      setUserName: (name: string) => set({ userName: name }),
      getUserName: () => get().userName,
    }),
    {
      name: 'notifications-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Filter out any sponsored notifications that might exist
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.notifications = state.notifications.filter(notif => notif.categoryId !== 554);
          // Start with connecting status on app restart
          state.connectionStatus = 'connecting';
        }
      },
    }
  )
);