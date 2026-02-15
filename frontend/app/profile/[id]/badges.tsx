import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import api from '../../../src/utils/api';
import { useResponsive } from '../../../src/hooks/useResponsive';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

interface BadgeProfile {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  total_badges: number;
  rank?: number;
  badges: {
    name: string;
    description: string;
    icon: string;
    color: string;
  }[];
  showcase_badges: {
    name: string;
    description: string;
    icon: string;
    color: string;
  }[];
  og_meta: {
    title: string;
    description: string;
    type: string;
    url: string;
  };
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

export default function ShareBadgesScreen() {
  const router = useRouter();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const [profile, setProfile] = useState<BadgeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/badges/share/${userId}`);
        setProfile(response.data);
      } catch (err: any) {
        console.error('Error fetching badge profile:', err);
        setError(err.response?.data?.detail || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleShare = async () => {
    if (!profile) return;
    
    const message = `Check out ${profile.user_name}'s badge collection on Avida! They've earned ${profile.total_badges} badges.`;
    const url = profile.og_meta.url;
    
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading badge profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Badge Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Open Graph Meta Tags for Social Sharing */}
      <Head>
        <title>{profile.og_meta.title}</title>
        <meta property="og:title" content={profile.og_meta.title} />
        <meta property="og:description" content={profile.og_meta.description} />
        <meta property="og:type" content={profile.og_meta.type} />
        <meta property="og:url" content={profile.og_meta.url} />
        <meta property="og:image" content="https://marketplace-hub-264.preview.emergentagent.com/badge-share-preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={profile.og_meta.title} />
        <meta name="twitter:description" content={profile.og_meta.description} />
      </Head>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Badge Profile</Text>
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
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.user_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            {profile.rank && profile.rank <= 3 && (
              <View style={styles.rankBadge}>
                <Ionicons 
                  name={profile.rank === 1 ? 'trophy' : 'medal'} 
                  size={16} 
                  color={profile.rank === 1 ? '#FFD700' : profile.rank === 2 ? '#C0C0C0' : '#CD7F32'} 
                />
              </View>
            )}
          </View>
          
          <Text style={styles.userName}>{profile.user_name}</Text>
          
          {profile.rank && (
            <Text style={styles.rankText}>Ranked #{profile.rank} on Leaderboard</Text>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.total_badges}</Text>
              <Text style={styles.statLabel}>Badges Earned</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => router.push(`/profile/${profile.user_id}` as any)}
          >
            <Ionicons name="person-outline" size={18} color={COLORS.primary} />
            <Text style={styles.viewProfileText}>View Full Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Showcase Badges */}
        {profile.showcase_badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Showcase Badges</Text>
            <View style={styles.badgesGrid}>
              {profile.showcase_badges.map((badge, index) => (
                <View key={index} style={styles.badgeCard}>
                  <View style={[styles.badgeIconContainer, { backgroundColor: `${badge.color}20` }]}>
                    <Ionicons name={getIconName(badge.icon)} size={32} color={badge.color} />
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDescription} numberOfLines={2}>
                    {badge.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* All Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            All Badges ({profile.badges.length})
          </Text>
          <View style={styles.badgesGrid}>
            {profile.badges.map((badge, index) => (
              <View key={index} style={styles.badgeCard}>
                <View style={[styles.badgeIconContainer, { backgroundColor: `${badge.color}20` }]}>
                  <Ionicons name={getIconName(badge.icon)} size={32} color={badge.color} />
                </View>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDescription} numberOfLines={2}>
                  {badge.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Start Earning Badges!</Text>
          <Text style={styles.ctaText}>
            Join Avida Marketplace and earn badges by listing items, making sales, and building your reputation.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.ctaButtonText}>Join Now</Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard Link */}
        <TouchableOpacity
          style={styles.leaderboardLink}
          onPress={() => router.push('/leaderboard')}
        >
          <Ionicons name="trophy-outline" size={20} color={COLORS.primary} />
          <Text style={styles.leaderboardLinkText}>View Badge Leaderboard</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    paddingBottom: 32,
  },
  scrollContentDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  rankText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
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
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  badgeCard: {
    width: '50%',
    padding: 8,
    alignItems: 'center',
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  ctaSection: {
    backgroundColor: COLORS.primaryLight,
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
    lineHeight: 20,
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
  leaderboardLink: {
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
  leaderboardLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
    flex: 1,
  },
});
