import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { useResponsive } from '../../src/hooks/useResponsive';
import { Footer } from '../../src/components/layout';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  gold: '#F59E0B',
  goldLight: '#FEF3C7',
  seasonal: '#EC4899',
  seasonalLight: '#FDF2F8',
  success: '#22C55E',
  successLight: '#DCFCE7',
};

interface SeasonalBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  points_value: number;
  period_start?: string;
  period_end?: string;
  earned_count: number;
  user_earned: boolean;
  criteria?: {
    type: string;
    count: number;
    categories?: string[];
  };
}

const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    'heart': 'heart',
    'flower': 'flower',
    'sunny': 'sunny',
    'school': 'school',
    'moon': 'moon',
    'gift': 'gift',
    'sparkles': 'sparkles',
    'snow': 'snow',
    'leaf': 'leaf',
    'star': 'star',
    'trophy': 'trophy',
    'medal': 'medal',
    'ribbon': 'ribbon',
    'flash': 'flash',
    'flame': 'flame',
  };
  return iconMap[iconName] || 'ribbon';
};

const getSeasonIcon = (month: number): keyof typeof Ionicons.glyphMap => {
  if (month >= 3 && month <= 5) return 'flower';
  if (month >= 6 && month <= 8) return 'sunny';
  if (month >= 9 && month <= 11) return 'leaf';
  return 'snow';
};

const getSeasonName = (month: number): string => {
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
};

export default function SeasonalBadgesGalleryScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const [badges, setBadges] = useState<SeasonalBadge[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ total: 0, earned: 0 });

  const fetchBadges = useCallback(async (pageNum: number = 1, refresh: boolean = false, year?: number | null) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      let url = `/badges/past-seasonal?page=${pageNum}&limit=20`;
      if (year) url += `&year=${year}`;

      const response = await api.get(url);
      const data = response.data;

      if (refresh || pageNum === 1) {
        setBadges(data.badges || []);
        setAvailableYears(data.available_years || []);
      } else {
        setBadges(prev => [...prev, ...(data.badges || [])]);
      }

      setHasMore(pageNum < (data.pagination?.pages || 0));
      setPage(pageNum);

      // Calculate stats
      const allBadges = pageNum === 1 ? data.badges : [...badges, ...data.badges];
      const earnedCount = allBadges.filter((b: SeasonalBadge) => b.user_earned).length;
      setStats({ total: data.pagination?.total || 0, earned: earnedCount });
    } catch (error) {
      console.error('Error fetching seasonal badges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [badges]);

  useEffect(() => {
    fetchBadges(1, false, selectedYear);
  }, [selectedYear]);

  const handleRefresh = () => {
    fetchBadges(1, true, selectedYear);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchBadges(page + 1, false, selectedYear);
    }
  };

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year);
    setPage(1);
  };

  const handleShare = async (badge?: SeasonalBadge) => {
    const message = badge 
      ? `Check out the "${badge.name}" seasonal badge on Avida Marketplace!`
      : `Check out the Seasonal Badges Gallery on Avida Marketplace! See all the limited-time badges from past events.`;
    const url = `${process.env.EXPO_PUBLIC_BACKEND_URL}/badges/seasonal-gallery`;
    
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(`${message}\n${url}`);
        alert('Link copied to clipboard!');
      } catch (e) {
        console.error('Failed to copy:', e);
      }
    } else {
      try {
        await Share.share({ message: `${message}\n${url}` });
      } catch (e) {
        console.error('Failed to share:', e);
      }
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderYearFilter = () => {
    const years = [null, ...availableYears];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.yearFilterContainer}
        contentContainerStyle={styles.yearFilterContent}
      >
        {years.map((year) => (
          <TouchableOpacity
            key={year || 'all'}
            style={[
              styles.yearChip,
              selectedYear === year && styles.yearChipActive,
            ]}
            onPress={() => handleYearChange(year)}
          >
            <Text style={[
              styles.yearChipText,
              selectedYear === year && styles.yearChipTextActive,
            ]}>
              {year || 'All Time'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderBadgeCard = (badge: SeasonalBadge) => {
    const startMonth = badge.period_start ? new Date(badge.period_start).getMonth() + 1 : 1;
    const seasonIcon = getSeasonIcon(startMonth);
    const seasonName = getSeasonName(startMonth);

    return (
      <View 
        key={badge.id} 
        style={[
          styles.badgeCard,
          badge.user_earned && styles.badgeCardEarned,
        ]}
        data-testid={`seasonal-badge-${badge.id}`}
      >
        {/* Earned indicator */}
        {badge.user_earned && (
          <View style={styles.earnedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.earnedBadgeText}>Earned</Text>
          </View>
        )}

        {/* Badge Icon */}
        <View style={[styles.badgeIconContainer, { backgroundColor: `${badge.color}20` }]}>
          <Ionicons name={getIconName(badge.icon)} size={36} color={badge.color} />
        </View>

        {/* Badge Info */}
        <Text style={styles.badgeName}>{badge.name}</Text>
        <Text style={styles.badgeDescription} numberOfLines={2}>{badge.description}</Text>

        {/* Season & Date */}
        <View style={styles.seasonRow}>
          <Ionicons name={seasonIcon} size={14} color={COLORS.seasonal} />
          <Text style={styles.seasonText}>{seasonName}</Text>
          {badge.period_start && (
            <Text style={styles.dateText}>
              {formatDate(badge.period_start)}
            </Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color={COLORS.gold} />
            <Text style={styles.statText}>{badge.points_value} pts</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people" size={14} color={COLORS.textSecondary} />
            <Text style={styles.statText}>{badge.earned_count} earned</Text>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity 
          style={styles.shareBtn}
          onPress={() => handleShare(badge)}
        >
          <Ionicons name="share-outline" size={16} color={COLORS.primary} />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <View style={styles.statsCardItem}>
        <Text style={styles.statsValue}>{stats.total}</Text>
        <Text style={styles.statsLabel}>Total Badges</Text>
      </View>
      <View style={styles.statsCardDivider} />
      <View style={styles.statsCardItem}>
        <Text style={[styles.statsValue, { color: COLORS.success }]}>{stats.earned}</Text>
        <Text style={styles.statsLabel}>You Earned</Text>
      </View>
      <View style={styles.statsCardDivider} />
      <View style={styles.statsCardItem}>
        <Text style={[styles.statsValue, { color: COLORS.seasonal }]}>
          {stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : 0}%
        </Text>
        <Text style={styles.statsLabel}>Completion</Text>
      </View>
    </View>
  );

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.seasonal} />
          <Text style={styles.loadingText}>Loading seasonal badges...</Text>
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
        <Text style={styles.headerTitle}>Seasonal Badges</Text>
        <TouchableOpacity onPress={() => handleShare()} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && styles.scrollContentDesktop,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.seasonal} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isEndReached = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
          if (isEndReached) handleLoadMore();
        }}
        scrollEventThrottle={400}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="sparkles" size={48} color={COLORS.seasonal} />
          </View>
          <Text style={styles.heroTitle}>Seasonal Badge Gallery</Text>
          <Text style={styles.heroSubtitle}>
            Explore limited-time badges from past seasonal events. These exclusive badges celebrate special occasions throughout the year!
          </Text>
        </View>

        {/* Stats Card */}
        {isAuthenticated && renderStatsCard()}

        {/* Year Filter */}
        {availableYears.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by Year</Text>
            {renderYearFilter()}
          </View>
        )}

        {/* Badges Grid */}
        {badges.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Seasonal Badges Yet</Text>
            <Text style={styles.emptyText}>
              Seasonal badges will appear here after events end. Check back during special events to earn limited-time badges!
            </Text>
            <TouchableOpacity 
              style={styles.challengesBtn}
              onPress={() => router.push('/challenges')}
            >
              <Ionicons name="flag" size={18} color="#fff" />
              <Text style={styles.challengesBtnText}>View Current Challenges</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.badgesGrid, isLargeScreen && styles.badgesGridDesktop]}>
            {badges.map(renderBadgeCard)}
          </View>
        )}

        {loading && page > 1 && (
          <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.seasonal} />
        )}

        {/* CTA for non-authenticated users */}
        {!isAuthenticated && badges.length > 0 && (
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Start Collecting!</Text>
            <Text style={styles.ctaText}>
              Sign up to participate in seasonal events and earn exclusive limited-time badges.
            </Text>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.ctaButtonText}>Sign Up Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Link to Challenges */}
        <TouchableOpacity
          style={styles.challengesLink}
          onPress={() => router.push('/challenges')}
        >
          <Ionicons name="flag-outline" size={20} color={COLORS.primary} />
          <Text style={styles.challengesLinkText}>View Active Challenges</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </ScrollView>

      {!isLargeScreen && <Footer />}
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
  shareButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  heroIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.seasonalLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  statsCardItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsCardDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  statsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  filterSection: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  yearFilterContainer: {
    flexGrow: 0,
  },
  yearFilterContent: {
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  yearChipActive: {
    backgroundColor: COLORS.seasonal,
    borderColor: COLORS.seasonal,
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  yearChipTextActive: {
    color: '#fff',
  },
  badgesGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  badgesGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
    width: '100%',
  },
  badgeCardEarned: {
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  earnedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  earnedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  badgeIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  seasonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.seasonal,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  challengesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.seasonal,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  challengesBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  ctaSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: COLORS.seasonal,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  challengesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  challengesLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
    flex: 1,
  },
});
