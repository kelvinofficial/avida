import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { useResponsive } from '../../src/hooks/useResponsive';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
};

interface AnalyticsData {
  platform: {
    total_users: number;
    new_users_today: number;
    new_users_week: number;
    active_users: number;
    total_listings: number;
    active_listings: number;
    total_transactions: number;
    total_revenue: number;
  };
  sellers: {
    top_sellers: Array<{
      user_id: string;
      name: string;
      revenue: number;
      sales_count: number;
    }>;
    active_sellers_count: number;
    new_sellers_week: number;
  };
  engagement: {
    total_messages: number;
    messages_today: number;
    total_favorites: number;
    badge_awards_count: number;
    challenge_completions: number;
  };
}

const defaultAnalytics: AnalyticsData = {
  platform: {
    total_users: 0,
    new_users_today: 0,
    new_users_week: 0,
    active_users: 0,
    total_listings: 0,
    active_listings: 0,
    total_transactions: 0,
    total_revenue: 0,
  },
  sellers: {
    top_sellers: [],
    active_sellers_count: 0,
    new_sellers_week: 0,
  },
  engagement: {
    total_messages: 0,
    messages_today: 0,
    total_favorites: 0,
    badge_awards_count: 0,
    challenge_completions: 0,
  },
};

type TabType = 'overview' | 'sellers' | 'engagement' | 'searches';

interface SearchAnalyticsData {
  total_searches: number;
  top_searches: Array<{ query: string; count: number }>;
  by_country: Array<{ country_code: string; country_name: string; search_count: number; unique_query_count: number }>;
  by_region: Array<{ region_code: string; region_name: string; search_count: number; unique_query_count: number }>;
  by_city: Array<{ city_code: string; city_name: string; search_count: number; unique_query_count: number }>;
  by_category: Array<{ category_id: string; search_count: number; unique_query_count: number }>;
  recent_activity: Array<{ date: string; search_count: number; unique_query_count: number }>;
}

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { isAuthenticated } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData>(defaultAnalytics);
  const [searchAnalytics, setSearchAnalytics] = useState<SearchAnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthError(true);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchAnalytics = useCallback(async (refresh: boolean = false) => {
    if (!isAuthenticated) {
      setAuthError(true);
      return;
    }
    
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setAuthError(false);

      const [platformRes, sellersRes, engagementRes, searchRes] = await Promise.all([
        api.get('/admin/analytics/platform').catch((err) => {
          if (err.response?.status === 401) setAuthError(true);
          return { data: defaultAnalytics.platform };
        }),
        api.get('/admin/analytics/sellers').catch((err) => {
          if (err.response?.status === 401) setAuthError(true);
          return { data: defaultAnalytics.sellers };
        }),
        api.get('/admin/analytics/engagement').catch((err) => {
          if (err.response?.status === 401) setAuthError(true);
          return { data: defaultAnalytics.engagement };
        }),
        api.get('/admin/search-analytics?days=30').catch((err) => {
          console.log('Search analytics fetch error:', err);
          return { data: null };
        }),
      ]);

      setAnalytics({
        platform: platformRes.data || defaultAnalytics.platform,
        sellers: sellersRes.data || defaultAnalytics.sellers,
        engagement: engagementRes.data || defaultAnalytics.engagement,
      });
      
      if (searchRes.data) {
        setSearchAnalytics(searchRes.data);
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      if (error.response?.status === 401) {
        setAuthError(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const openAdminDashboard = () => {
    const url = Platform.OS === 'web' 
      ? '/api/admin-ui/dashboard/analytics'
      : 'https://mobile-classifieds.preview.emergentagent.com/api/admin-ui/dashboard/analytics';
    Linking.openURL(url);
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: string,
    color: string,
    bgColor: string,
    change?: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {change && (
          <Text style={[styles.statChange, { color: change.startsWith('+') ? COLORS.success : COLORS.danger }]}>
            {change}
          </Text>
        )}
      </View>
    </View>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        {renderStatCard('Total Users', analytics.platform.total_users.toLocaleString(), 'people', COLORS.primary, COLORS.primaryLight, `+${analytics.platform.new_users_week} this week`)}
        {renderStatCard('Active Listings', analytics.platform.active_listings.toLocaleString(), 'pricetag', COLORS.blue, COLORS.blueLight)}
        {renderStatCard('Transactions', analytics.platform.total_transactions.toLocaleString(), 'swap-horizontal', COLORS.purple, COLORS.purpleLight)}
        {renderStatCard('Revenue', `$${analytics.platform.total_revenue.toLocaleString()}`, 'cash', COLORS.success, COLORS.successLight)}
      </View>
    </View>
  );

  const renderSellersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        {renderStatCard('Active Sellers', analytics.sellers.active_sellers_count.toLocaleString(), 'storefront', COLORS.primary, COLORS.primaryLight)}
        {renderStatCard('New This Week', analytics.sellers.new_sellers_week.toLocaleString(), 'trending-up', COLORS.success, COLORS.successLight)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Sellers</Text>
        {analytics.sellers.top_sellers.length === 0 ? (
          <Text style={styles.emptyText}>No seller data available</Text>
        ) : (
          analytics.sellers.top_sellers.slice(0, 5).map((seller, index) => (
            <View key={seller.user_id} style={styles.sellerRow}>
              <View style={styles.sellerRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{seller.name}</Text>
                <Text style={styles.sellerStats}>{seller.sales_count} sales</Text>
              </View>
              <Text style={styles.sellerRevenue}>${seller.revenue.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderEngagementTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        {renderStatCard('Total Messages', analytics.engagement.total_messages.toLocaleString(), 'chatbubbles', COLORS.blue, COLORS.blueLight)}
        {renderStatCard('Today\'s Messages', analytics.engagement.messages_today.toLocaleString(), 'chatbubble', COLORS.primary, COLORS.primaryLight)}
        {renderStatCard('Total Favorites', analytics.engagement.total_favorites.toLocaleString(), 'heart', COLORS.danger, COLORS.dangerLight)}
        {renderStatCard('Badges Awarded', analytics.engagement.badge_awards_count.toLocaleString(), 'ribbon', COLORS.purple, COLORS.purpleLight)}
        {renderStatCard('Challenges Done', analytics.engagement.challenge_completions.toLocaleString(), 'trophy', COLORS.warning, COLORS.warningLight)}
      </View>
    </View>
  );

  const renderSearchesTab = () => (
    <View style={styles.tabContent}>
      {/* Overview Stats */}
      <View style={styles.statsGrid}>
        {renderStatCard('Total Searches', searchAnalytics?.total_searches?.toLocaleString() || '0', 'search', COLORS.primary, COLORS.primaryLight, 'Last 30 days')}
        {renderStatCard('Unique Queries', searchAnalytics?.top_searches?.length?.toString() || '0', 'analytics', COLORS.blue, COLORS.blueLight)}
        {renderStatCard('Countries', searchAnalytics?.by_country?.length?.toString() || '0', 'globe', COLORS.purple, COLORS.purpleLight)}
        {renderStatCard('Cities', searchAnalytics?.by_city?.length?.toString() || '0', 'location', COLORS.warning, COLORS.warningLight)}
      </View>

      {/* Top Searches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Searches</Text>
        {!searchAnalytics?.top_searches?.length ? (
          <Text style={styles.emptyText}>No search data available yet</Text>
        ) : (
          searchAnalytics.top_searches.slice(0, 10).map((search, index) => (
            <View key={search.query} style={styles.searchRow}>
              <View style={styles.sellerRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{search.query}</Text>
              </View>
              <View style={styles.searchCount}>
                <Ionicons name="search" size={14} color={COLORS.textSecondary} />
                <Text style={styles.searchCountText}>{search.count}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* By Country */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Searches by Country</Text>
        {!searchAnalytics?.by_country?.length ? (
          <Text style={styles.emptyText}>No location data available</Text>
        ) : (
          searchAnalytics.by_country.slice(0, 5).map((country) => (
            <View key={country.country_code} style={styles.locationRow}>
              <View style={styles.locationInfo}>
                <Ionicons name="flag" size={16} color={COLORS.primary} />
                <Text style={styles.locationName}>{country.country_name || country.country_code}</Text>
              </View>
              <View style={styles.locationStats}>
                <Text style={styles.locationCount}>{country.search_count} searches</Text>
                <Text style={styles.locationQueries}>{country.unique_query_count} unique</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* By Region */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Searches by Region</Text>
        {!searchAnalytics?.by_region?.length ? (
          <Text style={styles.emptyText}>No region data available</Text>
        ) : (
          searchAnalytics.by_region.slice(0, 5).map((region, idx) => (
            <View key={`${region.region_code}-${idx}`} style={styles.locationRow}>
              <View style={styles.locationInfo}>
                <Ionicons name="map" size={16} color={COLORS.blue} />
                <Text style={styles.locationName}>{region.region_name || region.region_code}</Text>
              </View>
              <View style={styles.locationStats}>
                <Text style={styles.locationCount}>{region.search_count} searches</Text>
                <Text style={styles.locationQueries}>{region.unique_query_count} unique</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* By City */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Searches by City</Text>
        {!searchAnalytics?.by_city?.length ? (
          <Text style={styles.emptyText}>No city data available</Text>
        ) : (
          searchAnalytics.by_city.slice(0, 5).map((city, idx) => (
            <View key={`${city.city_code}-${idx}`} style={styles.locationRow}>
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={16} color={COLORS.warning} />
                <View>
                  <Text style={styles.locationName}>{city.city_name || city.city_code}</Text>
                  {city.region_name && <Text style={styles.locationRegion}>{city.region_name}</Text>}
                </View>
              </View>
              <View style={styles.locationStats}>
                <Text style={styles.locationCount}>{city.search_count} searches</Text>
                <Text style={styles.locationQueries}>{city.unique_query_count} unique</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* By Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Searches by Category</Text>
        {!searchAnalytics?.by_category?.length ? (
          <Text style={styles.emptyText}>No category data available</Text>
        ) : (
          searchAnalytics.by_category.slice(0, 5).map((cat, idx) => (
            <View key={`${cat.category_id}-${idx}`} style={styles.locationRow}>
              <View style={styles.locationInfo}>
                <Ionicons name="pricetag" size={16} color={COLORS.purple} />
                <Text style={styles.locationName}>{cat.category_id}</Text>
              </View>
              <View style={styles.locationStats}>
                <Text style={styles.locationCount}>{cat.search_count} searches</Text>
                <Text style={styles.locationQueries}>{cat.unique_query_count} unique</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  if (authError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authError}>
          <Ionicons name="lock-closed" size={64} color={COLORS.danger} />
          <Text style={styles.authErrorTitle}>Authentication Required</Text>
          <Text style={styles.authErrorText}>You need to be logged in as an admin to access this page.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAnalytics(true)} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Platform performance overview</Text>
          </View>
          <TouchableOpacity onPress={() => fetchAnalytics(true)} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Admin Dashboard Link */}
        <TouchableOpacity style={styles.adminLink} onPress={openAdminDashboard}>
          <View style={styles.adminLinkContent}>
            <Ionicons name="settings" size={24} color={COLORS.primary} />
            <View style={styles.adminLinkText}>
              <Text style={styles.adminLinkTitle}>Manage Settings</Text>
              <Text style={styles.adminLinkDesc}>Configure analytics & reports in Admin Dashboard</Text>
            </View>
          </View>
          <Ionicons name="open-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['overview', 'sellers', 'engagement', 'searches'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={tab === 'overview' ? 'bar-chart' : tab === 'sellers' ? 'storefront' : tab === 'engagement' ? 'heart' : 'search'}
                size={18}
                color={activeTab === tab ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'sellers' && renderSellersTab()}
            {activeTab === 'engagement' && renderEngagementTab()}
            {activeTab === 'searches' && renderSearchesTab()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  refreshBtn: {
    padding: 8,
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  adminLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminLinkText: {
    marginLeft: 12,
  },
  adminLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  adminLinkDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  statTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sellerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  sellerStats: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sellerRevenue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  searchCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  locationRegion: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  locationStats: {
    alignItems: 'flex-end',
  },
  locationCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  locationQueries: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  authError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authErrorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  authErrorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 12,
    padding: 12,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
