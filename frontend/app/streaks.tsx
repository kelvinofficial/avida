import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
  flame: '#F97316',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  streak_bonus_points: number;
  last_completion?: string;
  next_streak_badge?: {
    threshold: number;
    name: string;
  };
}

interface StreakLeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  is_current_user?: boolean;
}

export default function StreakLeaderboardScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const [myStreak, setMyStreak] = useState<StreakData | null>(null);
  const [leaderboard, setLeaderboard] = useState<StreakLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      // Fetch my streak if authenticated
      if (isAuthenticated) {
        try {
          const streakRes = await api.get('/streaks/my-streak');
          setMyStreak(streakRes.data);
        } catch (err) {
          console.error('Failed to fetch my streak:', err);
        }
      }

      // Fetch leaderboard (this endpoint needs to be created)
      try {
        const leaderboardRes = await api.get('/streaks/leaderboard');
        setLeaderboard(leaderboardRes.data.leaderboard || []);
      } catch (err) {
        // If endpoint doesn't exist, create mock data
        console.error('Failed to fetch streak leaderboard:', err);
        setLeaderboard([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStreakIcon = (streak: number): keyof typeof Ionicons.glyphMap => {
    if (streak >= 10) return 'rocket';
    if (streak >= 5) return 'bonfire';
    if (streak >= 3) return 'flame';
    return 'flame-outline';
  };

  const getStreakColor = (streak: number): string => {
    if (streak >= 10) return '#8B5CF6';
    if (streak >= 5) return '#EF4444';
    if (streak >= 3) return COLORS.flame;
    return COLORS.textSecondary;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { backgroundColor: '#FEF3C7', borderColor: COLORS.gold };
    if (rank === 2) return { backgroundColor: '#F3F4F6', borderColor: COLORS.silver };
    if (rank === 3) return { backgroundColor: '#FED7AA', borderColor: COLORS.bronze };
    return {};
  };

  const renderMyStreakCard = () => {
    if (!isAuthenticated || !myStreak) return null;

    const streakColor = getStreakColor(myStreak.current_streak);
    const progress = myStreak.next_streak_badge 
      ? (myStreak.current_streak / myStreak.next_streak_badge.threshold) * 100 
      : 100;

    return (
      <View style={styles.myStreakCard}>
        <View style={styles.myStreakHeader}>
          <Text style={styles.myStreakTitle}>Your Streak</Text>
          <View style={[styles.streakBadge, { backgroundColor: `${streakColor}20` }]}>
            <Ionicons name={getStreakIcon(myStreak.current_streak)} size={16} color={streakColor} />
            <Text style={[styles.streakBadgeText, { color: streakColor }]}>
              {myStreak.current_streak} {myStreak.current_streak === 1 ? 'Challenge' : 'Challenges'}
            </Text>
          </View>
        </View>

        <View style={styles.streakStats}>
          <View style={styles.streakStat}>
            <Ionicons name="flame" size={24} color={streakColor} />
            <Text style={styles.streakStatValue}>{myStreak.current_streak}</Text>
            <Text style={styles.streakStatLabel}>Current</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakStat}>
            <Ionicons name="trophy" size={24} color={COLORS.gold} />
            <Text style={styles.streakStatValue}>{myStreak.longest_streak}</Text>
            <Text style={styles.streakStatLabel}>Longest</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakStat}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            <Text style={styles.streakStatValue}>{myStreak.total_completions}</Text>
            <Text style={styles.streakStatLabel}>Total</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakStat}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={styles.streakStatValue}>+{myStreak.streak_bonus_points}</Text>
            <Text style={styles.streakStatLabel}>Bonus Pts</Text>
          </View>
        </View>

        {myStreak.next_streak_badge && (
          <View style={styles.nextBadgeSection}>
            <Text style={styles.nextBadgeLabel}>Next Badge: {myStreak.next_streak_badge.name}</Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, progress)}%`, backgroundColor: streakColor }]} />
              </View>
              <Text style={styles.progressText}>
                {myStreak.current_streak}/{myStreak.next_streak_badge.threshold}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderLeaderboardItem = (entry: StreakLeaderboardEntry) => {
    const isMe = entry.user_id === user?.user_id;
    const rankStyle = getRankStyle(entry.rank);
    const streakColor = getStreakColor(entry.current_streak);

    return (
      <View 
        key={entry.user_id} 
        style={[
          styles.leaderboardItem, 
          isMe && styles.leaderboardItemMe,
          rankStyle,
        ]}
      >
        <View style={styles.rankContainer}>
          {entry.rank <= 3 ? (
            <View style={[styles.rankBadge, { backgroundColor: entry.rank === 1 ? COLORS.gold : entry.rank === 2 ? COLORS.silver : COLORS.bronze }]}>
              <Text style={styles.rankBadgeText}>{entry.rank}</Text>
            </View>
          ) : (
            <Text style={styles.rankText}>#{entry.rank}</Text>
          )}
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{entry.user_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={[styles.userName, isMe && styles.userNameMe]}>
              {entry.user_name}{isMe && ' (You)'}
            </Text>
            <Text style={styles.userSubtext}>
              {entry.total_completions} challenges completed
            </Text>
          </View>
        </View>

        <View style={styles.streakInfo}>
          <View style={[styles.streakIndicator, { backgroundColor: `${streakColor}20` }]}>
            <Ionicons name={getStreakIcon(entry.current_streak)} size={18} color={streakColor} />
            <Text style={[styles.streakValue, { color: streakColor }]}>{entry.current_streak}</Text>
          </View>
          <Text style={styles.streakLabel}>streak</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.flame} />
          <Text style={styles.loadingText}>Loading streaks...</Text>
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
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && styles.scrollContentDesktop,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.flame} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Ionicons name="flame" size={48} color={COLORS.flame} />
          <Text style={styles.heroTitle}>Challenge Streaks</Text>
          <Text style={styles.heroSubtitle}>
            Complete challenges consecutively to build your streak and earn bonus badges!
          </Text>
        </View>

        {/* Streak Badges Info */}
        <View style={styles.badgesInfoCard}>
          <Text style={styles.badgesInfoTitle}>Streak Badges</Text>
          <View style={styles.badgesRow}>
            <View style={styles.badgeInfo}>
              <View style={[styles.badgeIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="flame" size={20} color={COLORS.flame} />
              </View>
              <Text style={styles.badgeInfoName}>Hot Streak</Text>
              <Text style={styles.badgeInfoThreshold}>3 in a row</Text>
            </View>
            <View style={styles.badgeInfo}>
              <View style={[styles.badgeIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="bonfire" size={20} color="#EF4444" />
              </View>
              <Text style={styles.badgeInfoName}>On Fire</Text>
              <Text style={styles.badgeInfoThreshold}>5 in a row</Text>
            </View>
            <View style={styles.badgeInfo}>
              <View style={[styles.badgeIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="rocket" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.badgeInfoName}>Unstoppable</Text>
              <Text style={styles.badgeInfoThreshold}>10 in a row</Text>
            </View>
          </View>
        </View>

        {/* My Streak Card */}
        {renderMyStreakCard()}

        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>Top Streakers</Text>
          
          {leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flame-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No streaks yet</Text>
              <Text style={styles.emptySubtext}>Be the first to build a challenge streak!</Text>
            </View>
          ) : (
            leaderboard.map(renderLeaderboardItem)
          )}
        </View>

        {/* CTA */}
        {!isAuthenticated && (
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Start Your Streak!</Text>
            <Text style={styles.ctaText}>Sign up to participate in challenges and build your streak.</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/login')}>
              <Text style={styles.ctaButtonText}>Sign Up Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Links */}
        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/challenges')}>
          <Ionicons name="flag-outline" size={20} color={COLORS.primary} />
          <Text style={styles.linkButtonText}>View Challenges</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/leaderboard')}>
          <Ionicons name="trophy-outline" size={20} color={COLORS.primary} />
          <Text style={styles.linkButtonText}>Badge Leaderboard</Text>
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
    lineHeight: 20,
  },
  badgesInfoCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  badgesInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  badgeInfo: {
    alignItems: 'center',
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeInfoName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  badgeInfoThreshold: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  myStreakCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.flame,
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
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakStat: {
    alignItems: 'center',
  },
  streakStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  streakStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  nextBadgeSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  nextBadgeLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 45,
    textAlign: 'right',
  },
  leaderboardSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  leaderboardItemMe: {
    backgroundColor: `${COLORS.flame}15`,
    borderWidth: 1,
    borderColor: COLORS.flame,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
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
    marginLeft: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  userNameMe: {
    color: COLORS.flame,
    fontWeight: '600',
  },
  userSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streakValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
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
    backgroundColor: `${COLORS.flame}10`,
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
    backgroundColor: COLORS.flame,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
    flex: 1,
  },
});
