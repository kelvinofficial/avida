import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/utils/api';
import { useResponsive } from '../../src/hooks/useResponsive';
import { DesktopHeader } from '../../src/components/layout';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// Map badge icon names to Ionicons
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

export default function BadgesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const { width } = useWindowDimensions();
  const isLargeScreen = isDesktop || isTablet;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [showcaseBadges, setShowcaseBadges] = useState<string[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  const fetchBadgeProgress = useCallback(async () => {
    try {
      const res = await api.get('/badges/progress');
      setBadgeProgress(res.data.progress || []);
      setShowcaseBadges(res.data.showcase_badges || []);
      setTotalPoints(res.data.total_points || 0);
      setTotalEarned(res.data.total_badges_earned || 0);
    } catch (err) {
      console.error('Failed to fetch badge progress:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBadgeProgress();
      // Mark all badges as viewed when user visits this page
      api.post('/badges/mark-viewed', {}).catch(err => {
        console.error('Failed to mark badges as viewed:', err);
      });
    }
  }, [isAuthenticated, fetchBadgeProgress]);

  const toggleShowcaseBadge = async (badgeId: string) => {
    // Only earned badges can be showcased
    const badge = badgeProgress.find(b => b.badge_id === badgeId);
    if (!badge?.is_earned) return;

    let newShowcase: string[];
    if (showcaseBadges.includes(badgeId)) {
      newShowcase = showcaseBadges.filter(id => id !== badgeId);
    } else {
      if (showcaseBadges.length >= 5) {
        // Remove first, add new
        newShowcase = [...showcaseBadges.slice(1), badgeId];
      } else {
        newShowcase = [...showcaseBadges, badgeId];
      }
    }

    setShowcaseBadges(newShowcase);
    
    // Save to backend
    setSaving(true);
    try {
      await api.put('/badges/showcase', { badge_ids: newShowcase });
    } catch (err) {
      console.error('Failed to update showcase:', err);
      // Revert on error
      setShowcaseBadges(showcaseBadges);
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBadgeProgress();
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="ribbon-outline" size={64} color={COLORS.primary} />
          <Text style={styles.title}>Sign in to view your badges</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login?redirect=/profile/badges')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const earnedBadges = badgeProgress.filter(b => b.is_earned);
  const inProgressBadges = badgeProgress.filter(b => !b.is_earned);

  const renderBadgeCard = (badge: BadgeProgress, isShowcaseSection = false) => {
    const isShowcased = showcaseBadges.includes(badge.badge_id);
    
    return (
      <TouchableOpacity
        key={badge.badge_id}
        style={[
          styles.badgeCard,
          badge.is_earned && styles.badgeCardEarned,
          isShowcased && styles.badgeCardShowcased,
          isLargeScreen && styles.badgeCardDesktop,
        ]}
        onPress={() => badge.is_earned && toggleShowcaseBadge(badge.badge_id)}
        disabled={!badge.is_earned || saving}
        activeOpacity={badge.is_earned ? 0.7 : 1}
      >
        {/* Badge Icon */}
        <View style={[styles.badgeIconContainer, { backgroundColor: badge.color + '20' }]}>
          <Ionicons name={getBadgeIcon(badge.icon)} size={28} color={badge.color} />
          {!badge.is_earned && (
            <View style={styles.lockedOverlay}>
              <Ionicons name="lock-closed" size={14} color={COLORS.textLight} />
            </View>
          )}
        </View>

        {/* Badge Info */}
        <View style={styles.badgeInfo}>
          <View style={styles.badgeHeader}>
            <Text style={[styles.badgeName, !badge.is_earned && styles.badgeNameLocked]} numberOfLines={1}>
              {badge.name}
            </Text>
            {badge.is_earned && (
              <View style={styles.earnedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              </View>
            )}
            {isShowcased && (
              <View style={styles.showcasedBadge}>
                <Ionicons name="star" size={12} color={COLORS.warning} />
              </View>
            )}
          </View>
          <Text style={styles.badgeDescription} numberOfLines={2}>
            {badge.description}
          </Text>
          
          {/* Progress Bar */}
          {!badge.is_earned && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${badge.progress.percent}%`, backgroundColor: badge.color }
                  ]} 
                />
              </View>
              <Text style={styles.progressLabel}>{badge.progress.label}</Text>
            </View>
          )}
          
          {/* Points */}
          <View style={styles.pointsContainer}>
            <Ionicons name="flash" size={12} color={COLORS.warning} />
            <Text style={styles.pointsText}>{badge.points_value} pts</Text>
          </View>
        </View>

        {/* Showcase Toggle */}
        {badge.is_earned && (
          <TouchableOpacity 
            style={[styles.showcaseToggle, isShowcased && styles.showcaseToggleActive]}
            onPress={() => toggleShowcaseBadge(badge.badge_id)}
          >
            <Ionicons 
              name={isShowcased ? 'star' : 'star-outline'} 
              size={20} 
              color={isShowcased ? COLORS.warning : COLORS.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const content = (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentDesktop]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Stats Summary */}
      <View style={[styles.statsContainer, isLargeScreen && styles.statsContainerDesktop]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalEarned}</Text>
          <Text style={styles.statLabel}>Badges Earned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{showcaseBadges.length}/5</Text>
          <Text style={styles.statLabel}>Showcased</Text>
        </View>
      </View>

      {/* Showcase Section */}
      {showcaseBadges.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={20} color={COLORS.warning} />
            <Text style={styles.sectionTitle}>Your Showcase</Text>
            <Text style={styles.sectionSubtitle}>Visible on your public profile</Text>
          </View>
          <View style={[styles.badgeGrid, isLargeScreen && styles.badgeGridDesktop]}>
            {showcaseBadges.map(badgeId => {
              const badge = badgeProgress.find(b => b.badge_id === badgeId);
              return badge ? renderBadgeCard(badge, true) : null;
            })}
          </View>
        </View>
      )}

      {/* Earned Badges */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={20} color={COLORS.success} />
          <Text style={styles.sectionTitle}>Earned Badges ({earnedBadges.length})</Text>
          <Text style={styles.sectionSubtitle}>Tap to add to showcase</Text>
        </View>
        {earnedBadges.length > 0 ? (
          <View style={[styles.badgeGrid, isLargeScreen && styles.badgeGridDesktop]}>
            {earnedBadges.map(badge => renderBadgeCard(badge))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={40} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No badges earned yet</Text>
            <Text style={styles.emptySubtext}>Complete activities to earn badges</Text>
          </View>
        )}
      </View>

      {/* In Progress Badges */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="hourglass-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.sectionTitle}>In Progress ({inProgressBadges.length})</Text>
        </View>
        <View style={[styles.badgeGrid, isLargeScreen && styles.badgeGridDesktop]}>
          {inProgressBadges.map(badge => renderBadgeCard(badge))}
        </View>
      </View>

      {/* Seasonal Gallery Link */}
      <TouchableOpacity
        style={styles.seasonalGalleryLink}
        onPress={() => router.push('/badges/seasonal-gallery')}
      >
        <View style={styles.seasonalGalleryIcon}>
          <Ionicons name="sparkles" size={24} color="#EC4899" />
        </View>
        <View style={styles.seasonalGalleryText}>
          <Text style={styles.seasonalGalleryTitle}>Past Seasonal Badges</Text>
          <Text style={styles.seasonalGallerySubtitle}>Browse limited-time badges from past events</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Desktop Layout
  if (isLargeScreen) {
    return (
      <View style={styles.container}>
        <DesktopHeader />
        <View style={styles.desktopWrapper}>
          <View style={styles.desktopContent}>
            {/* Page Header */}
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <View style={styles.pageHeaderText}>
                <Text style={styles.pageTitle}>My Badges</Text>
                <Text style={styles.pageSubtitle}>Track your achievements and customize your showcase</Text>
              </View>
            </View>
            {content}
          </View>
        </View>
      </View>
    );
  }

  // Mobile Layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>My Badges</Text>
        <View style={{ width: 40 }} />
      </View>
      {content}
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
    backgroundColor: COLORS.background,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 24,
  },
  signInBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Mobile Header
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Desktop
  desktopWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  desktopContent: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 24,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  pageHeaderText: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    padding: 0,
    paddingBottom: 40,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statsContainerDesktop: {
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 'auto',
  },

  // Badge Grid
  badgeGrid: {
    gap: 12,
  },
  badgeGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Badge Card
  badgeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeCardEarned: {
    borderColor: COLORS.primaryLight,
  },
  badgeCardShowcased: {
    borderColor: COLORS.warning,
    backgroundColor: '#FFFBEB',
  },
  badgeCardDesktop: {
    width: 'calc(50% - 6px)',
  },
  badgeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  lockedOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 2,
  },
  badgeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  badgeNameLocked: {
    color: COLORS.textSecondary,
  },
  earnedBadge: {
    marginLeft: 4,
  },
  showcasedBadge: {
    marginLeft: 2,
  },
  badgeDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Progress
  progressContainer: {
    marginTop: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Points
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Showcase Toggle
  showcaseToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
  showcaseToggleActive: {
    backgroundColor: '#FEF3C7',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  // Seasonal Gallery Link
  seasonalGalleryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  seasonalGalleryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  seasonalGalleryText: {
    flex: 1,
  },
  seasonalGalleryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  seasonalGallerySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
