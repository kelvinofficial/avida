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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/utils/api';
import { useResponsive } from '../../src/hooks/useResponsive';
import { DesktopPageLayout } from '../../src/components/layout';
import { useLoginRedirect } from '../../src/hooks/useLoginRedirect';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  gold: '#FFB300',
  silver: '#94A3B8',
  bronze: '#CD7F32',
};

const getBadgeIcon = (iconName: string): any => {
  const iconMap: Record<string, any> = {
    'verified': 'checkmark-circle',
    'trophy': 'trophy',
    'star': 'star',
    'medal': 'medal',
    'diamond': 'diamond',
    'heart': 'heart',
    'flame': 'flame',
    'shield': 'shield-checkmark',
    'crown': 'ribbon',
    'rocket': 'rocket',
    'flash': 'flash',
    'sparkles': 'sparkles',
  };
  return iconMap[iconName] || 'ribbon';
};

interface BadgeProgress {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: string;
  display_priority: number;
  points_value: number;
  is_earned: boolean;
  earned_at: string | null;
  progress: {
    current: number;
    target: number;
    percent: number;
    label: string;
  };
}

const BadgeCard = ({ badge, isDesktop }: { badge: BadgeProgress; isDesktop?: boolean }) => {
  const earned = badge.is_earned;
  
  return (
    <View 
      style={[
        styles.badgeCard, 
        isDesktop && styles.badgeCardDesktop,
        !earned && styles.badgeCardLocked
      ]}
      data-testid={`badge-${badge.badge_id}`}
    >
      <View style={[
        styles.badgeIconContainer,
        { backgroundColor: earned ? badge.color + '20' : COLORS.border }
      ]}>
        <Ionicons 
          name={getBadgeIcon(badge.icon)} 
          size={isDesktop ? 32 : 28} 
          color={earned ? badge.color : COLORS.textLight} 
        />
        {earned && (
          <View style={styles.earnedBadge}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.badgeInfo}>
        <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>
          {badge.name}
        </Text>
        <Text style={styles.badgeDescription} numberOfLines={2}>
          {badge.description}
        </Text>
        
        {!earned && badge.progress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${badge.progress.percent}%`, backgroundColor: badge.color }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{badge.progress.label}</Text>
          </View>
        )}
        
        {earned && badge.earned_at && (
          <Text style={styles.earnedDate}>
            Earned {new Date(badge.earned_at).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      <View style={styles.badgePoints}>
        <Text style={[styles.pointsValue, !earned && styles.pointsValueLocked]}>
          +{badge.points_value}
        </Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </View>
  );
};

const EmptyState = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.emptyContainer, isDesktop && styles.emptyContainerDesktop]}>
    <View style={[styles.emptyIcon, isDesktop && styles.emptyIconDesktop]}>
      <Ionicons name="ribbon-outline" size={isDesktop ? 64 : 48} color={COLORS.textSecondary} />
    </View>
    <Text style={[styles.emptyTitle, isDesktop && styles.emptyTitleDesktop]}>No badges yet</Text>
    <Text style={styles.emptySubtitle}>
      Complete activities to earn badges and showcase your achievements.
    </Text>
  </View>
);

export default function BadgesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const { goToLogin } = useLoginRedirect();
  const isLargeScreen = isDesktop || isTablet;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<BadgeProgress[]>([]);
  const [availableBadges, setAvailableBadges] = useState<BadgeProgress[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  const fetchBadges = useCallback(async () => {
    try {
      const response = await api.get('/badges/progress');
      const data = response.data;
      
      const earned = data.badges?.filter((b: BadgeProgress) => b.is_earned) || [];
      const available = data.badges?.filter((b: BadgeProgress) => !b.is_earned) || [];
      
      setEarnedBadges(earned);
      setAvailableBadges(available);
      setTotalPoints(data.total_points || 0);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBadges();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchBadges]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBadges();
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // Desktop Layout
  if (isLargeScreen) {
    if (!isAuthenticated) {
      return (
        <DesktopPageLayout title="Badges" icon="ribbon-outline">
          <View style={styles.unauthContainer}>
            <View style={styles.unauthIcon}>
              <Ionicons name="ribbon-outline" size={64} color={COLORS.gold} />
            </View>
            <Text style={styles.unauthTitle}>Sign in to view badges</Text>
            <Text style={styles.unauthSubtitle}>
              Earn badges by completing activities and showcase your achievements
            </Text>
            <TouchableOpacity style={styles.signInButton} onPress={() => goToLogin()}>
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </DesktopPageLayout>
      );
    }

    const headerContent = (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{earnedBadges.length}</Text>
          <Text style={styles.statLabel}>Badges Earned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{availableBadges.length}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
      </View>
    );

    return (
      <DesktopPageLayout
        title="Badges"
        subtitle={`${earnedBadges.length} earned · ${totalPoints} points`}
        icon="ribbon-outline"
        headerContent={headerContent}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : earnedBadges.length === 0 && availableBadges.length === 0 ? (
          <EmptyState isDesktop />
        ) : (
          <>
            {earnedBadges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Earned Badges</Text>
                <View style={styles.badgesGrid}>
                  {earnedBadges.map((badge) => (
                    <BadgeCard key={badge.badge_id} badge={badge} isDesktop />
                  ))}
                </View>
              </View>
            )}
            
            {availableBadges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Badges</Text>
                <View style={styles.badgesGrid}>
                  {availableBadges.map((badge) => (
                    <BadgeCard key={badge.badge_id} badge={badge} isDesktop />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </DesktopPageLayout>
    );
  }

  // Mobile Layout
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.mobileContainer} edges={['top']}>
        <View style={styles.mobileHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Badges</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.mobileAuthPrompt}>
          <Ionicons name="ribbon-outline" size={48} color={COLORS.gold} />
          <Text style={styles.mobileAuthText}>Please sign in to view badges</Text>
          <TouchableOpacity style={styles.mobileSignInBtn} onPress={() => goToLogin()}>
            <Text style={styles.mobileSignInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mobileContainer} edges={['top']}>
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>Badges</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.mobileContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Stats */}
        <View style={styles.mobileStats}>
          <View style={styles.mobileStatItem}>
            <Text style={styles.mobileStatValue}>{earnedBadges.length}</Text>
            <Text style={styles.mobileStatLabel}>Earned</Text>
          </View>
          <View style={styles.mobileStatItem}>
            <Text style={styles.mobileStatValue}>{totalPoints}</Text>
            <Text style={styles.mobileStatLabel}>Points</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {earnedBadges.length > 0 && (
              <View style={styles.mobileSection}>
                <Text style={styles.mobileSectionTitle}>Earned</Text>
                {earnedBadges.map((badge) => (
                  <BadgeCard key={badge.badge_id} badge={badge} />
                ))}
              </View>
            )}
            
            {availableBadges.length > 0 && (
              <View style={styles.mobileSection}>
                <Text style={styles.mobileSectionTitle}>Available</Text>
                {availableBadges.map((badge) => (
                  <BadgeCard key={badge.badge_id} badge={badge} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Section
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  // Badge Card
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeCardDesktop: {
    width: 'calc(50% - 8px)' as any,
    marginBottom: 0,
  },
  badgeCardLocked: {
    opacity: 0.75,
  },
  badgeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  earnedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  badgeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  badgeNameLocked: {
    color: COLORS.textSecondary,
  },
  badgeDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  earnedDate: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  badgePoints: {
    alignItems: 'center',
    marginLeft: 12,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pointsValueLocked: {
    color: COLORS.textLight,
  },
  pointsLabel: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  // Empty & Unauth
  unauthContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  unauthIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  unauthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  unauthSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 24,
  },
  signInButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainerDesktop: {
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconDesktop: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyTitleDesktop: {
    fontSize: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Mobile
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  mobileContent: {
    padding: 16,
  },
  mobileStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  mobileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mobileStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  mobileStatLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mobileSection: {
    marginBottom: 20,
  },
  mobileSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  mobileAuthPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mobileAuthText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  mobileSignInBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  mobileSignInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
