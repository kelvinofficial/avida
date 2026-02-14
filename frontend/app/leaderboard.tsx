import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/utils/api';
import { useAuthStore } from '../src/store/authStore';
import { useResponsive } from '../src/hooks/useResponsive';
import { Footer } from '../src/components/layout';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  is_verified: boolean;
  badge_count: number;
  top_badges: {
    name: string;
    icon: string;
    color: string;
  }[];
}

interface MyRank {
  rank: number | null;
  badge_count: number;
  total_participants: number;
  percentile: number | null;
  nearby_users: {
    rank: number;
    user_id: string;
    user_name: string;
    badge_count: number;
    is_current_user: boolean;
  }[];
}

const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    'ribbon': 'ribbon',
    'medal': 'medal',
    'trophy': 'trophy',
    'star': 'star',
    'diamond': 'diamond',
    'pricetag': 'pricetag',
    'cash': 'cash',
    'trending-up': 'trending-up',
    'shield-checkmark': 'shield-checkmark',
    'time': 'time',
    'sparkles': 'sparkles',
  };
  return iconMap[iconName] || 'ribbon';
};

const getRankColor = (rank: number) => {
  if (rank === 1) return COLORS.gold;
  if (rank === 2) return COLORS.silver;
  if (rank === 3) return COLORS.bronze;
  return COLORS.textSecondary;
};

const getRankIcon = (rank: number): keyof typeof Ionicons.glyphMap => {
  if (rank === 1) return 'trophy';
  if (rank === 2) return 'medal';
  if (rank === 3) return 'medal-outline';
  return 'ribbon-outline';
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchLeaderboard = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const response = await api.get(`/badges/leaderboard?page=${pageNum}&limit=20`);
      const data = response.data;

      if (refresh || pageNum === 1) {
        setLeaderboard(data.leaderboard || []);
      } else {
        setLeaderboard(prev => [...prev, ...(data.leaderboard || [])]);
      }

      setHasMore(pageNum < (data.pagination?.total_pages || 0));
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMyRank = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await api.get('/badges/leaderboard/my-rank');
      setMyRank(response.data);
    } catch (error) {
      console.error('Error fetching my rank:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLeaderboard(1);
    fetchMyRank();
  }, [fetchLeaderboard, fetchMyRank]);

  const handleRefresh = () => {
    fetchLeaderboard(1, true);
    fetchMyRank();
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchLeaderboard(page + 1);
    }
  };

  const handleShare = async () => {
    const message = `Check out the Badge Leaderboard on Avida Marketplace! See who's earning the most badges. #AvidaMarketplace`;
    const url = 'https://search-ui-debug.preview.emergentagent.com/leaderboard';
    
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

  const renderLeaderboardItem = (item: LeaderboardEntry, index: number) => {
    const isTopThree = item.rank <= 3;
    const isCurrentUser = item.user_id === user?.user_id;

    return (
      <TouchableOpacity
        key={item.user_id}
        style={[
          styles.leaderboardItem,
          isTopThree && styles.topThreeItem,
          isCurrentUser && styles.currentUserItem,
        ]}
        onPress={() => router.push(`/profile/${item.user_id}` as any)}
        data-testid={`leaderboard-item-${item.rank}`}
      >
        {/* Rank */}
        <View style={[styles.rankContainer, isTopThree && { backgroundColor: `${getRankColor(item.rank)}20` }]}>
          {isTopThree ? (
            <Ionicons name={getRankIcon(item.rank)} size={24} color={getRankColor(item.rank)} />
          ) : (
            <Text style={styles.rankText}>#{item.rank}</Text>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{item.user_name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, isCurrentUser && styles.currentUserName]}>
                {item.user_name}
                {isCurrentUser && ' (You)'}
              </Text>
              {item.is_verified && (
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            {/* Top Badges */}
            <View style={styles.badgesRow}>
              {item.top_badges.slice(0, 3).map((badge, i) => (
                <View key={i} style={[styles.badgeIcon, { backgroundColor: `${badge.color}20` }]}>
                  <Ionicons name={getIconName(badge.icon)} size={12} color={badge.color} />
                </View>
              ))}
              {item.top_badges.length > 3 && (
                <Text style={styles.moreBadges}>+{item.top_badges.length - 3}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Badge Count */}
        <View style={styles.badgeCountContainer}>
          <Text style={[styles.badgeCount, isTopThree && { color: getRankColor(item.rank) }]}>
            {item.badge_count}
          </Text>
          <Text style={styles.badgeLabel}>badges</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyRankCard = () => {
    if (!isAuthenticated || !myRank) return null;

    return (
      <View style={styles.myRankCard} data-testid="my-rank-card">
        <View style={styles.myRankHeader}>
          <Text style={styles.myRankTitle}>Your Ranking</Text>
          {myRank.percentile !== null && (
            <View style={styles.percentileBadge}>
              <Text style={styles.percentileText}>Top {myRank.percentile}%</Text>
            </View>
          )}
        </View>

        <View style={styles.myRankStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>#{myRank.rank || '-'}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{myRank.badge_count}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{myRank.total_participants}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Nearby Users */}
        {myRank.nearby_users.length > 0 && (
          <View style={styles.nearbySection}>
            <Text style={styles.nearbyTitle}>Nearby Competitors</Text>
            {myRank.nearby_users.map((u, i) => (
              <View
                key={u.user_id}
                style={[styles.nearbyUser, u.is_current_user && styles.nearbyUserCurrent]}
              >
                <Text style={styles.nearbyRank}>#{u.rank}</Text>
                <Text style={[styles.nearbyName, u.is_current_user && styles.nearbyNameCurrent]}>
                  {u.user_name}{u.is_current_user ? ' (You)' : ''}
                </Text>
                <Text style={styles.nearbyBadges}>{u.badge_count} badges</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
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
        <Text style={styles.headerTitle}>Badge Leaderboard</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
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
          <Ionicons name="trophy" size={48} color={COLORS.gold} />
          <Text style={styles.heroTitle}>Top Badge Earners</Text>
          <Text style={styles.heroSubtitle}>
            Compete with other sellers to earn more badges and climb the leaderboard!
          </Text>
        </View>

        {/* My Rank Card */}
        {renderMyRankCard()}

        {/* Leaderboard List */}
        <View style={[styles.leaderboardContainer, isLargeScreen && styles.leaderboardContainerDesktop]}>
          <Text style={styles.sectionTitle}>Leaderboard Rankings</Text>
          
          {leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medal-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No badge earners yet</Text>
              <Text style={styles.emptySubtext}>Be the first to earn badges!</Text>
            </View>
          ) : (
            leaderboard.map((item, index) => renderLeaderboardItem(item, index))
          )}

          {loading && page > 1 && (
            <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.primary} />
          )}
        </View>

        {/* CTA Section */}
        {!isAuthenticated && (
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Join the Competition!</Text>
            <Text style={styles.ctaText}>Sign up to start earning badges and climb the leaderboard.</Text>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.ctaButtonText}>Sign Up Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Seasonal Gallery Link */}
        <TouchableOpacity
          style={styles.seasonalGalleryLink}
          onPress={() => router.push('/badges/seasonal-gallery')}
        >
          <Ionicons name="sparkles" size={20} color="#EC4899" />
          <Text style={styles.seasonalGalleryLinkText}>Browse Past Seasonal Badges</Text>
          <Ionicons name="chevron-forward" size={20} color="#EC4899" />
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
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  myRankCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  myRankTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  percentileBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentileText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  myRankStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  nearbySection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  nearbyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  nearbyUser: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  nearbyUserCurrent: {
    backgroundColor: COLORS.primaryLight,
  },
  nearbyRank: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  nearbyName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  nearbyNameCurrent: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  nearbyBadges: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  leaderboardContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    marginBottom: 16,
  },
  leaderboardContainerDesktop: {
    borderRadius: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topThreeItem: {
    backgroundColor: '#FFFBEB',
  },
  currentUserItem: {
    backgroundColor: COLORS.primaryLight,
  },
  rankContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  currentUserName: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  badgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  moreBadges: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  badgeCountContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  badgeCount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  badgeLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  seasonalGalleryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FDF2F8',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
  },
  seasonalGalleryLinkText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#EC4899',
    flex: 1,
  },
});
