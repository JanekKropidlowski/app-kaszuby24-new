import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'transport_tile_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

function isSqliteFull(e: unknown): boolean {
  const msg = (e as any)?.message || '';
  const code = (e as any)?.code;
  return code === 13 || /SQLITE_FULL|database or disk is full/i.test(msg);
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
    const cacheData: CachedData<T> = { data, timestamp: Date.now() };
    const value = JSON.stringify(cacheData);
    try {
      await AsyncStorage.setItem(CACHE_PREFIX + key, value);
    } catch (e) {
      if (isSqliteFull(e)) {
        await this.evictExpired();
        try {
          await AsyncStorage.setItem(CACHE_PREFIX + key, value);
        } catch {
          // non-critical cache; silently ignore
        }
      } else {
        console.warn('Tile cache write failed:', e);
      }
    }
  }

  private async evictExpired(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const tileKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      const expired: string[] = [];
      for (const k of tileKeys) {
        const v = await AsyncStorage.getItem(k);
        if (!v) { expired.push(k); continue; }
        try {
          const p: CachedData<unknown> = JSON.parse(v);
          if (Date.now() - p.timestamp > CACHE_TTL) expired.push(k);
        } catch { expired.push(k); }
      }
      const toRemove = expired.length > 0 ? expired : tileKeys;
      if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
    } catch (e) {
      console.warn('Tile cache eviction failed:', e);
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
