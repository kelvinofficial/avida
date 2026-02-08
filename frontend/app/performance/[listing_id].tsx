import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Dimensions,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/utils/api';

// Victory Native Charts
import { VictoryLine, VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryPie, VictoryLabel } from 'victory-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimePeriod = '24h' | '7d' | '30d';

interface ListingMetrics {
  listing_id: string;
  period: string;
  total_views: number;
  unique_views: number;
  saves: number;
  chats_initiated: number;
  offers_received: number;
  view_to_chat_rate: number;
  view_to_offer_rate: number;
  boost_views: number;
  non_boost_views: number;
  boost_impact_percent: number;
  location_breakdown: Record<string, number>;
  hourly_trend: number[];
  daily_trend: Record<string, number>;
}

interface Insight {
  type: 'suggestion' | 'warning' | 'opportunity' | 'success';
  title: string;
  description: string;
  priority: number;
  action_label?: string;
  action_route?: string;
  is_ai?: boolean;
}

interface ComparisonData {
  listing: { views: number; saves: number; chats: number; conversion_rate: number };
  seller_average: { views: number; saves: number; chats: number; conversion_rate: number };
  comparison: { views_vs_avg: number; saves_vs_avg: number; chats_vs_avg: number };
}

export default function ListingPerformanceScreen() {
  const { listing_id } = useLocalSearchParams<{ listing_id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const [metrics, setMetrics] = useState<ListingMetrics | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [hasAccess, setHasAccess] = useState(true);
  const [accessMessage, setAccessMessage] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!listing_id) return;
    
    try {
      // Check access first
      const accessResponse = await api.get('/analytics/access');
      if (!accessResponse.data.has_access) {
        setHasAccess(false);
        setAccessMessage(accessResponse.data.message || 'Analytics not available');
        setLoading(false);
        return;
      }
      
      // Load metrics
      const [metricsRes, insightsRes, comparisonRes] = await Promise.all([
        api.get(`/analytics/listing/${listing_id}?period=${period}`),
        api.get(`/analytics/listing/${listing_id}/insights`),
        api.get(`/analytics/listing/${listing_id}/comparison`),
      ]);
      
      setMetrics(metricsRes.data);
      setInsights(insightsRes.data);
      setComparison(comparisonRes.data);
      setHasAccess(true);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setHasAccess(false);
        setAccessMessage(err.response?.data?.detail || 'Analytics not available');
      } else {
        setError(err.response?.data?.detail || 'Failed to load analytics');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listing_id, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return 'bulb';
      case 'warning': return 'warning';
      case 'opportunity': return 'trending-up';
      case 'success': return 'checkmark-circle';
      default: return 'information-circle';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'suggestion': return '#2196F3';
      case 'warning': return '#FF9800';
      case 'opportunity': return '#4CAF50';
      case 'success': return '#8BC34A';
      default: return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Performance</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color="#ccc" />
          <Text style={styles.noAccessTitle}>Analytics Locked</Text>
          <Text style={styles.noAccessMessage}>{accessMessage}</Text>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => router.push('/credits')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Performance</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Prepare chart data
  const hourlyData = metrics?.hourly_trend?.map((value, index) => ({ x: index, y: value })) || [];
  const dailyData = metrics?.daily_trend 
    ? Object.entries(metrics.daily_trend).map(([date, value], index) => ({ x: index, y: value, label: date.slice(5) }))
    : [];
  
  const locationData = metrics?.location_breakdown
    ? Object.entries(metrics.location_breakdown).slice(0, 5).map(([location, count]) => ({ x: location, y: count }))
    : [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['24h', '7d', '30d'] as TimePeriod[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : '30 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="eye" size={24} color="#4CAF50" />
            <Text style={styles.metricValue}>{metrics?.total_views || 0}</Text>
            <Text style={styles.metricLabel}>Total Views</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="people" size={24} color="#2196F3" />
            <Text style={styles.metricValue}>{metrics?.unique_views || 0}</Text>
            <Text style={styles.metricLabel}>Unique Views</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="heart" size={24} color="#E91E63" />
            <Text style={styles.metricValue}>{metrics?.saves || 0}</Text>
            <Text style={styles.metricLabel}>Saves</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="chatbubble" size={24} color="#9C27B0" />
            <Text style={styles.metricValue}>{metrics?.chats_initiated || 0}</Text>
            <Text style={styles.metricLabel}>Chats</Text>
          </View>
        </View>

        {/* Conversion Rates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversion Rates</Text>
          <View style={styles.conversionRow}>
            <View style={styles.conversionItem}>
              <Text style={styles.conversionValue}>{metrics?.view_to_chat_rate || 0}%</Text>
              <Text style={styles.conversionLabel}>View → Chat</Text>
            </View>
            <View style={styles.conversionDivider} />
            <View style={styles.conversionItem}>
              <Text style={styles.conversionValue}>{metrics?.view_to_offer_rate || 0}%</Text>
              <Text style={styles.conversionLabel}>View → Offer</Text>
            </View>
          </View>
        </View>

        {/* Boost Impact */}
        {(metrics?.boost_views || 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boost Impact</Text>
            <View style={styles.boostCard}>
              <View style={styles.boostRow}>
                <View style={styles.boostItem}>
                  <Ionicons name="rocket" size={20} color="#4CAF50" />
                  <Text style={styles.boostValue}>{metrics?.boost_views || 0}</Text>
                  <Text style={styles.boostLabel}>Boosted Views</Text>
                </View>
                <View style={styles.boostItem}>
                  <Ionicons name="remove-circle-outline" size={20} color="#9E9E9E" />
                  <Text style={styles.boostValue}>{metrics?.non_boost_views || 0}</Text>
                  <Text style={styles.boostLabel}>Regular Views</Text>
                </View>
              </View>
              <View style={styles.boostImpactRow}>
                <Text style={styles.boostImpactLabel}>Boost increased views by</Text>
                <Text style={[
                  styles.boostImpactValue,
                  { color: (metrics?.boost_impact_percent || 0) > 0 ? '#4CAF50' : '#f44336' }
                ]}>
                  {metrics?.boost_impact_percent || 0}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Views Trend Chart */}
        {dailyData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Views Trend</Text>
            <View style={styles.chartContainer}>
              <VictoryChart
                width={SCREEN_WIDTH - 40}
                height={200}
                theme={VictoryTheme.material}
                domainPadding={20}
              >
                <VictoryAxis
                  tickFormat={(t) => dailyData[t]?.label || ''}
                  style={{
                    tickLabels: { fontSize: 10, fill: '#666' }
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    tickLabels: { fontSize: 10, fill: '#666' }
                  }}
                />
                <VictoryBar
                  data={dailyData}
                  style={{
                    data: { fill: '#4CAF50' }
                  }}
                  cornerRadius={{ top: 4 }}
                />
              </VictoryChart>
            </View>
          </View>
        )}

        {/* Location Breakdown */}
        {locationData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Views by Location</Text>
            <View style={styles.locationList}>
              {locationData.map((item, index) => (
                <View key={index} style={styles.locationItem}>
                  <Ionicons name="location" size={16} color="#4CAF50" />
                  <Text style={styles.locationName}>{item.x}</Text>
                  <Text style={styles.locationCount}>{item.y} views</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Comparison */}
        {comparison && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>vs Your Average</Text>
            <View style={styles.comparisonGrid}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Views</Text>
                <Text style={[
                  styles.comparisonDiff,
                  { color: comparison.comparison.views_vs_avg >= 0 ? '#4CAF50' : '#f44336' }
                ]}>
                  {comparison.comparison.views_vs_avg >= 0 ? '+' : ''}{comparison.comparison.views_vs_avg}%
                </Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Saves</Text>
                <Text style={[
                  styles.comparisonDiff,
                  { color: comparison.comparison.saves_vs_avg >= 0 ? '#4CAF50' : '#f44336' }
                ]}>
                  {comparison.comparison.saves_vs_avg >= 0 ? '+' : ''}{comparison.comparison.saves_vs_avg}%
                </Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Chats</Text>
                <Text style={[
                  styles.comparisonDiff,
                  { color: comparison.comparison.chats_vs_avg >= 0 ? '#4CAF50' : '#f44336' }
                ]}>
                  {comparison.comparison.chats_vs_avg >= 0 ? '+' : ''}{comparison.comparison.chats_vs_avg}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="bulb" size={18} color="#FF9800" /> Insights & Suggestions
            </Text>
            {insights.map((insight, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.insightCard, { borderLeftColor: getInsightColor(insight.type) }]}
                onPress={() => insight.action_route && router.push(insight.action_route as any)}
              >
                <View style={styles.insightHeader}>
                  <Ionicons name={getInsightIcon(insight.type) as any} size={20} color={getInsightColor(insight.type)} />
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  {insight.is_ai && (
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.insightDescription}>{insight.description}</Text>
                {insight.action_label && (
                  <Text style={[styles.insightAction, { color: getInsightColor(insight.type) }]}>
                    {insight.action_label} →
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Boost CTA */}
        <View style={styles.boostCTA}>
          <Text style={styles.boostCTATitle}>Want more views?</Text>
          <Text style={styles.boostCTAText}>Boost your listing to reach more buyers</Text>
          <TouchableOpacity 
            style={styles.boostCTAButton}
            onPress={() => router.push(`/boost/${listing_id}` as any)}
          >
            <Ionicons name="rocket" size={20} color="#fff" />
            <Text style={styles.boostCTAButtonText}>Boost This Listing</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: '1%',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  conversionRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  conversionItem: {
    flex: 1,
    alignItems: 'center',
  },
  conversionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
  },
  conversionLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  conversionDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  boostCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  boostRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  boostItem: {
    flex: 1,
    alignItems: 'center',
  },
  boostValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  boostLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  boostImpactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  boostImpactLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  boostImpactValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  locationList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  locationCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  comparisonGrid: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  comparisonDiff: {
    fontSize: 18,
    fontWeight: '700',
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  aiBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  insightAction: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  boostCTA: {
    margin: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  boostCTATitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  boostCTAText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  boostCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  boostCTAButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  noAccessMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
