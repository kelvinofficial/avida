/**
 * Seller Analytics API Service
 * Handles seller performance metrics, badges, and notifications
 */

import api from './api';

// ============ Performance Analytics ============

export interface SellerMetrics {
  listing_id: string;
  title: string;
  seller_id: string;
  period: string;
  metrics: {
    views: { total: number; change_pct: number };
    saves: { total: number; change_pct: number };
    chats: { total: number; change_pct: number };
    offers: { total: number; change_pct: number };
    shares: { total: number; change_pct: number };
  };
  conversion_rates: {
    view_to_chat: number;
    view_to_save: number;
    view_to_offer: number;
  };
  trends: Array<{ date: string; views: number; saves: number; chats: number }>;
  location_data: {
    regions: Array<{ name: string; views: number; percentage: number }>;
  };
  device_data: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
}

export interface ComparisonData {
  listing: { views: number; saves: number; chats: number; conversion_rate: number };
  seller_average: { views: number; saves: number; chats: number; conversion_rate: number };
  comparison: { views_vs_avg: number; saves_vs_avg: number; chats_vs_avg: number };
}

export interface AIInsight {
  type: 'suggestion' | 'warning' | 'opportunity' | 'success';
  title: string;
  description: string;
  priority: number;
  action_label?: string;
  action_route?: string;
  is_ai?: boolean;
}

// ============ Badges ============

export interface SellerBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  tier: 'gold' | 'silver' | 'bronze';
  criteria_text?: string;
  earned: boolean;
  earned_at: string | null;
  viewed: boolean | null;
}

export interface BadgesResponse {
  seller_id: string;
  earned_count: number;
  total_available: number;
  unviewed_count: number;
  badges: SellerBadge[];
}

// ============ Notifications ============

export interface SellerNotification {
  id: string;
  user_id: string;
  type: 'engagement_spike' | 'badge_unlock' | 'system' | string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: SellerNotification[];
  total: number;
  page: number;
  limit: number;
  unread_count: number;
  has_more: boolean;
}

// ============ API Functions ============

export const sellerAnalyticsApi = {
  getPerformance: async (listingId: string, period: string = '30d') => {
    const response = await api.get(`/analytics/listing/${listingId}/performance`, { params: { period } });
    return response.data as SellerMetrics;
  },

  getInsights: async (listingId: string) => {
    const response = await api.get(`/analytics/listing/${listingId}/insights`);
    return response.data as AIInsight[];
  },

  getComparison: async (listingId: string) => {
    const response = await api.get(`/analytics/listing/${listingId}/comparison`);
    return response.data as ComparisonData;
  },

  checkAccess: async () => {
    const response = await api.get('/analytics/access');
    return response.data;
  },
};

export const sellerBadgesApi = {
  getMyBadges: async (sellerId: string) => {
    const response = await api.get('/analytics/badges/my-badges', { params: { seller_id: sellerId } });
    return response.data as BadgesResponse;
  },

  getBadgeDefinitions: async () => {
    const response = await api.get('/analytics/badges/evaluate');
    return response.data;
  },

  markBadgesViewed: async (sellerId: string, badgeIds?: string[]) => {
    const response = await api.post('/analytics/badges/mark-viewed', {
      seller_id: sellerId,
      badge_ids: badgeIds,
    });
    return response.data;
  },

  evaluateBadges: async (sellerId: string) => {
    const response = await api.post('/analytics/badges/evaluate', { seller_id: sellerId });
    return response.data;
  },
};

export const sellerNotificationsApi = {
  getNotifications: async (userId: string, type: string = 'all', page: number = 1, limit: number = 20) => {
    const response = await api.get('/notifications/seller', {
      params: { user_id: userId, type, page, limit },
    });
    return response.data as NotificationsResponse;
  },

  markAsRead: async (notificationId: string) => {
    const response = await api.put('/notifications/seller', { notification_id: notificationId });
    return response.data;
  },

  markAllAsRead: async (userId: string) => {
    const response = await api.put('/notifications/seller', { user_id: userId, mark_all: true });
    return response.data;
  },

  registerPushToken: async (userId: string, fcmToken: string, deviceInfo?: Record<string, any>) => {
    const response = await api.post('/notifications/register-push', {
      user_id: userId,
      fcm_token: fcmToken,
      device_info: deviceInfo,
    });
    return response.data;
  },

  unregisterPushToken: async (fcmToken: string) => {
    const response = await api.delete('/notifications/register-push', {
      data: { fcm_token: fcmToken },
    });
    return response.data;
  },
};
