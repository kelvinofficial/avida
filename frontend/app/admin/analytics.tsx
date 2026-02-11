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
  TextInput,
  Switch,
  Alert,
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
  pink: '#EC4899',
  pinkLight: '#FDF2F8',
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
    top_sellers: {
      user_id: string;
      name: string;
      revenue: number;
      sales_count: number;
      listing_count: number;
    }[];
    active_sellers_count: number;
    new_sellers_week: number;
    avg_seller_revenue: number;
    avg_listings_per_seller: number;
  };
  engagement: {
    total_messages: number;
    messages_today: number;
    total_favorites: number;
    badge_awards_count: number;
    challenge_completions: number;
    notification_read_rate: number;
  };
  categories: {
    name: string;
    listing_count: number;
    sales_count: number;
    revenue: number;
  }[];
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
    avg_seller_revenue: 0,
    avg_listings_per_seller: 0,
  },
  engagement: {
    total_messages: 0,
    messages_today: 0,
    total_favorites: 0,
    badge_awards_count: 0,
    challenge_completions: 0,
    notification_read_rate: 0,
  },
  categories: [],
};

type TabType = 'overview' | 'sellers' | 'engagement' | 'settings';

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const [analytics, setAnalytics] = useState<AnalyticsData>(defaultAnalytics);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [authError, setAuthError] = useState(false);
  
  // Settings state
  const [sellerAlertThreshold, setSellerAlertThreshold] = useState('100');
  const [lowPerformanceThreshold, setLowPerformanceThreshold] = useState('5');
  const [engagementMilestones, setEngagementMilestones] = useState({
    firstSale: true,
    tenListings: true,
    hundredMessages: true,
    badgeMilestone: true,
  });
  const [notificationTriggers, setNotificationTriggers] = useState({
    inactiveSeller: true,
    lowEngagement: true,
    challengeReminder: true,
    weeklyDigest: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Scheduled Reports state
  const [reportsEnabled, setReportsEnabled] = useState(true);
  const [reportFrequency, setReportFrequency] = useState('weekly');
  const [reportDay, setReportDay] = useState(1); // Monday
  const [reportHour, setReportHour] = useState(9); // 9 AM
  const [adminEmails, setAdminEmails] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      setAuthError(true);
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch existing settings when settings tab is activated
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const [sellerSettingsRes, engagementSettingsRes, reportsSettingsRes, historyRes] = await Promise.all([
        api.get('/admin/settings/seller-analytics').catch(() => ({ data: null })),
        api.get('/admin/settings/engagement-notifications').catch(() => ({ data: null })),
        api.get('/admin/settings/scheduled-reports').catch(() => ({ data: null })),
        api.get('/admin/reports/history?limit=5').catch(() => ({ data: null })),
      ]);

      if (sellerSettingsRes.data) {
        setSellerAlertThreshold(String(sellerSettingsRes.data.alert_threshold || 100));
        setLowPerformanceThreshold(String(sellerSettingsRes.data.low_performance_threshold || 5));
      }

      if (engagementSettingsRes.data) {
        if (engagementSettingsRes.data.milestones) {
          setEngagementMilestones({
            firstSale: engagementSettingsRes.data.milestones.firstSale ?? true,
            tenListings: engagementSettingsRes.data.milestones.tenListings ?? true,
            hundredMessages: engagementSettingsRes.data.milestones.hundredMessages ?? true,
            badgeMilestone: engagementSettingsRes.data.milestones.badgeMilestone ?? true,
          });
        }
        if (engagementSettingsRes.data.triggers) {
          setNotificationTriggers({
            inactiveSeller: engagementSettingsRes.data.triggers.inactiveSeller ?? true,
            lowEngagement: engagementSettingsRes.data.triggers.lowEngagement ?? true,
            challengeReminder: engagementSettingsRes.data.triggers.challengeReminder ?? true,
            weeklyDigest: engagementSettingsRes.data.triggers.weeklyDigest ?? true,
          });
        }
      }

      if (reportsSettingsRes.data) {
        setReportsEnabled(reportsSettingsRes.data.enabled ?? true);
        setReportFrequency(reportsSettingsRes.data.frequency || 'weekly');
        setReportDay(reportsSettingsRes.data.day_of_week ?? 1);
        setReportHour(reportsSettingsRes.data.hour ?? 9);
        setAdminEmails((reportsSettingsRes.data.admin_emails || []).join(', '));
      }

      if (historyRes.data?.history) {
        setReportHistory(historyRes.data.history);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, [isAuthenticated]);

  // Fetch settings when switching to settings tab
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab, fetchSettings]);

  const fetchAnalytics = useCallback(async (refresh: boolean = false) => {
    if (!isAuthenticated) {
      setAuthError(true);
      return;
    }
    
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setAuthError(false);

      // Fetch from multiple endpoints
      const [platformRes, sellersRes, engagementRes] = await Promise.all([
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
      ]);

      setAnalytics({
        platform: platformRes.data || defaultAnalytics.platform,
        sellers: sellersRes.data || defaultAnalytics.sellers,
        engagement: engagementRes.data || defaultAnalytics.engagement,
        categories: platformRes.data?.categories || [],
      });
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

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    return '€' + formatNumber(num);
  };

  const formatPercentage = (num: number): string => {
    return (num * 100).toFixed(1) + '%';
  };

  const renderOverviewTab = () => (
    <View>
      {/* Platform Stats */}
      <Text style={styles.sectionTitle}>Platform Overview</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: COLORS.blueLight }]}>
          <Ionicons name="people" size={28} color={COLORS.blue} />
          <Text style={styles.statValue}>{formatNumber(analytics.platform.total_users)}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
          <View style={styles.statTrend}>
            <Ionicons name="arrow-up" size={12} color={COLORS.success} />
            <Text style={[styles.trendText, { color: COLORS.success }]}>
              +{analytics.platform.new_users_week} this week
            </Text>
          </View>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="list" size={28} color={COLORS.primary} />
          <Text style={styles.statValue}>{formatNumber(analytics.platform.total_listings)}</Text>
          <Text style={styles.statLabel}>Total Listings</Text>
          <Text style={styles.statSubtext}>
            {analytics.platform.active_listings} active
          </Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: COLORS.warningLight }]}>
          <Ionicons name="cart" size={28} color={COLORS.warning} />
          <Text style={styles.statValue}>{formatNumber(analytics.platform.total_transactions)}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: COLORS.successLight }]}>
          <Ionicons name="cash" size={28} color={COLORS.success} />
          <Text style={styles.statValue}>{formatCurrency(analytics.platform.total_revenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
      </View>

      {/* Category Breakdown */}
      {analytics.categories.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Category Performance</Text>
          <View style={styles.categoryContainer}>
            {analytics.categories.slice(0, 5).map((cat, index) => (
              <View key={cat.name} style={styles.categoryRow}>
                <View style={styles.categoryRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <View style={styles.categoryStats}>
                    <Text style={styles.categoryStatText}>
                      {cat.listing_count} listings
                    </Text>
                    <Text style={styles.categoryStatText}>
                      {cat.sales_count} sales
                    </Text>
                    <Text style={styles.categoryStatText}>
                      {formatCurrency(cat.revenue)}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryBar}>
                  <View 
                    style={[
                      styles.categoryBarFill, 
                      { 
                        width: `${Math.min(100, (cat.listing_count / (analytics.categories[0]?.listing_count || 1)) * 100)}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );

  const renderSellersTab = () => (
    <View>
      {/* Seller Overview */}
      <Text style={styles.sectionTitle}>Seller Metrics</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{analytics.sellers.active_sellers_count}</Text>
          <Text style={styles.metricLabel}>Active Sellers</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{analytics.sellers.new_sellers_week}</Text>
          <Text style={styles.metricLabel}>New This Week</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatCurrency(analytics.sellers.avg_seller_revenue)}</Text>
          <Text style={styles.metricLabel}>Avg Revenue</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{analytics.sellers.avg_listings_per_seller.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>Avg Listings</Text>
        </View>
      </View>

      {/* Top Sellers */}
      <Text style={styles.sectionTitle}>Top Sellers</Text>
      {analytics.sellers.top_sellers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No seller data yet</Text>
        </View>
      ) : (
        <View style={styles.topSellersContainer}>
          {analytics.sellers.top_sellers.map((seller, index) => (
            <TouchableOpacity 
              key={seller.user_id} 
              style={styles.sellerCard}
              onPress={() => router.push(`/profile/${seller.user_id}` as any)}
            >
              <View style={[styles.sellerRankBadge, index < 3 && styles.topThreeRank]}>
                <Text style={[styles.sellerRankText, index < 3 && { color: '#fff' }]}>
                  #{index + 1}
                </Text>
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{seller.name}</Text>
                <View style={styles.sellerStats}>
                  <View style={styles.sellerStatItem}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.success} />
                    <Text style={styles.sellerStatText}>{formatCurrency(seller.revenue)}</Text>
                  </View>
                  <View style={styles.sellerStatItem}>
                    <Ionicons name="cart-outline" size={14} color={COLORS.blue} />
                    <Text style={styles.sellerStatText}>{seller.sales_count} sales</Text>
                  </View>
                  <View style={styles.sellerStatItem}>
                    <Ionicons name="list-outline" size={14} color={COLORS.purple} />
                    <Text style={styles.sellerStatText}>{seller.listing_count} listings</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderEngagementTab = () => (
    <View>
      {/* Engagement Stats */}
      <Text style={styles.sectionTitle}>Engagement Metrics</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: COLORS.purpleLight }]}>
          <Ionicons name="chatbubbles" size={28} color={COLORS.purple} />
          <Text style={styles.statValue}>{formatNumber(analytics.engagement.total_messages)}</Text>
          <Text style={styles.statLabel}>Total Messages</Text>
          <Text style={styles.statSubtext}>
            +{analytics.engagement.messages_today} today
          </Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: COLORS.pinkLight }]}>
          <Ionicons name="heart" size={28} color={COLORS.pink} />
          <Text style={styles.statValue}>{formatNumber(analytics.engagement.total_favorites)}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: COLORS.warningLight }]}>
          <Ionicons name="medal" size={28} color={COLORS.warning} />
          <Text style={styles.statValue}>{formatNumber(analytics.engagement.badge_awards_count)}</Text>
          <Text style={styles.statLabel}>Badges Awarded</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: COLORS.successLight }]}>
          <Ionicons name="flag" size={28} color={COLORS.success} />
          <Text style={styles.statValue}>{formatNumber(analytics.engagement.challenge_completions)}</Text>
          <Text style={styles.statLabel}>Challenges Done</Text>
        </View>
      </View>

      {/* Notification Stats */}
      <Text style={styles.sectionTitle}>Notification Performance</Text>
      <View style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <Ionicons name="notifications" size={24} color={COLORS.blue} />
          <Text style={styles.notificationTitle}>Notification Read Rate</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${analytics.engagement.notification_read_rate * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {formatPercentage(analytics.engagement.notification_read_rate)}
          </Text>
        </View>
        <Text style={styles.notificationHint}>
          Percentage of push notifications that were read by users
        </Text>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/admin/challenges')}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="flag" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.actionTitle}>Manage Challenges</Text>
          <Text style={styles.actionDesc}>Create and edit badge challenges</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/admin/users')}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.blueLight }]}>
            <Ionicons name="people" size={24} color={COLORS.blue} />
          </View>
          <Text style={styles.actionTitle}>User Management</Text>
          <Text style={styles.actionDesc}>View and manage users</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      // Save seller analytics settings
      await api.post('/admin/settings/seller-analytics', {
        alert_threshold: parseInt(sellerAlertThreshold),
        low_performance_threshold: parseInt(lowPerformanceThreshold),
      });
      
      // Save engagement notification settings
      await api.post('/admin/settings/engagement-notifications', {
        milestones: engagementMilestones,
        triggers: notificationTriggers,
      });

      if (Platform.OS === 'web') {
        alert('Settings saved successfully!');
      } else {
        Alert.alert('Success', 'Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      if (Platform.OS === 'web') {
        alert('Failed to save settings');
      } else {
        Alert.alert('Error', 'Failed to save settings');
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const renderSettingsTab = () => (
    <View>
      {/* Seller Analytics Settings */}
      <Text style={styles.sectionTitle}>Seller Analytics Settings</Text>
      <View style={styles.settingsCard}>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="trending-up" size={20} color={COLORS.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Revenue Alert Threshold</Text>
              <Text style={styles.settingDescription}>
                Alert when seller's monthly revenue drops below this amount (€)
              </Text>
            </View>
          </View>
          <TextInput
            style={styles.settingInput}
            value={sellerAlertThreshold}
            onChangeText={setSellerAlertThreshold}
            keyboardType="numeric"
            placeholder="100"
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Low Performance Threshold</Text>
              <Text style={styles.settingDescription}>
                Days of inactivity before flagging a seller as low-performing
              </Text>
            </View>
          </View>
          <TextInput
            style={styles.settingInput}
            value={lowPerformanceThreshold}
            onChangeText={setLowPerformanceThreshold}
            keyboardType="numeric"
            placeholder="5"
          />
        </View>
      </View>

      {/* Engagement Milestones */}
      <Text style={styles.sectionTitle}>Engagement Milestone Notifications</Text>
      <View style={styles.settingsCard}>
        <View style={styles.toggleItem}>
          <View style={styles.toggleInfo}>
            <Ionicons name="cart" size={20} color={COLORS.success} />
            <Text style={styles.toggleLabel}>First Sale Celebration</Text>
          </View>
          <Switch
            value={engagementMilestones.firstSale}
            onValueChange={(value) => setEngagementMilestones(prev => ({ ...prev, firstSale: value }))}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={engagementMilestones.firstSale ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.toggleItem}>
          <View style={styles.toggleInfo}>
            <Ionicons name="list" size={20} color={COLORS.blue} />
            <Text style={styles.toggleLabel}>10 Listings Milestone</Text>
          </View>
          <Switch
            value={engagementMilestones.tenListings}
            onValueChange={(value) => setEngagementMilestones(prev => ({ ...prev, tenListings: value }))}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={engagementMilestones.tenListings ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.toggleItem}>
          <View style={styles.toggleInfo}>
            <Ionicons name="chatbubbles" size={20} color={COLORS.purple} />
            <Text style={styles.toggleLabel}>100 Messages Milestone</Text>
          </View>
          <Switch
            value={engagementMilestones.hundredMessages}
            onValueChange={(value) => setEngagementMilestones(prev => ({ ...prev, hundredMessages: value }))}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={engagementMilestones.hundredMessages ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.toggleItem}>
          <View style={styles.toggleInfo}>
            <Ionicons name="medal" size={20} color={COLORS.warning} />
            <Text style={styles.toggleLabel}>Badge Achievement Alerts</Text>
          </View>
          <Switch
            value={engagementMilestones.badgeMilestone}
            onValueChange={(value) => setEngagementMilestones(prev => ({ ...prev, badgeMilestone: value }))}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={engagementMilestones.badgeMilestone ? COLORS.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Notification Triggers */}
      <Text style={styles.sectionTitle}>Automated Notification Triggers</Text>
      <View style={styles.settingsCard}>
        <View style={styles.toggleItem}>
          <View style={styles.toggleInfo}>
            <Ionicons name="time" size={20} color={COLORS.danger} />
            <Text style={styles.toggleLabel}>Inactive Seller Reminder</Text>
          </View>
          <Switch
            value={notificationTriggers.inactiveSeller}
            onValueChange={(value) => setNotificationTriggers(prev => ({ ...prev, inactiveSeller: value }))}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={notificationTriggers.inactiveSeller ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.toggleItem}>
          <View style={styles.toggleInfo}>
            <Ionicons name="pulse" size={20} color={COLORS.pink} />
            <Text style={styles.toggleLabel}>Low Engagement Alert</Text>
          </View>
          <Switch
            value={notificationTriggers.lowEngagement}
            onValueChange={(value) => setNotificationTriggers(prev => ({ ...prev, lowEngagement: value }))}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={notificationTriggers.lowEngagement ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.toggleItem}>
          <View style={styles.toggleInfo}>
            <Ionicons name="flag" size={20} color={COLORS.primary} />
            <Text style={styles.toggleLabel}>Challenge Deadline Reminder</Text>
          </View>
          <Switch
            value={notificationTriggers.challengeReminder}
            onValueChange={(value) => setNotificationTriggers(prev => ({ ...prev, challengeReminder: value }))}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={notificationTriggers.challengeReminder ? COLORS.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.toggleItem}>
          <View style={styles.toggleInfo}>
            <Ionicons name="mail" size={20} color={COLORS.blue} />
            <Text style={styles.toggleLabel}>Weekly Digest Email</Text>
          </View>
          <Switch
            value={notificationTriggers.weeklyDigest}
            onValueChange={(value) => setNotificationTriggers(prev => ({ ...prev, weeklyDigest: value }))}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={notificationTriggers.weeklyDigest ? COLORS.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, savingSettings && styles.saveButtonDisabled]}
        onPress={handleSaveSettings}
        disabled={savingSettings}
      >
        {savingSettings ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // Auth error screen
  if (authError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authErrorContainer}>
          <Ionicons name="lock-closed" size={64} color={COLORS.danger} />
          <Text style={styles.authErrorTitle}>Authentication Required</Text>
          <Text style={styles.authErrorText}>
            You need to be logged in as an admin to access this page.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <TouchableOpacity onPress={() => fetchAnalytics(true)} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['overview', 'sellers', 'engagement', 'settings'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons 
              name={tab === 'overview' ? 'bar-chart' : tab === 'sellers' ? 'storefront' : tab === 'engagement' ? 'heart' : 'settings'} 
              size={18} 
              color={activeTab === tab ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && styles.scrollContentDesktop,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAnalytics(true)} tintColor={COLORS.primary} />
        }
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'sellers' && renderSellersTab()}
        {activeTab === 'engagement' && renderEngagementTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  refreshButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  categoryContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  categoryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoryBar: {
    width: 60,
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    marginLeft: 12,
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  topSellersContainer: {
    gap: 10,
    marginBottom: 20,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
  },
  sellerRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topThreeRank: {
    backgroundColor: COLORS.primary,
  },
  sellerRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sellerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  sellerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  notificationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.blue,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 50,
  },
  notificationHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  // Auth Error Styles
  authErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authErrorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  authErrorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  // Settings Styles
  settingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    width: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 12,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginLeft: 12,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
