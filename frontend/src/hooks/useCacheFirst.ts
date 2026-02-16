/**
 * useCacheFirst Hook
 * React hook for cache-first data fetching pattern
 * Eliminates loading states by showing cached data instantly
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CacheManager, getCachedSync, setCacheSync } from '../utils/cacheManager';

interface UseCacheFirstOptions<T> {
  // Unique cache key
  cacheKey: string;
  // Async function to fetch fresh data
  fetcher: () => Promise<T>;
  // Initial/default data to show if no cache
  fallbackData: T;
  // Dependencies that trigger refetch when changed
  deps?: any[];
  // Whether to enable the hook
  enabled?: boolean;
  // Callback when fresh data arrives
  onFreshData?: (data: T) => void;
}

interface UseCacheFirstResult<T> {
  // Current data (cached or fresh)
  data: T;
  // Whether currently fetching fresh data in background
  isFetching: boolean;
  // Whether data is from cache
  isFromCache: boolean;
  // Error if fetch failed
  error: Error | null;
  // Manual refresh function
  refresh: () => Promise<void>;
  // Update data optimistically
  setData: (data: T | ((prev: T) => T)) => void;
}

export function useCacheFirst<T>({
  cacheKey,
  fetcher,
  fallbackData,
  deps = [],
  enabled = true,
  onFreshData,
}: UseCacheFirstOptions<T>): UseCacheFirstResult<T> {
  // Try to get cached data synchronously for instant render
  const cachedData = getCachedSync<T>(cacheKey);
  
  // Initialize state with cached data or fallback
  const [data, setDataState] = useState<T>(cachedData ?? fallbackData);
  const [isFetching, setIsFetching] = useState(false);
  const [isFromCache, setIsFromCache] = useState(cachedData !== null);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Track if initial fetch has been done
  const hasInitialFetch = useRef(false);

  // Fetch fresh data
  const fetchFreshData = useCallback(async () => {
    if (!enabled) return;
    
    setIsFetching(true);
    setError(null);
    
    try {
      const freshData = await fetcher();
      
      if (isMounted.current) {
        setDataState(freshData);
        setIsFromCache(false);
        // Update cache
        setCacheSync(cacheKey, freshData);
        // Also update async cache for native
        CacheManager.setCache(cacheKey, freshData);
        // Callback
        onFreshData?.(freshData);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
        // Don't clear data on error - keep showing cached/current data
        console.warn('[useCacheFirst] Fetch error:', err);
      }
    } finally {
      if (isMounted.current) {
        setIsFetching(false);
      }
    }
  }, [cacheKey, fetcher, enabled, onFreshData]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchFreshData();
  }, [fetchFreshData]);

  // Set data with optimistic update
  const setData = useCallback((update: T | ((prev: T) => T)) => {
    setDataState(prev => {
      const newData = typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
      // Update cache immediately
      setCacheSync(cacheKey, newData);
      CacheManager.setCache(cacheKey, newData);
      return newData;
    });
  }, [cacheKey]);

  // Initial fetch and refetch on deps change
  useEffect(() => {
    isMounted.current = true;
    
    // If we have cached data, fetch in background
    // If no cached data, fetch immediately
    if (enabled) {
      fetchFreshData();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [enabled, ...deps]);

  // Load cached data on mount (for native where sync read doesn't work)
  useEffect(() => {
    if (!cachedData && enabled) {
      CacheManager.getCached<T>(cacheKey, {}).then(result => {
        if (result && isMounted.current && !hasInitialFetch.current) {
          setDataState(result.data);
          setIsFromCache(true);
        }
      });
    }
  }, []);

  return {
    data,
    isFetching,
    isFromCache,
    error,
    refresh,
    setData,
  };
}

/**
 * Simplified hook for common list data pattern
 */
export function useCacheFirstList<T>({
  cacheKey,
  fetcher,
  deps = [],
  enabled = true,
}: {
  cacheKey: string;
  fetcher: () => Promise<T[]>;
  deps?: any[];
  enabled?: boolean;
}) {
  return useCacheFirst<T[]>({
    cacheKey,
    fetcher,
    fallbackData: [],
    deps,
    enabled,
  });
}

export default useCacheFirst;
