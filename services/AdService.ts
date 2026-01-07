import AsyncStorage from '@react-native-async-storage/async-storage';

// Typy
export interface Ad {
    id: number;
    imageUrl: string;
    linkUrl: string;
    position: 'home_feed' | 'article_top' | 'article_middle' | 'article_bottom';
    active: boolean;
}

const API_URL = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/ads';
const CACHE_KEY = 'kaszuby24_ads_cache';
const CACHE_TIME = 2 * 60 * 1000; // 2 minuty - krótszy czas dla łatwiejszego debugowania

const SETTINGS_URL = 'https://kaszuby24.pl/wp-json/kaszuby24/v1/ad-settings';

export interface AdSettings {
    rotation_mode: 'random' | 'slider';
}

export const AdService = {
    // Pobierz ustawienia reklam
    getAdSettings: async (): Promise<AdSettings> => {
        try {
            const response = await fetch(SETTINGS_URL);
            if (!response.ok) return { rotation_mode: 'random' };
            return await response.json();
        } catch (error) {
            console.warn('AdSettings fetch error:', error);
            return { rotation_mode: 'random' };
        }
    },

    // Pobierz reklamy z API lub cache
    getAds: async (): Promise<Ad[]> => {
        try {
            // Sprawdź cache
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TIME) {
                    return data;
                }
            }

            // Pobierz z API
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            // Zapisz do cache
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now()
            }));

            return data;
        } catch (error) {
            console.warn('AdService fetch error:', error);
            // Fallback: zwróć mockowe dane jeśli API zawiedzie (dla testów)
            return AdService.getMockAds();
        }
    },

    // Filtruj reklamy po pozycji
    getAdsByPosition: async (position: Ad['position']): Promise<Ad[]> => {
        const allAds = await AdService.getAds();
        return allAds.filter(ad => ad.position === position && ad.active);
    },

    // Pobierz losową reklamę dla pozycji
    getRandomAd: async (position: Ad['position']): Promise<Ad | null> => {
        const ads = await AdService.getAdsByPosition(position);
        if (ads.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * ads.length);
        return ads[randomIndex];
    },

    // Mockowe dane na czas developmentu
    getMockAds: (): Ad[] => {
        return [
            {
                id: 1,
                imageUrl: 'https://kaszuby24.pl/wp-content/uploads/2025/08/Bez-nazwy-1-03-scaled.png', // Placeholder image
                linkUrl: 'https://buycoffee.to/kaszuby24',
                position: 'home_feed',
                active: true
            },
            {
                id: 2,
                imageUrl: 'https://via.placeholder.com/800x200/224996/FFFFFF?text=Reklama+Srodtop',
                linkUrl: 'https://kaszuby24.pl',
                position: 'article_top',
                active: true
            },
            {
                id: 3,
                imageUrl: 'https://via.placeholder.com/800x200/EF4444/FFFFFF?text=Reklama+Bottom',
                linkUrl: 'https://kaszuby24.pl',
                position: 'article_bottom',
                active: true
            },
            {
                id: 4,
                imageUrl: 'https://via.placeholder.com/800x200/10B981/FFFFFF?text=Reklama+Middle',
                linkUrl: 'https://kaszuby24.pl',
                position: 'article_middle',
                active: true
            }
        ];
    }
};
