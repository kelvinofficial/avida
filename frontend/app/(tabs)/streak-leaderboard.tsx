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
  fire: '#F97316',
  fireLight: '#FFF7ED',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

interface StreakEntry {
  rank: number;
  user_id: string;
  user_name: string;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  streak_bonus_points: number;
  last_completion?: string;
}

interface MyStreak {
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  streak_bonus_points: number;
  last_completion?: string;
  rank?: number;
}

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

const getStreakIcon = (streak: number): keyof typeof Ionicons.glyphMap => {
  if (streak >= 10) return 'rocket';
  if (streak >= 5) return 'bonfire';
  if (streak >= 3) return 'flame';
  return 'flash';
};

const getStreakColor = (streak: number): string => {
  if (streak >= 10) return '#8B5CF6';
  if (streak >= 5) return '#EF4444';
  if (streak >= 3) return '#F97316';
  return '#22C55E';
};

export default function StreakLeaderboardScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const [leaderboard, setLeaderboard] = useState<StreakEntry[]>([]);
  const [myStreak, setMyStreak] = useState<MyStreak | null>(null);
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

      const response = await api.get(`/streaks/leaderboard?page=${pageNum}&limit=20`);
      const data = response.data;

      if (refresh || pageNum === 1) {
        setLeaderboard(data.leaderboard || []);
      } else {
        setLeaderboard(prev => [...prev, ...(data.leaderboard || [])]);
      }

      setHasMore(pageNum < (data.pagination?.pages || 0));
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching streak leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMyStreak = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await api.get('/streaks/my-streak');
      setMyStreak(response.data);
    } catch (error) {
      console.error('Error fetching my streak:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLeaderboard(1);
    fetchMyStreak();
  }, [fetchLeaderboard, fetchMyStreak]);

  const handleRefresh = () => {
    fetchLeaderboard(1, true);
    fetchMyStreak();
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchLeaderboard(page + 1);
    }
  };

  const handleShare = async () => {
    const message = `Check out the Streak Leaderboard on Avida Marketplace! See who's on fire with challenge completions! #AvidaMarketplace`;
    const url = `${process.env.EXPO_PUBLIC_BACKEND_URL}/streak-leaderboard`;
    
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

  const formatLastCompletion = (date?: string) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  const renderStreakBadge = (streak: number) => {
    const color = getStreakColor(streak);
    const icon = getStreakIcon(streak);
    return (
      <View style={[styles.streakBadge, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.streakBadgeText, { color }]}>{streak}</Text>
      </View>
    );
  };

  const renderMyStreakCard = () => {
    if (!isAuthenticated) return null;

    return (
      <View style={styles.myStreakCard} data-testid="my-streak-card">
        <View style={styles.myStreakHeader}>
          <Text style={styles.myStreakTitle}>Your Streak</Text>
          {myStreak && myStreak.current_streak >= 3 && (
            <View style={[styles.streakStatusBadge, { backgroundColor: `${getStreakColor(myStreak.current_streak)}20` }]}>
              <Ionicons name={getStreakIcon(myStreak.current_streak)} size={16} color={getStreakColor(myStreak.current_streak)} />
              <Text style={[styles.streakStatusText, { color: getStreakColor(myStreak.current_streak) }]}>
                {myStreak.current_streak >= 10 ? 'Unstoppable!' : myStreak.current_streak >= 5 ? 'On Fire!' : 'Hot Streak!'}
              </Text>
            </View>
          )}
        </View>

        {myStreak ? (
          <>
            <View style={styles.myStreakStats}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.fireLight }]}>
                  <Ionicons name="flame" size={24} color={COLORS.fire} />
                </View>
                <Text style={styles.statValue}>{myStreak.current_streak}</Text>
                <Text style={styles.statLabel}>Current</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="trophy" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{myStreak.longest_streak}</Text>
                <Text style={styles.statLabel}>Best</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.statValue}>{myStreak.total_completions}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>

            <View style={styles.bonusPointsRow}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.bonusPointsText}>
                +{myStreak.streak_bonus_points} bonus points earned from streaks
              </Text>
            </View>

            {myStreak.last_completion && (
              <Text style={styles.lastCompletionText}>
                Last challenge completed: {formatLastCompletion(myStreak.last_completion)}
              </Text>
            )}
          </>
        ) : (
          <View style={styles.noStreakContainer}>
            <Ionicons name="flame-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.noStreakText}>No streak yet</Text>
            <Text style={styles.noStreakSubtext}>Complete challenges to build your streak!</Text>
            <TouchableOpacity 
              style={styles.startStreakBtn}
              onPress={() => router.push('/challenges')}
            >
              <Text style={styles.startStreakBtnText}>View Challenges</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderLeaderboardItem = (item: StreakEntry) => {
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
        data-testid={`streak-leaderboard-item-${item.rank}`}
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
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{item.user_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, isCurrentUser && styles.currentUserName]}>
              {item.user_name}
              {isCurrentUser && ' (You)'}
            </Text>
            <View style={styles.statsRow}>
              <Text style={styles.statSmall}>
                Best: {item.longest_streak} | Completed: {item.total_completions}
              </Text>
            </View>
          </View>
        </View>

        {/* Current Streak */}
        <View style={styles.streakContainer}>
          {renderStreakBadge(item.current_streak)}
          <Text style={styles.streakLabel}>streak</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.fire} />
          <Text style={styles.loadingText}>Loading streak leaderboard...</Text>
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
        <Text style={styles.headerTitle}>Streak Leaderboard</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.fire} />
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
            <Ionicons name="flame" size={48} color={COLORS.fire} />
          </View>
          <Text style={styles.heroTitle}>Challenge Streaks</Text>
          <Text style={styles.heroSubtitle}>
            Complete challenges consistently to build your streak and earn bonus points!
          </Text>
        </View>

        {/* Streak Tiers Info */}
        <View style={styles.tiersCard}>
          <Text style={styles.tiersTitle}>Streak Bonuses</Text>
          <View style={styles.tiersRow}>
            <View style={styles.tierItem}>
              <View style={[styles.tierIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="flash" size={16} color="#22C55E" />
              </View>
              <Text style={styles.tierLabel}>3+</Text>
              <Text style={styles.tierBonus}>+25 pts</Text>
            </View>
            <View style={styles.tierItem}>
              <View style={[styles.tierIcon, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="flame" size={16} color="#F97316" />
              </View>
              <Text style={styles.tierLabel}>5+</Text>
              <Text style={styles.tierBonus}>+50 pts</Text>
            </View>
            <View style={styles.tierItem}>
              <View style={[styles.tierIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="bonfire" size={16} color="#EF4444" />
              </View>
              <Text style={styles.tierLabel}>7+</Text>
              <Text style={styles.tierBonus}>+75 pts</Text>
            </View>
            <View style={styles.tierItem}>
              <View style={[styles.tierIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="rocket" size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.tierLabel}>10+</Text>
              <Text style={styles.tierBonus}>+100 pts</Text>
            </View>
          </View>
        </View>

        {/* My Streak Card */}
        {renderMyStreakCard()}

        {/* Leaderboard List */}
        <View style={[styles.leaderboardContainer, isLargeScreen && styles.leaderboardContainerDesktop]}>
          <Text style={styles.sectionTitle}>Top Streakers</Text>
          
          {leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flame-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No streaks yet</Text>
              <Text style={styles.emptySubtext}>Be the first to build a streak!</Text>
            </View>
          ) : (
            leaderboard.map((item) => renderLeaderboardItem(item))
          )}

          {loading && page > 1 && (
            <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.fire} />
          )}
        </View>

        {/* CTA Section */}
        {!isAuthenticated && (
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Start Your Streak!</Text>
            <Text style={styles.ctaText}>Sign up to participate in challenges and build your streak.</Text>
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
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.fireLight,
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
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  tiersCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  tiersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  tiersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tierItem: {
    alignItems: 'center',
  },
  tierIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  tierBonus: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  myStreakCard: {
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
  myStreakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  myStreakTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  streakStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  myStreakStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: COLORS.border,
  },
  bonusPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  bonusPointsText: {
    fontSize: 13,
    color: '#92400E',
  },
  lastCompletionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  noStreakContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noStreakText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 12,
  },
  noStreakSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  startStreakBtn: {
    backgroundColor: COLORS.fire,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startStreakBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    backgroundColor: COLORS.fireLight,
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
    backgroundColor: COLORS.fire,
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
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  currentUserName: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsRow: {
    marginTop: 2,
  },
  statSmall: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  streakContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streakBadgeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    backgroundColor: COLORS.fire,
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
