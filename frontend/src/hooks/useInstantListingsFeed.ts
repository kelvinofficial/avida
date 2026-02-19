/**
 * useInstantListingsFeed Hook
 * 
 * High-performance feed hook with cache-first strategy.
 * - Shows cached data instantly (<150ms)
 * - Background refresh without blocking UI
 * - No skeleton loaders
 * - Smooth pagination
 * - Offline support
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  FeedItem,
  FeedCacheKey,
  getCachedFeed,
  setCachedFeed,
  appendToCachedFeed,
  mergeFeedItems,
  isCacheStale,
  preloadCache,
} from '../utils/feedCache';
import { API_URL } from '../utils/api';

// Types
export interface FeedParams {
  country?: string;
  region?: string;
  city?: string;
  category?: string;
  subcategory?: string;
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'popular';
  sellerId?: string;
  search?: string;
  limit?: number;
}

export interface FeedState {
  items: FeedItem[];
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  isOffline: boolean;
  totalApprox: number;
  lastUpdated: string | null;
  isInitialLoad: boolean;
}

export interface FeedActions {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export type UseInstantListingsFeedReturn = FeedState & FeedActions;

/**
 * Fetch feed from API
 */
const fetchFeed = async (
  params: FeedParams,
  cursor?: string | null
): Promise<{
  items: FeedItem[];
  nextCursor: string | null;
  totalApprox: number;
  hasMore: boolean;
}> => {
  const queryParams = new URLSearchParams();
  
  if (params.country) queryParams.append('country', params.country);
  if (params.region) queryParams.append('region', params.region);
  if (params.city) queryParams.append('city', params.city);
  if (params.category) queryParams.append('category', params.category);
  if (params.subcategory) queryParams.append('subcategory', params.subcategory);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.sellerId) queryParams.append('seller_id', params.sellerId);
  if (params.search) queryParams.append('search', params.search);
  if (cursor) queryParams.append('cursor', cursor);
  queryParams.append('limit', String(params.limit || 20));
  
  const response = await fetch(`${API_URL}/api/listings/feed?${queryParams.toString()}`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Feed fetch failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    items: data.items || [],
    nextCursor: data.nextCursor || null,
    totalApprox: data.totalApprox || 0,
    hasMore: data.hasMore || false,
  };
};

/**
 * Convert FeedParams to FeedCacheKey
 */
const paramsToKey = (params: FeedParams): FeedCacheKey => ({
  country: params.country,
  city: params.city,
  category: params.category,
  subcategory: params.subcategory,
  sort: params.sort,
  sellerId: params.sellerId,
  search: params.search,
});

/**
 * Main hook for instant listings feed
 */
export const useInstantListingsFeed = (params: FeedParams): UseInstantListingsFeedReturn => {
  // State
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [totalApprox, setTotalApprox] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Refs
  const cursorRef = useRef<string | null>(null);
  const loadingMoreLock = useRef(false);
  const isMountedRef = useRef(true);
  const paramsRef = useRef(params);
  
  // Update params ref
  paramsRef.current = params;
  
  // Cache key memoized
  const cacheKey = useMemo(() => paramsToKey(params), [
    params.country,
    params.city,
    params.category,
    params.subcategory,
    params.sort,
    params.sellerId,
    params.search,
  ]);
  
  /**
   * Load cached data immediately on mount
   */
  useEffect(() => {
    let cancelled = false;
    
    const loadCached = async () => {
      const cached = await preloadCache(cacheKey);
      
      if (cancelled || !isMountedRef.current) return;
      
      if (cached && cached.items.length > 0) {
        setItems(cached.items);
        setTotalApprox(cached.total);
        setLastUpdated(cached.updatedAt);
        cursorRef.current = cached.nextCursor;
        setHasMore(!!cached.nextCursor);
        setIsInitialLoad(false);
        
        // Check if cache is stale and needs refresh
        if (isCacheStale(cached)) {
          refreshInBackground();
        }
      } else {
        // No cache, fetch fresh
        refreshInBackground();
      }
    };
    
    loadCached();
    
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);
  
  /**
   * Monitor network status
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, []);
  
  /**
   * Refresh when app comes to foreground
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && items.length > 0) {
        refreshInBackground();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [items.length]);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  /**
   * Background refresh (doesn't block UI)
   */
  const refreshInBackground = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      const result = await fetchFeed(paramsRef.current);
      
      if (!isMountedRef.current) return;
      
      // Merge with existing items if we have them
      const mergedItems = items.length > 0 
        ? mergeFeedItems(items, result.items)
        : result.items;
      
      setItems(mergedItems);
      setTotalApprox(result.totalApprox);
      setHasMore(result.hasMore);
      cursorRef.current = result.nextCursor;
      setLastUpdated(new Date().toISOString());
      setIsInitialLoad(false);
      
      // Update cache
      await setCachedFeed(
        paramsToKey(paramsRef.current),
        mergedItems,
        result.nextCursor,
        result.totalApprox
      );
    } catch (err: any) {
      if (!isMountedRef.current) return;
      
      // Only show error if we have no cached data
      if (items.length === 0) {
        setError(err.message || 'Failed to load listings');
      }
      console.warn('[Feed] Refresh error:', err.message);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [items]);
  
  /**
   * Manual refresh (pull-to-refresh)
   */
  const refresh = useCallback(async () => {
    cursorRef.current = null;
    setHasMore(true);
    await refreshInBackground();
  }, [refreshInBackground]);
  
  /**
   * Load more items (pagination)
   */
  const loadMore = useCallback(async () => {
    // Prevent duplicate loads
    if (loadingMoreLock.current || !hasMore || isLoadingMore || isRefreshing) {
      return;
    }
    
    loadingMoreLock.current = true;
    setIsLoadingMore(true);
    
    try {
      const result = await fetchFeed(paramsRef.current, cursorRef.current);
      
      if (!isMountedRef.current) return;
      
      // Append new items, avoiding duplicates
      const existingIds = new Set(items.map(item => item.id));
      const uniqueNewItems = result.items.filter(item => !existingIds.has(item.id));
      
      if (uniqueNewItems.length > 0) {
        const newItems = [...items, ...uniqueNewItems];
        setItems(newItems);
        
        // Update cache with appended items
        await appendToCachedFeed(
          paramsToKey(paramsRef.current),
          uniqueNewItems,
          result.nextCursor
        );
      }
      
      setHasMore(result.hasMore);
      cursorRef.current = result.nextCursor;
    } catch (err: any) {
      console.warn('[Feed] Load more error:', err.message);
      // Don't show error for pagination failures
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
        loadingMoreLock.current = false;
      }
    }
  }, [items, hasMore, isLoadingMore, isRefreshing]);
  
  /**
   * Clear cache and refresh
   */
  const clearCache = useCallback(async () => {
    const { clearFeedCache } = await import('../utils/feedCache');
    await clearFeedCache(cacheKey);
    cursorRef.current = null;
    setItems([]);
    setHasMore(true);
    await refresh();
  }, [cacheKey, refresh]);
  
  return {
    items,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    isOffline,
    totalApprox,
    lastUpdated,
    isInitialLoad,
    refresh,
    loadMore,
    clearCache,
  };
};

/**
 * Optimized FlatList props for feed
 */
export const getFeedFlatListProps = (cardHeight: number = 200) => ({
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  windowSize: 7,
  removeClippedSubviews: true,
  updateCellsBatchingPeriod: 50,
  getItemLayout: (_: any, index: number) => ({
    length: cardHeight,
    offset: cardHeight * index,
    index,
  }),
});

/**
 * Key extractor for feed items
 */
export const feedKeyExtractor = (item: FeedItem) => item.id;

export default useInstantListingsFeed;
