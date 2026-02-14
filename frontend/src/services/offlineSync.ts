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
}

export const offlineSync = OfflineSyncService.getInstance();
export default offlineSync;
