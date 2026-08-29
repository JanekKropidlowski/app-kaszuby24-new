import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavoriteRoute {
    id: string; // np. lat1,lon1-lat2,lon2
    fromName: string;
    fromLat: number;
    fromLon: number;
    toName: string;
    toLat: number;
    toLon: number;
    createdAt: number;
    lastUsed: number;   // timestamp ostatniego użycia
    usageCount: number; // ile razy uruchomiono
}

interface FavoritesState {
    favoriteRoutes: FavoriteRoute[];
    addRoute: (route: Omit<FavoriteRoute, 'id' | 'createdAt' | 'lastUsed' | 'usageCount'>) => void;
    removeRoute: (id: string) => void;
    isFavorite: (fromLat: number, fromLon: number, toLat: number, toLon: number) => boolean;
    incrementUsage: (id: string) => void;
}

const generateRouteId = (fromLat: number, fromLon: number, toLat: number, toLon: number) => {
    return `${fromLat.toFixed(4)},${fromLon.toFixed(4)}-${toLat.toFixed(4)},${toLon.toFixed(4)}`;
};

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favoriteRoutes: [],
            addRoute: (routeParams) => {
                const id = generateRouteId(
                    routeParams.fromLat,
                    routeParams.fromLon,
                    routeParams.toLat,
                    routeParams.toLon
                );
                const isExists = get().favoriteRoutes.some(r => r.id === id);
                if (isExists) return;

                const newRoute: FavoriteRoute = {
                    ...routeParams,
                    id,
                    createdAt: Date.now(),
                    lastUsed: Date.now(),
                    usageCount: 0,
                };

                set((state) => ({
                    favoriteRoutes: [newRoute, ...state.favoriteRoutes]
                }));
            },
            removeRoute: (id) => {
                set((state) => ({
                    favoriteRoutes: state.favoriteRoutes.filter(r => r.id !== id)
                }));
            },
            isFavorite: (fromLat, fromLon, toLat, toLon) => {
                const id = generateRouteId(fromLat, fromLon, toLat, toLon);
                return get().favoriteRoutes.some(r => r.id === id);
            },
            incrementUsage: (id) => {
                set((state) => ({
                    favoriteRoutes: state.favoriteRoutes.map(r =>
                        r.id === id
                            ? { ...r, usageCount: (r.usageCount || 0) + 1, lastUsed: Date.now() }
                            : r
                    )
                }));
            },
        }),
        {
            name: 'kaszuby24-favorites-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
