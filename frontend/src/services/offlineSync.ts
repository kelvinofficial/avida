/**
 * Offline Sync Service
 * Handles syncing offline actions when connection is restored
 */

import { api } from '../utils/api';
import { offlineStorage, OfflineAction } from './offlineStorage';

const MAX_RETRY_COUNT = 3;

class OfflineSyncService {
  private static instance: OfflineSyncService;
  private isSyncing = false;

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  async syncPendingActions(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let success = 0;
    let failed = 0;

    try {
      const queue = await offlineStorage.getActionQueue();
      
      for (const action of queue) {
        try {
          await this.processAction(action);
          await offlineStorage.removeAction(action.id);
          success++;
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          
          if (action.retryCount >= MAX_RETRY_COUNT) {
            // Remove action after max retries
            await offlineStorage.removeAction(action.id);
            failed++;
          } else {
            await offlineStorage.incrementRetryCount(action.id);
          }
        }
      }

      if (success > 0) {
        await offlineStorage.updateLastSync();
      }
    } finally {
      this.isSyncing = false;
    }

    return { success, failed };
  }

  private async processAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'TOGGLE_FAVORITE':
        await this.syncToggleFavorite(action.payload);
        break;
      case 'SEND_MESSAGE':
        await this.syncSendMessage(action.payload);
        break;
      case 'VIEW_LISTING':
        await this.syncViewListing(action.payload);
        break;
      case 'TRACK_SEARCH':
        await this.syncTrackSearch(action.payload);
        break;
      case 'UPDATE_PROFILE':
        await this.syncUpdateProfile(action.payload);
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  private async syncToggleFavorite(payload: { listingId: string; isFavorite: boolean }): Promise<void> {
    if (payload.isFavorite) {
      await api.post(`/favorites/${payload.listingId}`);
    } else {
      await api.delete(`/favorites/${payload.listingId}`);
    }
  }

  private async syncSendMessage(payload: { conversationId: string; message: string }): Promise<void> {
    await api.post(`/messages/${payload.conversationId}`, { content: payload.message });
  }

  private async syncViewListing(payload: { listingId: string }): Promise<void> {
    await api.post(`/listings/${payload.listingId}/view`);
  }

  private async syncTrackSearch(payload: { query: string; category?: string }): Promise<void> {
    await api.post('/searches/track', payload);
  }

  private async syncUpdateProfile(payload: any): Promise<void> {
    await api.put('/users/profile', payload);
  }

  /**
   * Bulk sync using the new backend endpoint
   * This is more efficient for syncing multiple actions
   */
  async bulkSync(deviceId: string): Promise<{
    synced: number;
    failed: number;
    conflicts: number;
    pendingUpdates: any[];
  }> {
    if (this.isSyncing) {
      return { synced: 0, failed: 0, conflicts: 0, pendingUpdates: [] };
    }

    this.isSyncing = true;

    try {
      const queue = await offlineStorage.getActionQueue();
      const lastSync = await offlineStorage.getLastSync();

      if (queue.length === 0) {
        return { synced: 0, failed: 0, conflicts: 0, pendingUpdates: [] };
      }

      // Transform actions to backend format
      const actions = queue.map(action => ({
        client_id: action.id,
        action_type: this.mapActionType(action.type),
        payload: action.payload,
        created_at: new Date(action.timestamp).toISOString(),
        retry_count: action.retryCount
      }));

      const response = await api.post('/offline/sync', {
        device_id: deviceId,
        actions,
        last_sync_timestamp: lastSync ? new Date(lastSync).toISOString() : null
      });

      const { synced_count, failed_count, conflict_count, results, server_timestamp, pending_updates } = response.data;

      // Process results - remove successfully synced actions
      for (const result of results) {
        if (result.success) {
          await offlineStorage.removeAction(result.client_id);
          
          // If it's a listing creation, store the server ID mapping
          if (result.server_id) {
            await offlineStorage.mapClientToServerId(result.client_id, result.server_id);
          }
        } else if (result.conflict) {
          // Handle conflict - for now, server wins
          await offlineStorage.removeAction(result.client_id);
          console.warn(`Conflict for action ${result.client_id}:`, result.resolved_data);
        }
      }

      // Update last sync time
      if (synced_count > 0) {
        await offlineStorage.setLastSync(new Date(server_timestamp).getTime());
      }

      // Process pending updates from server
      if (pending_updates && pending_updates.length > 0) {
        await this.processPendingUpdates(pending_updates);
      }

      return {
        synced: synced_count,
        failed: failed_count,
        conflicts: conflict_count,
        pendingUpdates: pending_updates || []
      };
    } catch (error) {
      console.error('Bulk sync failed:', error);
      // Fall back to individual sync
      return await this.syncPendingActions().then(r => ({
        synced: r.success,
        failed: r.failed,
        conflicts: 0,
        pendingUpdates: []
      }));
    } finally {
      this.isSyncing = false;
    }
  }

  private mapActionType(type: string): string {
    const mapping: Record<string, string> = {
      'TOGGLE_FAVORITE': 'toggle_favorite',
      'SEND_MESSAGE': 'send_message',
      'VIEW_LISTING': 'view_listing',
      'TRACK_SEARCH': 'track_search',
      'UPDATE_PROFILE': 'update_profile',
      'CREATE_LISTING': 'create_listing',
      'UPDATE_LISTING': 'update_listing',
      'DELETE_LISTING': 'delete_listing'
    };
    return mapping[type] || type.toLowerCase();
  }

  private async processPendingUpdates(updates: any[]): Promise<void> {
    for (const update of updates) {
      try {
        switch (update.type) {
          case 'listing_updated':
            // Update local cache with server data
            await offlineStorage.updateCachedListing(update.data);
            break;
          case 'message_received':
            // Store new message in local storage
            await offlineStorage.cacheMessage(update.data);
            break;
          case 'listing_favorited':
            // Update favorites count or notify user
            console.log('Listing favorited:', update.data);
            break;
        }
      } catch (error) {
        console.error('Failed to process pending update:', error);
      }
    }
  }

  /**
   * Refresh local cache with fresh data from server
   */
  async refreshCache(options: {
    includeListings?: boolean;
    includeCategories?: boolean;
    includeFavorites?: boolean;
    includeMessages?: boolean;
    listingLimit?: number;
  } = {}): Promise<void> {
    try {
      const lastSync = await offlineStorage.getLastSync();
      
      const response = await api.post('/offline/cache-refresh', {
        last_sync: lastSync ? new Date(lastSync).toISOString() : null,
        include_listings: options.includeListings ?? true,
        include_categories: options.includeCategories ?? true,
        include_favorites: options.includeFavorites ?? true,
        include_messages: options.includeMessages ?? false,
        listing_limit: options.listingLimit ?? 100
      });

      const { listings, categories, favorites, conversations, profile, timestamp } = response.data;

      // Cache all the data
      if (listings) {
        await offlineStorage.cacheListings(listings.map((l: any) => ({
          ...l,
          cachedAt: Date.now()
        })));
      }

      if (categories) {
        await offlineStorage.cacheCategories(categories);
      }

      if (favorites) {
        await offlineStorage.cacheFavorites(favorites);
      }

      if (conversations) {
        await offlineStorage.cacheConversations(conversations);
      }

      if (profile) {
        await offlineStorage.cacheProfile(profile);
      }

      await offlineStorage.setLastSync(new Date(timestamp).getTime());
    } catch (error) {
      console.error('Failed to refresh cache:', error);
    }
  }
}

export const offlineSync = OfflineSyncService.getInstance();
export default offlineSync;
