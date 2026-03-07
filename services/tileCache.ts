import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'transport_tile_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export class TileCache {
  /**
   * Get cached data for a tile key
   */
  async get<T>(key: string): Promise<{ data: T; timestamp: number } | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!cached) return null;
      
      const parsed: CachedData<T> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() - parsed.timestamp > CACHE_TTL) {
        await this.remove(key);
        return null;
      }
      
      return parsed;
    } catch (e) {
      console.warn('Tile cache read failed:', e);
      return null;
    }
  }
  
  /**
   * Set cached data for a tile key
   */
  async set<T>(key: string, data: T): Promise<void> {
    try {
      const cacheData: CachedData<T> = {
        data,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(
        CACHE_PREFIX + key,
        JSON.stringify(cacheData)
      );
    } catch (e) {
      console.warn('Tile cache write failed:', e);
    }
  }
  
  /**
   * Remove a specific cached tile
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch (e) {
      console.warn('Tile cache remove failed:', e);
    }
  }
  
  /**
   * Clear all tile caches
   */
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const tileKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(tileKeys);
      console.log(`Cleared ${tileKeys.length} tile cache entries`);
    } catch (e) {
      console.warn('Tile cache clear failed:', e);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const tileKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      let totalSize = 0;
      
      for (const key of tileKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return {
        count: tileKeys.length,
        totalSize
      };
    } catch (e) {
      return { count: 0, totalSize: 0 };
    }
  }
}

// Singleton instance
export const tileCache = new TileCache();
