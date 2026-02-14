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
  | 'TRACK_SEARCH'
  | 'CREATE_LISTING'
  | 'UPDATE_LISTING'
  | 'DELETE_LISTING';

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

  // ============ ENHANCED CACHE METHODS ============

  async setLastSync(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
    } catch (error) {
      console.error('Failed to set last sync:', error);
    }
  }

  async mapClientToServerId(clientId: string, serverId: string): Promise<void> {
    try {
      const key = `@avida/id_mapping_${clientId}`;
      await AsyncStorage.setItem(key, serverId);
    } catch (error) {
      console.error('Failed to map client to server ID:', error);
    }
  }

  async getServerIdForClient(clientId: string): Promise<string | null> {
    try {
      const key = `@avida/id_mapping_${clientId}`;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get server ID for client:', error);
      return null;
    }
  }

  async updateCachedListing(listing: any): Promise<void> {
    try {
      const listings = await this.getCachedListings();
      const index = listings.findIndex(l => l.id === listing.id);
      
      if (index !== -1) {
        listings[index] = { ...listing, cachedAt: Date.now() };
      } else {
        listings.unshift({ ...listing, cachedAt: Date.now() });
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_LISTINGS, JSON.stringify(listings.slice(0, 100)));
    } catch (error) {
      console.error('Failed to update cached listing:', error);
    }
  }

  async cacheMessage(message: any): Promise<void> {
    try {
      const key = `@avida/messages_${message.conversation_id}`;
      const existing = await AsyncStorage.getItem(key);
      const messages = existing ? JSON.parse(existing) : [];
      
      // Add message if not already exists
      if (!messages.find((m: any) => m.id === message.id)) {
        messages.push(message);
        await AsyncStorage.setItem(key, JSON.stringify(messages.slice(-100))); // Keep last 100
      }
    } catch (error) {
      console.error('Failed to cache message:', error);
    }
  }

  async cacheConversations(conversations: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem('@avida/conversations', JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to cache conversations:', error);
    }
  }

  async getCachedConversations(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('@avida/conversations');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get cached conversations:', error);
      return [];
    }
  }

  // ============ OFFLINE LISTING CREATION ============

  async queueListingCreation(listingData: {
    title: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    subcategory?: string;
    condition?: string;
    images?: string[];
    location?: any;
    attributes?: any;
  }): Promise<string> {
    const clientId = `offline_lst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const action: OfflineAction = {
      id: clientId,
      type: 'CREATE_LISTING' as OfflineActionType,
      payload: listingData,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    await this.queueAction(action);
    
    // Also cache it locally for immediate display
    const cachedListing: CachedListing = {
      id: clientId,
      title: listingData.title,
      price: listingData.price,
      currency: listingData.currency,
      images: listingData.images || [],
      location: listingData.location?.city || 'Local',
      category: listingData.category,
      seller: {
        id: 'self',
        name: 'You (Pending)',
      },
      cachedAt: Date.now()
    };
    
    await this.cacheListings([cachedListing]);
    
    return clientId;
  }

  async queueListingUpdate(listingId: string, updates: any): Promise<void> {
    const action: OfflineAction = {
      id: `offline_upd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'UPDATE_LISTING' as OfflineActionType,
      payload: { listing_id: listingId, updates },
      timestamp: Date.now(),
      retryCount: 0
    };
    
    await this.queueAction(action);
  }

  async queueListingDeletion(listingId: string): Promise<void> {
    const action: OfflineAction = {
      id: `offline_del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'DELETE_LISTING' as OfflineActionType,
      payload: { listing_id: listingId },
      timestamp: Date.now(),
      retryCount: 0
    };
    
    await this.queueAction(action);
    
    // Remove from local cache
    const listings = await this.getCachedListings();
    const filtered = listings.filter(l => l.id !== listingId);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_LISTINGS, JSON.stringify(filtered));
  }

  async queueMessage(data: {
    conversationId?: string;
    recipientId?: string;
    listingId?: string;
    content: string;
  }): Promise<string> {
    const clientId = `offline_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const action: OfflineAction = {
      id: clientId,
      type: 'SEND_MESSAGE' as OfflineActionType,
      payload: {
        conversation_id: data.conversationId,
        recipient_id: data.recipientId,
        listing_id: data.listingId,
        content: data.content
      },
      timestamp: Date.now(),
      retryCount: 0
    };
    
    await this.queueAction(action);
    
    return clientId;
  }

  // ============ OFFLINE STATE ============

  async getOfflineState(): Promise<{
    isOnline: boolean;
    lastSyncTime: number | null;
    pendingActions: number;
    cachedListingsCount: number;
  }> {
    const [lastSync, queue, listings] = await Promise.all([
      this.getLastSync(),
      this.getActionQueue(),
      this.getCachedListings()
    ]);

    return {
      isOnline: true, // This should be determined by NetInfo in the hook
      lastSyncTime: lastSync,
      pendingActions: queue.length,
      cachedListingsCount: listings.length
    };
  }
}

export const offlineStorage = OfflineStorageService.getInstance();
export default offlineStorage;
