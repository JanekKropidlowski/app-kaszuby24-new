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
}

interface NotificationsState {
  // Preferences
  preferences: NotificationPreference[];
  notificationsEnabled: boolean;
  
  // First time user experience
  isFirstTimeUser: boolean;
  hasSeenWelcome: boolean;
  bannerDismissed: boolean;
  
  // Notification history
  notifications: NotificationItem[];
  
  // Actions
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

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      preferences: [],
      notificationsEnabled: false,
      notifications: [],
      
      // First time user state
      isFirstTimeUser: true,
      hasSeenWelcome: false,
      bannerDismissed: false,
      
      toggleNotifications: () => 
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      
      updatePreference: (id: number, enabled: boolean) =>
        set((state) => ({
          preferences: state.preferences.map(pref =>
            pref.id === id ? { ...pref, enabled } : pref
          )
        })),
      
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: Date.now().toString(),
              timestamp: Date.now(),
              read: false,
            },
            ...state.notifications
          ].slice(0, 100) // Keep only last 100 notifications
        })),
      
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
    }),
    {
      name: 'notifications-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);