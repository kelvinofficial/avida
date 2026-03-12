/**
 * useInstantListingsFeed Hook — Invisible Prefetch System
 * 
 * Architecture inspired by TikTok / Instagram / Facebook Marketplace:
 * 
 * Tier 1 (Instant):     Load 7 listings — user sees these immediately (<200ms)
 * Tier 2 (Prefetch):    Items 8–40 fetched silently right after first paint
 * Tier 3 (Background):  Items 41–60 fetched as user scrolls into prefetched zone
 * 
 * Result: User perceives zero loading after the initial 7 items.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
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

// ── Prefetch tier configuration ─────────────────────────────────────
const TIER1_LIMIT = 7;   // Instant: first paint
const TIER2_LIMIT = 33;  // Prefetch: items 8–40
const TIER3_LIMIT = 20;  // Background: items 41–60
const PREFETCH_DELAY_MS = 100; // Delay before Tier 2 starts (let Tier 1 render)

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
 * Fetch feed from API with configurable limit
 */
const fetchFeed = async (
  params: FeedParams,
  cursor?: string | null,
  limitOverride?: number,
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
  queryParams.append('limit', String(limitOverride || params.limit || 20));
  
  const url = `${API_URL}/api/feed/listings?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
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
 * Main hook for instant listings feed with invisible prefetch
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
  const prefetchInFlightRef = useRef(false);
  const tier2DoneRef = useRef(false);
  const tier3DoneRef = useRef(false);
  
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
  
  // ── Reset prefetch state when params change ──
  useEffect(() => {
    tier2DoneRef.current = false;
    tier3DoneRef.current = false;
    prefetchInFlightRef.current = false;
  }, [cacheKey]);

  /**
   * Tier 2: Invisible prefetch — called right after Tier 1 renders
   */
  const runTier2Prefetch = useCallback(async (afterCursor: string | null) => {
    if (tier2DoneRef.current || prefetchInFlightRef.current || !isMountedRef.current) return;
    prefetchInFlightRef.current = true;
    
    try {
      const result = await fetchFeed(paramsRef.current, afterCursor, TIER2_LIMIT);
      
      if (!isMountedRef.current) return;
      
      setItems(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const unique = result.items.filter(i => !existingIds.has(i.id));
        return unique.length > 0 ? [...prev, ...unique] : prev;
      });
      
      cursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
      tier2DoneRef.current = true;
      
      // Update cache with combined items
      setItems(current => {
        appendToCachedFeed(paramsToKey(paramsRef.current), result.items, result.nextCursor);
        return current;
      });
    } catch (err: any) {
      console.warn('[Prefetch T2] Error:', err.message);
    } finally {
      prefetchInFlightRef.current = false;
    }
  }, []);

  /**
   * Tier 3: Background fetch — called when user scrolls deep
   */
  const runTier3Background = useCallback(async () => {
    if (tier3DoneRef.current || prefetchInFlightRef.current || !isMountedRef.current || !cursorRef.current) return;
    prefetchInFlightRef.current = true;
    
    try {
      const result = await fetchFeed(paramsRef.current, cursorRef.current, TIER3_LIMIT);
      
      if (!isMountedRef.current) return;
      
      setItems(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const unique = result.items.filter(i => !existingIds.has(i.id));
        return unique.length > 0 ? [...prev, ...unique] : prev;
      });
      
      cursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
      tier3DoneRef.current = true;
      
      appendToCachedFeed(paramsToKey(paramsRef.current), result.items, result.nextCursor);
    } catch (err: any) {
      console.warn('[Prefetch T3] Error:', err.message);
    } finally {
      prefetchInFlightRef.current = false;
    }
  }, []);
  
  /**
   * Load cached data immediately, then run tiered fetches
   */
  useEffect(() => {
    let cancelled = false;
    
    const boot = async () => {
      // 1. Try cache first for instant render
      const cached = await preloadCache(cacheKey);
      
      if (cancelled || !isMountedRef.current) return;
      
      if (cached && cached.items.length > 0) {
        setItems(cached.items);
        setTotalApprox(cached.total);
        setLastUpdated(cached.updatedAt);
        cursorRef.current = cached.nextCursor;
        setHasMore(!!cached.nextCursor);
        setIsInitialLoad(false);
        
        // If cache is stale, run a full refresh in background
        if (isCacheStale(cached)) {
          runTieredFetch();
        }
        return;
      }
      
      // 2. No cache — run tiered fetch from scratch
      await runTieredFetch();
    };
    
    const runTieredFetch = async () => {
      if (cancelled) return;
      setError(null);
      
      try {
        // ── Tier 1: Fetch 7 items for instant first paint ──
        const t1 = await fetchFeed(paramsRef.current, null, TIER1_LIMIT);
        
        if (cancelled || !isMountedRef.current) return;
        
        setItems(t1.items);
        setTotalApprox(t1.totalApprox);
        setHasMore(t1.hasMore);
        cursorRef.current = t1.nextCursor;
        setIsInitialLoad(false);
        setLastUpdated(new Date().toISOString());
        
        // Cache Tier 1 result
        await setCachedFeed(paramsToKey(paramsRef.current), t1.items, t1.nextCursor, t1.totalApprox);
        
        // ── Tier 2: Prefetch 8–40 after a tiny delay (let Tier 1 render first) ──
        if (t1.hasMore && t1.nextCursor) {
          setTimeout(() => {
            if (!cancelled && isMountedRef.current) {
              runTier2Prefetch(t1.nextCursor);
            }
          }, PREFETCH_DELAY_MS);
        }
      } catch (err: any) {
        if (cancelled || !isMountedRef.current) return;
        setIsInitialLoad(false);
        if (items.length === 0) {
          setError(err.message || 'Failed to load listings');
        }
        console.warn('[Feed] Tier 1 error:', err.message);
      }
    };
    
    boot();
    
    return () => { cancelled = true; };
  }, [cacheKey]);
  
  /**
   * Monitor network status (native only)
   */
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    let unsubscribe: (() => void) | null = null;
    
    const setupNetInfo = async () => {
      try {
        const NetInfo = require('@react-native-community/netinfo').default;
        unsubscribe = NetInfo.addEventListener((state: any) => {
          if (isMountedRef.current) setIsOffline(!state.isConnected);
        });
      } catch {}
    };
    
    setupNetInfo();
    return () => { try { unsubscribe?.(); } catch {} };
  }, []);
  
  /**
   * Refresh when app comes to foreground
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && items.length > 0) {
        backgroundRefresh();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => { subscription.remove(); };
  }, [items.length]);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  
  /**
   * Background refresh — silently replaces data without blocking UI
   */
  const backgroundRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsRefreshing(true);
    setError(null);
    
    // Reset prefetch tiers for fresh data
    tier2DoneRef.current = false;
    tier3DoneRef.current = false;
    
    try {
      // Fetch Tier 1 fresh
      const result = await fetchFeed(paramsRef.current, null, TIER1_LIMIT);
      if (!isMountedRef.current) return;
      
      const mergedItems = items.length > 0
        ? mergeFeedItems(items, result.items)
        : result.items;
      
      setItems(mergedItems);
      setTotalApprox(result.totalApprox);
      setHasMore(result.hasMore);
      cursorRef.current = result.nextCursor;
      setLastUpdated(new Date().toISOString());
      
      await setCachedFeed(paramsToKey(paramsRef.current), mergedItems, result.nextCursor, result.totalApprox);
      
      // Kick off Tier 2 prefetch
      if (result.hasMore && result.nextCursor) {
        setTimeout(() => {
          if (isMountedRef.current) runTier2Prefetch(result.nextCursor);
        }, PREFETCH_DELAY_MS);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (items.length === 0) setError(err.message || 'Failed to load listings');
    } finally {
      if (isMountedRef.current) setIsRefreshing(false);
    }
  }, [items, runTier2Prefetch]);
  
  /**
   * Manual refresh (pull-to-refresh) — full reset + tiered refetch
   */
  const refresh = useCallback(async () => {
    cursorRef.current = null;
    setHasMore(true);
    tier2DoneRef.current = false;
    tier3DoneRef.current = false;
    await backgroundRefresh();
  }, [backgroundRefresh]);
  
  /**
   * Load more items (pagination beyond Tier 3)
   * Also triggers Tier 3 if not yet done.
   */
  const loadMore = useCallback(async () => {
    // If Tier 3 hasn't run yet, run it now (invisible to user)
    if (!tier3DoneRef.current && tier2DoneRef.current) {
      await runTier3Background();
      return;
    }
    
    // Standard pagination beyond the 3 tiers
    if (loadingMoreLock.current || !hasMore || isLoadingMore || isRefreshing) return;
    
    loadingMoreLock.current = true;
    setIsLoadingMore(true);
    
    try {
      const result = await fetchFeed(paramsRef.current, cursorRef.current, TIER3_LIMIT);
      if (!isMountedRef.current) return;
      
      const existingIds = new Set(items.map(item => item.id));
      const uniqueNewItems = result.items.filter(item => !existingIds.has(item.id));
      
      if (uniqueNewItems.length > 0) {
        const newItems = [...items, ...uniqueNewItems];
        setItems(newItems);
        await appendToCachedFeed(paramsToKey(paramsRef.current), uniqueNewItems, result.nextCursor);
      }
      
      setHasMore(result.hasMore);
      cursorRef.current = result.nextCursor;
    } catch (err: any) {
      console.warn('[Feed] Load more error:', err.message);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
        loadingMoreLock.current = false;
      }
    }
  }, [items, hasMore, isLoadingMore, isRefreshing, runTier3Background]);
  
  /**
   * Clear cache and refresh
   */
  const clearCache = useCallback(async () => {
    const { clearFeedCache } = await import('../utils/feedCache');
    await clearFeedCache(cacheKey);
    cursorRef.current = null;
    setItems([]);
    setHasMore(true);
    tier2DoneRef.current = false;
    tier3DoneRef.current = false;
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
 * Optimized FlatList props for the prefetch system
 * 
 * Key insight: Tier 1 renders 7 items. Tier 2 is already in memory by the time
 * user scrolls. We set onEndReachedThreshold high (0.7) so Tier 3 triggers
 * early — before the user reaches the end of prefetched content.
 */
export const getFeedFlatListProps = (cardHeight: number = 200) => ({
  initialNumToRender: 4,          // Render 4 rows instantly (covers ~7 items in 2-col grid)
  maxToRenderPerBatch: 8,         // Bigger batches since Tier 2 data is already in state
  windowSize: 7,                  // Keep 7 screens in memory (covers prefetched items)
  removeClippedSubviews: true,    // Remove off-screen views for memory
  updateCellsBatchingPeriod: 30,  // Fast batch updates
  getItemLayout: (_: any, index: number) => ({
    length: cardHeight,
    offset: cardHeight * index,
    index,
  }),
  keyboardShouldPersistTaps: 'handled' as const,
  scrollEventThrottle: 16,        // 60fps
  extraData: undefined,
});

/**
 * Key extractor for feed items
 */
export const feedKeyExtractor = (item: FeedItem) => item.id;

export default useInstantListingsFeed;
