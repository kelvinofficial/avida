/**
 * Feed Cache Utility
 * High-performance cache layer for instant listings feed using AsyncStorage.
 * 
 * Cache Strategy:
 * - Cache-first: Always show cached data immediately
 * - Background refresh: Silently update cache with fresh data
 * - Offline support: Show cached data when offline
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache key prefix
const CACHE_PREFIX = 'feed:';
const CACHE_VERSION = 'v1';

// Cache TTL (time to live)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for stale check
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours max age

// Types
export interface FeedItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  cityName: string;
  countryCode: string;
  category: string;
  subcategory?: string;
  thumbUrl?: string;
  createdAt: string;
  isBoosted: boolean;
  sellerId: string;
  viewsCount?: number;
  isNegotiable?: boolean;
}

/**
 * Convert FeedItem to Listing format for compatibility with existing components
 */
export const feedItemToListing = (item: FeedItem): any => ({
  id: item.id,
  title: item.title,
  price: item.price,
  images: item.thumbUrl ? [item.thumbUrl] : [],
  location: item.cityName,
  location_data: {
    city_name: item.cityName,
  },
  category_id: item.category,
  subcategory: item.subcategory,
  created_at: item.createdAt,
  views: item.viewsCount || 0,
  featured: item.isBoosted,
  is_boosted: item.isBoosted,
  negotiable: item.isNegotiable || false,
  user_id: item.sellerId,
  currency: item.currency,
});

export interface CachedFeed {
  items: FeedItem[];
  updatedAt: string;
  total: number;
  nextCursor: string | null;
  version: string;
}

export interface FeedCacheKey {
  country?: string;
  city?: string;
  category?: string;
  subcategory?: string;
  sort?: string;
  sellerId?: string;
  search?: string;
}

/**
 * Generate a cache key from feed parameters
 */
export const generateCacheKey = (params: FeedCacheKey): string => {
  const parts = [
    CACHE_PREFIX,
    CACHE_VERSION,
    params.country || 'all',
    params.city || 'all',
    params.category || 'all',
    params.subcategory || 'all',
    params.sort || 'newest',
    params.sellerId || 'all',
    params.search ? `search:${params.search.substring(0, 20)}` : 'nosearch',
  ];
  return parts.join(':');
};

/**
 * Get cached feed data
 * Returns null if no cache or cache is too old
 */
export const getCachedFeed = async (params: FeedCacheKey): Promise<CachedFeed | null> => {
  try {
    const key = generateCacheKey(params);
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) return null;
    
    const data: CachedFeed = JSON.parse(cached);
    
    // Check if cache is too old (expired)
    const cacheAge = Date.now() - new Date(data.updatedAt).getTime();
    if (cacheAge > CACHE_MAX_AGE_MS) {
      // Cache expired, remove it
      await AsyncStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('[FeedCache] Error reading cache:', error);
    return null;
  }
};

/**
 * Get cached feed synchronously (from memory if available)
 * For instant render on mount
 */
let memoryCache: Map<string, CachedFeed> = new Map();

export const getCachedFeedSync = (params: FeedCacheKey): CachedFeed | null => {
  const key = generateCacheKey(params);
  return memoryCache.get(key) || null;
};

/**
 * Preload cache into memory for faster access
 */
export const preloadCache = async (params: FeedCacheKey): Promise<CachedFeed | null> => {
  const key = generateCacheKey(params);
  
  // Check memory cache first
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }
  
  // Load from AsyncStorage
  const cached = await getCachedFeed(params);
  if (cached) {
    memoryCache.set(key, cached);
  }
  
  return cached;
};

/**
 * Save feed data to cache
 */
export const setCachedFeed = async (
  params: FeedCacheKey,
  items: FeedItem[],
  nextCursor: string | null,
  total: number
): Promise<void> => {
  try {
    const key = generateCacheKey(params);
    const data: CachedFeed = {
      items,
      updatedAt: new Date().toISOString(),
      total,
      nextCursor,
      version: CACHE_VERSION,
    };
    
    // Update memory cache
    memoryCache.set(key, data);
    
    // Persist to AsyncStorage
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('[FeedCache] Error writing cache:', error);
  }
};

/**
 * Append items to existing cache (for pagination)
 */
export const appendToCachedFeed = async (
  params: FeedCacheKey,
  newItems: FeedItem[],
  nextCursor: string | null
): Promise<void> => {
  try {
    const existing = await getCachedFeed(params);
    if (!existing) {
      await setCachedFeed(params, newItems, nextCursor, newItems.length);
      return;
    }
    
    // Merge items, avoiding duplicates
    const existingIds = new Set(existing.items.map(item => item.id));
    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
    
    const mergedItems = [...existing.items, ...uniqueNewItems];
    
    await setCachedFeed(params, mergedItems, nextCursor, existing.total);
  } catch (error) {
    console.warn('[FeedCache] Error appending to cache:', error);
  }
};

/**
 * Merge fresh items with cached items (preserves scroll position)
 */
export const mergeFeedItems = (
  cachedItems: FeedItem[],
  freshItems: FeedItem[]
): FeedItem[] => {
  const itemMap = new Map<string, FeedItem>();
  
  // Add cached items first
  cachedItems.forEach(item => itemMap.set(item.id, item));
  
  // Override with fresh items (newer data)
  freshItems.forEach(item => itemMap.set(item.id, item));
  
  // Convert back to array, maintaining order from fresh items
  const freshIds = new Set(freshItems.map(item => item.id));
  const result: FeedItem[] = [];
  
  // Add fresh items in order
  freshItems.forEach(item => {
    result.push(itemMap.get(item.id)!);
  });
  
  // Add remaining cached items that aren't in fresh
  cachedItems.forEach(item => {
    if (!freshIds.has(item.id)) {
      result.push(item);
    }
  });
  
  return result;
};

/**
 * Check if cache is stale (needs refresh)
 */
export const isCacheStale = (cached: CachedFeed): boolean => {
  const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
  return cacheAge > CACHE_TTL_MS;
};

/**
 * Clear all feed caches
 */
export const clearAllFeedCaches = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const feedKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(feedKeys);
    memoryCache.clear();
  } catch (error) {
    console.warn('[FeedCache] Error clearing caches:', error);
  }
};

/**
 * Clear specific feed cache
 */
export const clearFeedCache = async (params: FeedCacheKey): Promise<void> => {
  try {
    const key = generateCacheKey(params);
    await AsyncStorage.removeItem(key);
    memoryCache.delete(key);
  } catch (error) {
    console.warn('[FeedCache] Error clearing cache:', error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<{
  totalEntries: number;
  totalSize: number;
  oldestEntry: string | null;
}> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const feedKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    let oldestDate: Date | null = null;
    
    for (const key of feedKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
        try {
          const data: CachedFeed = JSON.parse(value);
          const date = new Date(data.updatedAt);
          if (!oldestDate || date < oldestDate) {
            oldestDate = date;
          }
        } catch {}
      }
    }
    
    return {
      totalEntries: feedKeys.length,
      totalSize,
      oldestEntry: oldestDate?.toISOString() || null,
    };
  } catch (error) {
    return { totalEntries: 0, totalSize: 0, oldestEntry: null };
  }
};

export default {
  generateCacheKey,
  getCachedFeed,
  getCachedFeedSync,
  preloadCache,
  setCachedFeed,
  appendToCachedFeed,
  mergeFeedItems,
  isCacheStale,
  clearAllFeedCaches,
  clearFeedCache,
  getCacheStats,
};
