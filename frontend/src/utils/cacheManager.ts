/**
 * Cache Manager - Unified cache-first data fetching utility
 * Eliminates loading states by always showing cached data instantly
 * 
 * Strategy:
 * 1. Return cached data immediately (no loading state)
 * 2. Fetch fresh data in background
 * 3. Update UI silently when fresh data arrives
 */

import { Storage } from './storage';
import { Platform } from 'react-native';

// Cache configuration
const CACHE_CONFIG = {
  // Maximum age before cache is considered stale (but still usable)
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  // Maximum age before cache is considered expired (not usable)
  MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  // Prefix for all cache keys
  PREFIX: '@cache_',
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

interface CacheOptions {
  staleTime?: number;
  maxAge?: number;
  version?: number;
}

// Current cache version - increment to invalidate all caches
const CACHE_VERSION = 1;

/**
 * Get data from cache
 * Returns null if no cache or cache is expired
 */
async function getCached<T>(key: string, options: CacheOptions = {}): Promise<{ data: T; isStale: boolean } | null> {
  try {
    const cacheKey = `${CACHE_CONFIG.PREFIX}${key}`;
    const cached = await Storage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    const maxAge = options.maxAge ?? CACHE_CONFIG.MAX_AGE;
    const staleTime = options.staleTime ?? CACHE_CONFIG.STALE_TIME;
    const version = options.version ?? CACHE_VERSION;
    
    // Check version
    if (entry.version !== version) {
      await Storage.removeItem(cacheKey);
      return null;
    }
    
    // Check if expired (max age exceeded)
    if (now - entry.timestamp > maxAge) {
      await Storage.removeItem(cacheKey);
      return null;
    }
    
    // Determine if stale
    const isStale = now - entry.timestamp > staleTime;
    
    return { data: entry.data, isStale };
  } catch (error) {
    console.warn('[CacheManager] Error reading cache:', error);
    return null;
  }
}

/**
 * Set data in cache
 */
async function setCache<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
  try {
    const cacheKey = `${CACHE_CONFIG.PREFIX}${key}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: options.version ?? CACHE_VERSION,
    };
    await Storage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn('[CacheManager] Error writing cache:', error);
  }
}

/**
 * Clear specific cache entry
 */
async function clearCache(key: string): Promise<void> {
  try {
    const cacheKey = `${CACHE_CONFIG.PREFIX}${key}`;
    await Storage.removeItem(cacheKey);
  } catch (error) {
    console.warn('[CacheManager] Error clearing cache:', error);
  }
}

/**
 * Clear all cache entries (for logout, etc.)
 */
async function clearAllCache(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_CONFIG.PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('[CacheManager] Error clearing all cache:', error);
    }
  }
}

/**
 * Cache-first fetch wrapper
 * Returns cached data immediately, then fetches fresh data in background
 * 
 * @param key - Unique cache key
 * @param fetcher - Async function to fetch fresh data
 * @param options - Cache options
 * @returns Object with initial data and methods to get updates
 */
export async function cacheFirstFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<{
  data: T | null;
  isFromCache: boolean;
  refresh: () => Promise<T>;
}> {
  // Try to get cached data first
  const cached = await getCached<T>(key, options);
  
  // If we have cached data, return it immediately and fetch in background
  if (cached) {
    // If cache is stale, trigger background refresh
    if (cached.isStale) {
      // Don't await - let it run in background
      fetcher()
        .then(freshData => setCache(key, freshData, options))
        .catch(err => console.warn('[CacheManager] Background refresh failed:', err));
    }
    
    return {
      data: cached.data,
      isFromCache: true,
      refresh: async () => {
        const freshData = await fetcher();
        await setCache(key, freshData, options);
        return freshData;
      },
    };
  }
  
  // No cache - fetch fresh data
  try {
    const freshData = await fetcher();
    await setCache(key, freshData, options);
    return {
      data: freshData,
      isFromCache: false,
      refresh: async () => {
        const data = await fetcher();
        await setCache(key, data, options);
        return data;
      },
    };
  } catch (error) {
    console.error('[CacheManager] Fetch failed:', error);
    return {
      data: null,
      isFromCache: false,
      refresh: fetcher,
    };
  }
}

/**
 * Synchronous cache read for instant UI rendering
 * Use this for initial render - returns null if not in cache
 * 
 * NOTE: This only works synchronously on web.
 * For mobile, use the in-memory cache that gets populated from AsyncStorage.
 */

// In-memory cache for instant mobile access
const memoryCache: Map<string, any> = new Map();

export function getCachedSync<T>(key: string): T | null {
  // First, try memory cache (works on both web and mobile)
  const cacheKey = `${CACHE_CONFIG.PREFIX}${key}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }
  
  // On web, try localStorage as fallback
  if (Platform.OS === 'web') {
    try {
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Check version and expiry
      if (entry.version !== CACHE_VERSION) return null;
      if (now - entry.timestamp > CACHE_CONFIG.MAX_AGE) return null;
      
      // Store in memory cache for future sync access
      memoryCache.set(cacheKey, entry.data);
      
      return entry.data;
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Synchronous cache write
 */
export function setCacheSync<T>(key: string, data: T): void {
  const cacheKey = `${CACHE_CONFIG.PREFIX}${key}`;
  
  // Always update memory cache
  memoryCache.set(cacheKey, data);
  
  // On web, also update localStorage
  if (Platform.OS === 'web') {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch {
      // Ignore errors
    }
  }
  
  // On mobile, also persist to AsyncStorage (fire and forget)
  if (Platform.OS !== 'web') {
    Storage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    })).catch(() => {});
  }
}

/**
 * Preload cache from AsyncStorage into memory (call on app start)
 */
export async function preloadCacheToMemory(): Promise<void> {
  if (Platform.OS === 'web') return;
  
  const keysToPreload = [
    CACHE_KEYS.HOME_LISTINGS,
    CACHE_KEYS.HOME_CATEGORIES,
    CACHE_KEYS.FEATURED_LISTINGS,
    CACHE_KEYS.FEATURED_SELLERS,
  ];
  
  for (const key of keysToPreload) {
    try {
      const cacheKey = `${CACHE_CONFIG.PREFIX}${key}`;
      const cached = await Storage.getItem(cacheKey);
      if (cached) {
        const entry: CacheEntry<any> = JSON.parse(cached);
        const now = Date.now();
        
        // Check version and expiry
        if (entry.version === CACHE_VERSION && now - entry.timestamp < CACHE_CONFIG.MAX_AGE) {
          memoryCache.set(cacheKey, entry.data);
        }
      }
    } catch {
      // Ignore errors
    }
  }
}

// Cache keys for different data types
export const CACHE_KEYS = {
  HOME_LISTINGS: 'home_listings',
  HOME_CATEGORIES: 'home_categories',
  FEATURED_LISTINGS: 'featured_listings',
  FEATURED_SELLERS: 'featured_sellers',
  USER_FAVORITES: 'user_favorites',
  USER_PROFILE: 'user_profile',
  SEARCH_SUGGESTIONS: 'search_suggestions',
  BUSINESS_PROFILES: 'business_profiles',
  LISTING_DETAIL: (id: string) => `listing_${id}`,
  CATEGORY_LISTINGS: (categoryId: string, page: number) => `category_${categoryId}_p${page}`,
  SELLER_PROFILE: (slug: string) => `seller_${slug}`,
  // Phase 5: Mobile app cache keys
  USER_SETTINGS: 'user_settings',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_PREFS: 'notification_prefs',
  OFFERS: 'offers',
  MESSAGES: 'messages',
  CHALLENGES: 'challenges',
  LEADERBOARD: 'leaderboard',
  STREAKS: 'streaks',
  SMART_ALERTS: 'smart_alerts',
  CREDITS: 'credits',
  SALES: 'sales',
  ORDERS: 'orders',
  PURCHASES: 'purchases',
  BADGES: 'badges',
  INVOICES: 'invoices',
  SAVED_LISTINGS: 'saved_listings',
  BLOG_POSTS: 'blog_posts',
  BLOG_POST: (slug: string) => `blog_${slug}`,
  PROPERTY_LISTINGS: 'property_listings',
  AUTO_LISTINGS: 'auto_listings',
  HELP_ARTICLES: 'help_articles',
  SUPPORT_TICKETS: 'support_tickets',
  CHECKOUT: (id: string) => `checkout_${id}`,
};

export const CacheManager = {
  getCached,
  setCache,
  clearCache,
  clearAllCache,
  cacheFirstFetch,
  getCachedSync,
  setCacheSync,
  KEYS: CACHE_KEYS,
};

export default CacheManager;
