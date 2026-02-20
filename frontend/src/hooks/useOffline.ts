/**
 * useOffline Hook
 * Manages offline state and provides offline-aware actions
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { offlineStorage, CachedListing, OfflineState } from '../services/offlineStorage';
import { offlineSync } from '../services/offlineSync';

interface UseOfflineReturn {
  // State
  isOnline: boolean;
  offlineState: OfflineState | null;
  isOfflineMode: boolean;
  
  // Cache actions
  cacheListings: (listings: any[]) => Promise<void>;
  getCachedListings: () => Promise<CachedListing[]>;
  addViewedListing: (listing: any) => Promise<void>;
  getViewedListings: () => Promise<CachedListing[]>;
  
  // Offline-aware actions
  queueFavoriteToggle: (listingId: string, isFavorite: boolean) => Promise<void>;
  queueMessage: (conversationId: string, message: string) => Promise<void>;
  
  // Sync
  syncPendingActions: () => Promise<{ success: number; failed: number }>;
  
  // Cache management
  clearCache: () => Promise<void>;
}

export const useOffline = (): UseOfflineReturn => {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineState, setOfflineState] = useState<OfflineState | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Listen to network changes (only on native platforms)
  useEffect(() => {
    // Skip NetInfo on web - it causes abort errors
    if (Platform.OS === 'web') {
      setIsOnline(true);
      loadOfflineState();
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    const setupNetInfo = async () => {
      try {
        const NetInfo = require('@react-native-community/netinfo').default;
        
        unsubscribe = NetInfo.addEventListener((state: any) => {
          const online = state.isConnected && state.isInternetReachable !== false;
          setIsOnline(online ?? true);
          setIsOfflineMode(!online);
          
          // Sync pending actions when coming back online
          if (online) {
            syncPendingActions();
          }
        });

        // Initial check
        const state = await NetInfo.fetch();
        const online = state.isConnected && state.isInternetReachable !== false;
        setIsOnline(online ?? true);
        setIsOfflineMode(!online);
      } catch (error) {
        // NetInfo may throw on some platforms, ignore silently
      }
    };
    
    setupNetInfo();
    loadOfflineState();

    return () => {
      try {
        if (unsubscribe) {
          unsubscribe();
        }
      } catch (error) {
        // Ignore abort errors during cleanup
      }
    };
  }, []);

  const loadOfflineState = async () => {
    const state = await offlineStorage.getOfflineState();
    setOfflineState({ ...state, isOnline });
  };

  // Cache listings for offline access
  const cacheListings = useCallback(async (listings: any[]) => {
    const cached: CachedListing[] = listings.map(l => ({
      id: l._id || l.id,
      title: l.title,
      price: l.price,
      currency: l.currency || 'EUR',
      images: l.images || [],
      location: l.location?.city_name || l.city || 'Unknown',
      category: l.category,
      seller: {
        id: l.seller_id || l.user_id,
        name: l.seller_name || 'Seller',
        avatar: l.seller_avatar,
      },
      cachedAt: Date.now(),
    }));
    await offlineStorage.cacheListings(cached);
    await loadOfflineState();
  }, []);

  const getCachedListings = useCallback(async () => {
    return offlineStorage.getCachedListings();
  }, []);

  const addViewedListing = useCallback(async (listing: any) => {
    const cached: CachedListing = {
      id: listing._id || listing.id,
      title: listing.title,
      price: listing.price,
      currency: listing.currency || 'EUR',
      images: listing.images || [],
      location: listing.location?.city_name || listing.city || 'Unknown',
      category: listing.category,
      seller: {
        id: listing.seller_id || listing.user_id,
        name: listing.seller_name || 'Seller',
        avatar: listing.seller_avatar,
      },
      cachedAt: Date.now(),
    };
    await offlineStorage.addViewedListing(cached);
  }, []);

  const getViewedListings = useCallback(async () => {
    return offlineStorage.getViewedListings();
  }, []);

  // Queue favorite toggle for offline sync
  const queueFavoriteToggle = useCallback(async (listingId: string, isFavorite: boolean) => {
    if (!isOnline) {
      await offlineStorage.queueAction({
        type: 'TOGGLE_FAVORITE',
        payload: { listingId, isFavorite },
      });
      await loadOfflineState();
    }
  }, [isOnline]);

  // Queue message for offline sync
  const queueMessage = useCallback(async (conversationId: string, message: string) => {
    if (!isOnline) {
      await offlineStorage.queueAction({
        type: 'SEND_MESSAGE',
        payload: { conversationId, message },
      });
      await loadOfflineState();
    }
  }, [isOnline]);

  // Sync pending actions
  const syncPendingActions = useCallback(async () => {
    const result = await offlineSync.syncPendingActions();
    await loadOfflineState();
    return result;
  }, []);

  // Clear all cache
  const clearCache = useCallback(async () => {
    await offlineStorage.clearAllCache();
    await loadOfflineState();
  }, []);

  return {
    isOnline,
    offlineState,
    isOfflineMode,
    cacheListings,
    getCachedListings,
    addViewedListing,
    getViewedListings,
    queueFavoriteToggle,
    queueMessage,
    syncPendingActions,
    clearCache,
  };
};

export default useOffline;
