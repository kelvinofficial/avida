/**
 * Offline Storage Service
 * Provides caching for offline access and action queuing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  OFFLINE_LISTINGS: '@avida/offline_listings',
  OFFLINE_QUEUE: '@avida/offline_queue',
  OFFLINE_FAVORITES: '@avida/offline_favorites',
  OFFLINE_CATEGORIES: '@avida/offline_categories',
  OFFLINE_PROFILE: '@avida/offline_profile',
  LAST_SYNC: '@avida/last_sync',
  VIEWED_LISTINGS: '@avida/viewed_listings',
};

// Action types for offline queue
export type OfflineActionType = 
  | 'TOGGLE_FAVORITE'
  | 'SEND_MESSAGE'
  | 'UPDATE_PROFILE'
  | 'VIEW_LISTING'
  | 'TRACK_SEARCH';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: any;
  timestamp: number;
  retryCount: number;
}

export interface CachedListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  images: string[];
  location: string;
  category: string;
  seller: {
    id: string;
    name: string;
    avatar?: string;
  };
  cachedAt: number;
}

export interface OfflineState {
  isOnline: boolean;
  lastSyncTime: number | null;
  pendingActions: number;
  cachedListingsCount: number;
}

class OfflineStorageService {
  private static instance: OfflineStorageService;
  private syncInProgress = false;

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  // ============ LISTINGS CACHE ============
  
  async cacheListings(listings: CachedListing[]): Promise<void> {
    try {
      const existing = await this.getCachedListings();
      const merged = [...listings, ...existing];
      
      // Keep only unique listings and limit to 100 most recent
      const unique = merged.reduce((acc, listing) => {
        if (!acc.find(l => l.id === listing.id)) {
          acc.push(listing);
        }
        return acc;
      }, [] as CachedListing[]);
      
      const limited = unique
        .sort((a, b) => b.cachedAt - a.cachedAt)
        .slice(0, 100);
      
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_LISTINGS, JSON.stringify(limited));
    } catch (error) {
      console.error('Failed to cache listings:', error);
    }
  }

  async getCachedListings(): Promise<CachedListing[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_LISTINGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get cached listings:', error);
      return [];
    }
  }

  async getCachedListing(id: string): Promise<CachedListing | null> {
    try {
      const listings = await this.getCachedListings();
      return listings.find(l => l.id === id) || null;
    } catch (error) {
      console.error('Failed to get cached listing:', error);
      return null;
    }
  }

  // ============ VIEWED LISTINGS CACHE ============
  
  async addViewedListing(listing: CachedListing): Promise<void> {
    try {
      const viewed = await this.getViewedListings();
      const filtered = viewed.filter(l => l.id !== listing.id);
      const updated = [{ ...listing, cachedAt: Date.now() }, ...filtered].slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEYS.VIEWED_LISTINGS, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to add viewed listing:', error);
    }
  }

  async getViewedListings(): Promise<CachedListing[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.VIEWED_LISTINGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get viewed listings:', error);
      return [];
    }
  }

  // ============ FAVORITES CACHE ============
  
  async cacheFavorites(favoriteIds: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_FAVORITES, JSON.stringify(favoriteIds));
    } catch (error) {
      console.error('Failed to cache favorites:', error);
    }
  }

  async getCachedFavorites(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get cached favorites:', error);
      return [];
    }
  }

  // ============ CATEGORIES CACHE ============
  
  async cacheCategories(categories: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_CATEGORIES, JSON.stringify(categories));
    } catch (error) {
      console.error('Failed to cache categories:', error);
    }
  }

  async getCachedCategories(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get cached categories:', error);
      return [];
    }
  }

  // ============ USER PROFILE CACHE ============
  
  async cacheProfile(profile: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to cache profile:', error);
    }
  }

  async getCachedProfile(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached profile:', error);
      return null;
    }
  }

  // ============ OFFLINE ACTION QUEUE ============
  
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getActionQueue();
      const newAction: OfflineAction = {
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };
      queue.push(newAction);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to queue action:', error);
    }
  }

  async getActionQueue(): Promise<OfflineAction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get action queue:', error);
      return [];
    }
  }

  async removeAction(actionId: string): Promise<void> {
    try {
      const queue = await this.getActionQueue();
      const filtered = queue.filter(a => a.id !== actionId);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove action:', error);
    }
  }

  async incrementRetryCount(actionId: string): Promise<void> {
    try {
      const queue = await this.getActionQueue();
      const updated = queue.map(a => 
        a.id === actionId ? { ...a, retryCount: a.retryCount + 1 } : a
      );
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to increment retry count:', error);
    }
  }

  // ============ SYNC MANAGEMENT ============
  
  async updateLastSync(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Failed to update last sync:', error);
    }
  }

  async getLastSync(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? parseInt(data, 10) : null;
    } catch (error) {
      console.error('Failed to get last sync:', error);
      return null;
    }
  }

  async getOfflineState(): Promise<OfflineState> {
    const [lastSyncTime, queue, listings] = await Promise.all([
      this.getLastSync(),
      this.getActionQueue(),
      this.getCachedListings(),
    ]);

    return {
      isOnline: true, // Will be updated by network listener
      lastSyncTime,
      pendingActions: queue.length,
      cachedListingsCount: listings.length,
    };
  }

  // ============ CLEAR CACHE ============
  
  async clearAllCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_LISTINGS),
        AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE),
        AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_FAVORITES),
        AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_CATEGORIES),
        AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_PROFILE),
        AsyncStorage.removeItem(STORAGE_KEYS.VIEWED_LISTINGS),
      ]);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async clearOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const listings = await this.getCachedListings();
      const now = Date.now();
      const filtered = listings.filter(l => now - l.cachedAt < maxAge);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_LISTINGS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to clear old cache:', error);
    }
  }
}

export const offlineStorage = OfflineStorageService.getInstance();
export default offlineStorage;
