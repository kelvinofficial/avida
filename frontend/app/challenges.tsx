import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/utils/api';
import { useAuthStore } from '../src/store/authStore';
import { useResponsive } from '../src/hooks/useResponsive';
import { Footer } from '../src/components/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#22C55E',
  warning: '#F59E0B',
  seasonal: '#EC4899',
};

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'weekly' | 'monthly' | 'special' | 'seasonal';
  target: number;
  icon: string;
  color: string;
  badge_reward: {
    name: string;
    description: string;
    icon: string;
    color: string;
    points_value: number;
  };
  start_date: string;
  end_date: string;
  days_remaining: number;
  hours_remaining: number;
  progress: number;
  completed: boolean;
  joined: boolean;
  badge_earned?: boolean;
  theme?: string;
  categories?: string[];
}

interface ChallengeDetail extends Challenge {
  leaderboard: {
    rank: number;
    user_id: string;
    user_name: string;
    avatar_url?: string;
    progress: number;
    completed: boolean;
  }[];
  total_participants: number;
  my_progress?: number;
  my_completed?: boolean;
  my_rank?: number;
}

const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    'flash': 'flash',
    'star': 'star',
    'rocket': 'rocket',
    'trophy': 'trophy',
    'layers': 'layers',
    'cash': 'cash',
    'chatbubbles': 'chatbubbles',
    'ribbon': 'ribbon',
    'medal': 'medal',
    'heart': 'heart',
    'flower': 'flower',
    'sunny': 'sunny',
    'school': 'school',
    'moon': 'moon',
    'gift': 'gift',
    'sparkles': 'sparkles',
  };
  return iconMap[iconName] || 'ribbon';
};

export default function ChallengesScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [joiningChallenge, setJoiningChallenge] = useState<string | null>(null);

  const fetchChallenges = useCallback(async (refresh: boolean = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const response = await api.get('/challenges');
      setChallenges(response.data.challenges || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchChallengeDetail = async (challengeId: string) => {
    try {
      const response = await api.get(`/challenges/${challengeId}`);
      setSelectedChallenge(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching challenge details:', error);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      setJoiningChallenge(challengeId);
      await api.post(`/challenges/${challengeId}/join`);
      
      // Update local state
      setChallenges(prev => prev.map(c => 
        c.id === challengeId ? { ...c, joined: true } : c
      ));
      
      // Refresh challenge details if modal is open
      if (selectedChallenge?.id === challengeId) {
        fetchChallengeDetail(challengeId);
      }
    } catch (error) {
      console.error('Error joining challenge:', error);
    } finally {
      setJoiningChallenge(null);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const renderProgressBar = (progress: number, target: number, color: string) => {
    const percentage = Math.min(100, (progress / target) * 100);
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${percentage}%`, backgroundColor: color }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{progress}/{target}</Text>
      </View>
    );
  };

  const renderTimeRemaining = (days: number, hours: number) => {
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} left`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} left`;
    }
    return 'Ending soon!';
  };

  const renderChallengeCard = (challenge: Challenge) => {
    const isCompleted = challenge.completed;
    const badgeEarned = challenge.badge_earned;

    return (
      <TouchableOpacity
        key={challenge.id}
        style={[
          styles.challengeCard,
          isCompleted && styles.challengeCardCompleted,
        ]}
        onPress={() => fetchChallengeDetail(challenge.id)}
        data-testid={`challenge-card-${challenge.id}`}
      >
        {/* Badge indicator */}
        {badgeEarned && (
          <View style={styles.badgeEarnedIndicator}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.badgeEarnedText}>Badge Earned!</Text>
          </View>
        )}

        <View style={styles.challengeHeader}>
          <View style={[styles.challengeIconContainer, { backgroundColor: `${challenge.color}20` }]}>
            <Ionicons name={getIconName(challenge.icon)} size={28} color={challenge.color} />
          </View>
          <View style={styles.challengeInfo}>
            <View style={styles.challengeTitleRow}>
              <Text style={styles.challengeName}>{challenge.name}</Text>
              <View style={[styles.typeBadge, { backgroundColor: challenge.type === 'weekly' ? '#EEF2FF' : '#FEF3C7' }]}>
                <Text style={[styles.typeText, { color: challenge.type === 'weekly' ? '#6366F1' : '#F59E0B' }]}>
                  {challenge.type === 'weekly' ? 'Weekly' : 'Monthly'}
                </Text>
              </View>
            </View>
            <Text style={styles.challengeDescription} numberOfLines={2}>
              {challenge.description}
            </Text>
          </View>
        </View>

        {/* Progress */}
        {renderProgressBar(challenge.progress, challenge.target, challenge.color)}

        {/* Footer */}
        <View style={styles.challengeFooter}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.timeText}>
              {renderTimeRemaining(challenge.days_remaining, challenge.hours_remaining)}
            </Text>
          </View>
          
          {!challenge.joined && !isCompleted ? (
            <TouchableOpacity
              style={[styles.joinButton, { backgroundColor: challenge.color }]}
              onPress={(e) => {
                e.stopPropagation();
                joinChallenge(challenge.id);
              }}
              disabled={joiningChallenge === challenge.id}
            >
              {joiningChallenge === challenge.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.joinButtonText}>Join</Text>
              )}
            </TouchableOpacity>
          ) : isCompleted ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          ) : (
            <View style={styles.joinedBadge}>
              <Ionicons name="person" size={14} color={COLORS.primary} />
              <Text style={styles.joinedText}>Joined</Text>
            </View>
          )}
        </View>

        {/* Reward preview */}
        <View style={styles.rewardPreview}>
          <Ionicons name="gift-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.rewardText}>
            Reward: {challenge.badge_reward.name} (+{challenge.badge_reward.points_value} pts)
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedChallenge) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isLargeScreen && styles.modalContentDesktop]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedChallenge.name}</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Challenge Info */}
              <View style={styles.detailSection}>
                <View style={[styles.detailIconContainer, { backgroundColor: `${selectedChallenge.color}20` }]}>
                  <Ionicons name={getIconName(selectedChallenge.icon)} size={48} color={selectedChallenge.color} />
                </View>
                <Text style={styles.detailDescription}>{selectedChallenge.description}</Text>
                
                {/* Time remaining */}
                <View style={styles.detailTimeContainer}>
                  <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailTimeText}>
                    {renderTimeRemaining(selectedChallenge.days_remaining, selectedChallenge.hours_remaining)}
                  </Text>
                </View>
              </View>

              {/* My Progress */}
              {isAuthenticated && selectedChallenge.my_progress !== undefined && (
                <View style={styles.myProgressSection}>
                  <Text style={styles.sectionTitle}>Your Progress</Text>
                  {renderProgressBar(selectedChallenge.my_progress, selectedChallenge.target, selectedChallenge.color)}
                  {selectedChallenge.my_rank && (
                    <Text style={styles.myRankText}>
                      You're ranked #{selectedChallenge.my_rank} in this challenge
                    </Text>
                  )}
                </View>
              )}

              {/* Reward */}
              <View style={styles.rewardSection}>
                <Text style={styles.sectionTitle}>Badge Reward</Text>
                <View style={styles.rewardCard}>
                  <View style={[styles.rewardIconContainer, { backgroundColor: `${selectedChallenge.badge_reward.color}20` }]}>
                    <Ionicons 
                      name={getIconName(selectedChallenge.badge_reward.icon)} 
                      size={32} 
                      color={selectedChallenge.badge_reward.color} 
                    />
                  </View>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardName}>{selectedChallenge.badge_reward.name}</Text>
                    <Text style={styles.rewardDescription}>{selectedChallenge.badge_reward.description}</Text>
                    <Text style={styles.rewardPoints}>+{selectedChallenge.badge_reward.points_value} points</Text>
                  </View>
                </View>
              </View>

              {/* Leaderboard */}
              {selectedChallenge.leaderboard.length > 0 && (
                <View style={styles.leaderboardSection}>
                  <Text style={styles.sectionTitle}>
                    Leaderboard ({selectedChallenge.total_participants} participants)
                  </Text>
                  {selectedChallenge.leaderboard.map((entry, index) => (
                    <View 
                      key={entry.user_id} 
                      style={[
                        styles.leaderboardEntry,
                        entry.user_id === user?.user_id && styles.leaderboardEntryMe
                      ]}
                    >
                      <Text style={styles.leaderboardRank}>#{entry.rank}</Text>
                      <View style={styles.leaderboardUserInfo}>
                        <View style={styles.leaderboardAvatar}>
                          <Text style={styles.leaderboardAvatarText}>
                            {entry.user_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.leaderboardName}>
                          {entry.user_name}
                          {entry.user_id === user?.user_id && ' (You)'}
                        </Text>
                      </View>
                      <View style={styles.leaderboardProgress}>
                        <Text style={styles.leaderboardProgressText}>
                          {entry.progress}/{selectedChallenge.target}
                        </Text>
                        {entry.completed && (
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Join Button */}
            {!selectedChallenge.joined && !selectedChallenge.completed && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.joinChallengeBtn, { backgroundColor: selectedChallenge.color }]}
                  onPress={() => joinChallenge(selectedChallenge.id)}
                  disabled={joiningChallenge === selectedChallenge.id}
                >
                  {joiningChallenge === selectedChallenge.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="flag" size={20} color="#fff" />
                      <Text style={styles.joinChallengeBtnText}>Join Challenge</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading challenges...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const seasonalChallenges = challenges.filter(c => c.type === 'seasonal');
  const weeklyChallenges = challenges.filter(c => c.type === 'weekly');
  const monthlyChallenges = challenges.filter(c => c.type === 'monthly');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenges</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && styles.scrollContentDesktop,
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => fetchChallenges(true)} 
            tintColor={COLORS.primary} 
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Ionicons name="flag" size={48} color={COLORS.primary} />
          <Text style={styles.heroTitle}>Badge Challenges</Text>
          <Text style={styles.heroSubtitle}>
            Complete challenges to earn exclusive limited-time badges and climb the leaderboard!
          </Text>
        </View>

        {/* Seasonal Challenges - Featured Section */}
        {seasonalChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, styles.seasonalHeader]}>
              <Ionicons name="sparkles" size={20} color="#EC4899" />
              <Text style={[styles.sectionTitleMain, { color: '#EC4899' }]}>Seasonal Events</Text>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Limited Time</Text>
              </View>
            </View>
            {seasonalChallenges.map(renderChallengeCard)}
          </View>
        )}

        {/* Weekly Challenges */}
        {weeklyChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color="#6366F1" />
              <Text style={styles.sectionTitleMain}>Weekly Challenges</Text>
            </View>
            {weeklyChallenges.map(renderChallengeCard)}
          </View>
        )}

        {/* Monthly Challenges */}
        {monthlyChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitleMain}>Monthly Challenges</Text>
            </View>
            {monthlyChallenges.map(renderChallengeCard)}
          </View>
        )}

        {/* CTA for non-authenticated users */}
        {!isAuthenticated && (
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Join the Competition!</Text>
            <Text style={styles.ctaText}>
              Sign up to participate in challenges and earn exclusive badges.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.ctaButtonText}>Sign Up Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Link to Leaderboard */}
        <TouchableOpacity
          style={styles.leaderboardLink}
          onPress={() => router.push('/leaderboard')}
        >
          <Ionicons name="trophy-outline" size={20} color={COLORS.primary} />
          <Text style={styles.leaderboardLinkText}>View Badge Leaderboard</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </ScrollView>

      {renderDetailModal()}
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
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleMain: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  seasonalHeader: {
    backgroundColor: '#FDF2F8',
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  featuredBadge: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  challengeCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  challengeCardCompleted: {
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  badgeEarnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    top: 12,
    right: 12,
  },
  badgeEarnedText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  challengeHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  challengeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  challengeDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarBackground: {
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
  challengeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.success,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 4,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rewardText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalContentDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 24,
    marginVertical: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailDescription: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  detailTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailTimeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  myProgressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  myRankText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 8,
  },
  rewardSection: {
    marginBottom: 24,
  },
  rewardCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  rewardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  rewardPoints: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  leaderboardSection: {
    marginBottom: 24,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leaderboardEntryMe: {
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  leaderboardRank: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  leaderboardUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  leaderboardAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  leaderboardName: {
    fontSize: 14,
    color: COLORS.text,
  },
  leaderboardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leaderboardProgressText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  joinChallengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  joinChallengeBtnText: {
    fontSize: 16,
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
