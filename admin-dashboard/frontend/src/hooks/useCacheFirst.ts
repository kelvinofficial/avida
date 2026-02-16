/**
 * Cache-First Data Hook for Admin Dashboard
 * 
 * Uses localStorage for cache-first rendering pattern:
 * 1. Return cached data immediately (no loading states)
 * 2. Fetch fresh data in background
 * 3. Update UI silently when fresh data arrives
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Cache configuration
const CACHE_PREFIX = 'admin_cache_';
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes stale time
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Get cached data synchronously for instant render
 */
export function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > CACHE_EXPIRE_TIME) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Set cache data
 */
export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Ignore errors (quota exceeded, etc.)
  }
}

/**
 * Clear specific cache
 */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    localStorage.removeItem(cacheKey);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all admin cache
 */
export function clearAllAdminCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}

interface UseCacheFirstOptions<T> {
  cacheKey: string;
  fetcher: () => Promise<T>;
  fallbackData: T;
  deps?: any[];
  enabled?: boolean;
}

interface UseCacheFirstResult<T> {
  data: T;
  isFetching: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  setData: (data: T | ((prev: T) => T)) => void;
}

/**
 * Cache-first data fetching hook
 * Returns cached data instantly, fetches fresh data in background
 */
export function useCacheFirst<T>({
  cacheKey,
  fetcher,
  fallbackData,
  deps = [],
  enabled = true,
}: UseCacheFirstOptions<T>): UseCacheFirstResult<T> {
  // Initialize with cached data for instant render
  const cachedData = getCachedData<T>(cacheKey);
  
  const [data, setDataState] = useState<T>(cachedData ?? fallbackData);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const isMounted = useRef(true);

  // Fetch fresh data
  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsFetching(true);
    setError(null);
    
    try {
      const freshData = await fetcher();
      
      if (isMounted.current) {
        setDataState(freshData);
        setCachedData(cacheKey, freshData);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
        // Keep showing cached/current data on error
      }
    } finally {
      if (isMounted.current) {
        setIsFetching(false);
      }
    }
  }, [cacheKey, fetcher, enabled]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Update data with optimistic update
  const setData = useCallback((update: T | ((prev: T) => T)) => {
    setDataState(prev => {
      const newData = typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
      setCachedData(cacheKey, newData);
      return newData;
    });
  }, [cacheKey]);

  // Fetch on mount and deps change
  useEffect(() => {
    isMounted.current = true;
    
    if (enabled) {
      fetchData();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [enabled, ...deps]);

  return {
    data,
    isFetching,
    error,
    refresh,
    setData,
  };
}

// Common cache keys for admin dashboard
export const ADMIN_CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard_stats',
  LISTINGS: 'listings',
  USERS: 'users',
  ANALYTICS: 'analytics',
  SEO_TOOLS: 'seo_tools',
  BANNERS: 'banners',
  VOUCHERS: 'vouchers',
  INTEGRATIONS: 'integrations',
};

export default useCacheFirst;
