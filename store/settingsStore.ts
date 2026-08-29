
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationRegion {
    id: string;
    name: string;
    enabled: boolean;
}

export interface NotificationCategory {
    id: string;
    name: string;
    enabled: boolean;
}

interface SettingsState {
    dailyWeatherEnabled: boolean;
    setDailyWeatherEnabled: (enabled: boolean) => void;

    weatherNotificationTime: string;
    setWeatherNotificationTime: (time: string) => void;

    notificationRegions: NotificationRegion[];
    notificationCategories: NotificationCategory[];

    updatePreference: (id: string, enabled: boolean) => void;
    loadSettings: () => void; // Placeholder w Zustandzie, ale może być użyteczny do inita

    wasteNotificationsEnabled: boolean;
    setWasteNotificationsEnabled: (enabled: boolean) => void;
}

const defaultRegions: NotificationRegion[] = [
    { id: '65556', name: 'Pow. Chojnicki', enabled: false },
    { id: '2128', name: 'Pow. Pucki', enabled: false },
    { id: '626', name: '-- Gmina Puck', enabled: false },
    { id: '78780', name: '-- Gmina Krokowa', enabled: false },
    { id: '65545', name: 'Pow. Kartuski', enabled: false },
    { id: '65546', name: 'Pow. Kościerski', enabled: false },
    { id: '65558', name: 'Pow. Lęborski', enabled: false },
    { id: '2583', name: 'Pow. Wejherowski', enabled: false },
    { id: '76797', name: '-- Reda', enabled: false },
    { id: '7', name: 'Trójmiasto', enabled: false },
    { id: '66165', name: 'Kraj', enabled: false },
];

const defaultCategories: NotificationCategory[] = [
    { id: '3', name: 'Wiadomości', enabled: true },
    { id: '17', name: 'Bezpieczeństwo', enabled: true },
    { id: '11', name: 'Biznes', enabled: true },
    { id: '16', name: 'Kultura i Rozrywka', enabled: true },
    { id: '24', name: 'Sport i Rekreacja', enabled: true },
    { id: '2058', name: 'Nekrologi', enabled: true },
    { id: '22', name: 'Religia', enabled: true },
    { id: '2246', name: 'Zdrowie', enabled: true },
];

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            dailyWeatherEnabled: true,
            setDailyWeatherEnabled: (enabled: boolean) => set({ dailyWeatherEnabled: enabled }),

            weatherNotificationTime: '08:00',
            setWeatherNotificationTime: (time: string) => set({ weatherNotificationTime: time }),

            wasteNotificationsEnabled: true,
            setWasteNotificationsEnabled: (enabled: boolean) => set({ wasteNotificationsEnabled: enabled }),

            notificationRegions: defaultRegions,
            notificationCategories: defaultCategories,

            updatePreference: (id: string, enabled: boolean) => {
                set((state) => {
                    // Spróbuj znaleźć w regionach
                    const regionIndex = state.notificationRegions.findIndex((r) => r.id === id);
                    if (regionIndex !== -1) {
                        const newRegions = [...state.notificationRegions];
                        newRegions[regionIndex].enabled = enabled;
                        return { notificationRegions: newRegions };
                    }

                    // Spróbuj znaleźć w kategoriach
                    const categoryIndex = state.notificationCategories.findIndex((c) => c.id === id);
                    if (categoryIndex !== -1) {
                        const newCategories = [...state.notificationCategories];
                        newCategories[categoryIndex].enabled = enabled;
                        return { notificationCategories: newCategories };
                    }

                    return {};
                });
            },

            loadSettings: () => {
                // Zustand z persist ładuje automatycznie, ale ta funkcja może służyć do odświeżenia lub logowania
                // console.log('Settings loaded', get());
            }
        }),
        {
            name: 'app-settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
            version: 2,
        }
    )
);
