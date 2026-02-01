// User Settings Types

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  messages: boolean;
  offers: boolean;
  price_drops: boolean;
  saved_searches: boolean;
  better_deals: boolean;
  system_alerts: boolean;
}

export interface QuietHours {
  enabled: boolean;
  start_time: string;
  end_time: string;
}

export interface AlertPreferences {
  frequency: 'instant' | 'daily' | 'weekly';
  categories: string[];
  radius_km: number;
  price_threshold_percent: number;
}

export interface PrivacySettings {
  location_services: boolean;
  show_online_status: boolean;
  show_last_seen: boolean;
  allow_profile_discovery: boolean;
  allow_direct_messages: boolean;
}

export interface AppPreferences {
  language: string;
  currency: string;
  dark_mode: 'system' | 'light' | 'dark';
  auto_download_media: boolean;
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  app_lock_enabled: boolean;
  app_lock_type: 'pin' | 'biometric' | null;
}

export interface UserSettings {
  user_id: string;
  notifications: NotificationSettings;
  quiet_hours: QuietHours;
  alert_preferences: AlertPreferences;
  privacy: PrivacySettings;
  app_preferences: AppPreferences;
  security: SecuritySettings;
  push_token?: string;
  created_at: string;
  updated_at: string;
}

// Notification Types
export type NotificationType = 
  | 'chat_message'
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'price_drop'
  | 'saved_search_match'
  | 'better_deal'
  | 'seller_response'
  | 'security_alert'
  | 'system_announcement'
  | 'listing_sold'
  | 'listing_expired'
  | 'new_follower';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data_payload: Record<string, any>;
  read: boolean;
  pushed: boolean;
  emailed: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
  page: number;
  limit: number;
}

// Blocked Users
export interface BlockedUser {
  id: string;
  blocked_user_id: string;
  name: string;
  picture?: string;
  reason?: string;
  created_at: string;
}

// Active Sessions
export interface ActiveSession {
  id: string;
  device_name: string;
  device_type: 'mobile' | 'tablet' | 'desktop' | 'web' | 'unknown';
  ip_address?: string;
  location?: string;
  last_active: string;
  created_at: string;
  is_current: boolean;
}

// User Stats
export interface UserStats {
  active_listings: number;
  sold_listings: number;
  total_favorites: number;
  total_views: number;
  purchases: number;
  sales_count: number;
}

// Profile with Stats
export interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  phone?: string;
  location?: string;
  bio?: string;
  verified: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  rating: number;
  total_ratings: number;
  created_at: string;
  stats: UserStats;
}

// Public Profile
export interface PublicProfile {
  user_id: string;
  name: string;
  picture?: string;
  location?: string;
  bio?: string;
  verified: boolean;
  rating: number;
  total_ratings: number;
  created_at: string;
  stats: {
    active_listings: number;
    sold_listings: number;
  };
  online_status: boolean;
  last_seen?: string;
}
