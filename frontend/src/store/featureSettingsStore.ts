import { create } from 'zustand';

// Helper to get API URL at runtime
const getApiUrl = () => process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Feature settings interface matching backend response
export interface FeatureSettings {
  show_view_count: boolean;
  show_save_count: boolean;
  show_listing_stats: boolean;
  show_seller_stats: boolean;
  show_distance: boolean;
  show_time_ago: boolean;
  show_negotiable_badge: boolean;
  show_featured_badge: boolean;
  location_mode: 'region' | 'district' | 'city';
  default_country: string;
  allow_country_change: boolean;
  currency: string;
  currency_symbol: string;
  currency_position: 'before' | 'after';
  updated_at?: string;
}

// Default settings (used as fallback)
const DEFAULT_SETTINGS: FeatureSettings = {
  show_view_count: true,
  show_save_count: true,
  show_listing_stats: true,
  show_seller_stats: true,
  show_distance: true,
  show_time_ago: true,
  show_negotiable_badge: true,
  show_featured_badge: true,
  location_mode: 'region',
  default_country: 'TZ',
  allow_country_change: false,
  currency: 'TZS',
  currency_symbol: 'TSh',
  currency_position: 'before',
};

interface FeatureSettingsState {
  settings: FeatureSettings;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchSettings: () => Promise<void>;
  
  // Helper getters
  shouldShowViewCount: () => boolean;
  shouldShowSaveCount: () => boolean;
  shouldShowDistance: () => boolean;
  shouldShowTimeAgo: () => boolean;
  shouldShowNegotiableBadge: () => boolean;
  shouldShowFeaturedBadge: () => boolean;
  formatPrice: (price: number) => string;
}

// Cache duration: 0 seconds (force fresh fetch every time for testing)
const CACHE_DURATION = 0;

export const useFeatureSettingsStore = create<FeatureSettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchSettings: async () => {
    const state = get();
    
    // Don't fetch if already loading
    if (state.isLoading) return;
    
    // Check cache - don't refetch if recently fetched
    if (state.lastFetched && Date.now() - state.lastFetched < CACHE_DURATION) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${getApiUrl()}/api/feature-settings`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch feature settings');
      }

      const data = await response.json();
      console.log('[FeatureSettingsStore] Received data:', JSON.stringify(data));
      console.log('[FeatureSettingsStore] location_mode:', data.location_mode);
      
      const newSettings = { ...DEFAULT_SETTINGS, ...data };
      console.log('[FeatureSettingsStore] New settings:', JSON.stringify(newSettings));
      
      set({
        settings: newSettings,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching feature settings:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        // Keep default settings on error
      });
    }
  },

  // Helper methods for common checks
  shouldShowViewCount: () => get().settings.show_view_count,
  shouldShowSaveCount: () => get().settings.show_save_count,
  shouldShowDistance: () => get().settings.show_distance,
  shouldShowTimeAgo: () => get().settings.show_time_ago,
  shouldShowNegotiableBadge: () => get().settings.show_negotiable_badge,
  shouldShowFeaturedBadge: () => get().settings.show_featured_badge,

  formatPrice: (price: number) => {
    const { currency_symbol, currency_position } = get().settings;
    const formattedNumber = price.toLocaleString();
    
    if (currency_position === 'before') {
      return `${currency_symbol} ${formattedNumber}`;
    }
    return `${formattedNumber} ${currency_symbol}`;
  },
}));

// Export a hook for easy initialization
export const useInitializeFeatureSettings = () => {
  const fetchSettings = useFeatureSettingsStore(state => state.fetchSettings);
  return fetchSettings;
};
