import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Share,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../../src/utils/api';
import { useAuthStore } from '../../../src/store/authStore';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#388E3C',
  error: '#D32F2F',
  warning: '#F57C00',
  star: '#FFB800',
};

// Star Rating Input
const StarRatingInput = ({ rating, onRatingChange }: { rating: number; onRatingChange: (r: number) => void }) => (
  <View style={styles.starInput}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
        <Ionicons
          name={star <= rating ? 'star' : 'star-outline'}
          size={32}
          color={star <= rating ? COLORS.star : COLORS.border}
        />
      </TouchableOpacity>
    ))}
  </View>
);

// Star Display
const StarDisplay = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <View style={styles.starDisplay}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
        size={size}
        color={COLORS.star}
      />
    ))}
  </View>
);

// Listing Card
const ListingCard = ({ item, onPress }: { item: any; onPress: () => void }) => (
  <TouchableOpacity style={styles.listingCard} onPress={onPress}>
    <Image
      source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
      style={styles.listingImage}
    />
    <View style={styles.listingInfo}>
      <Text style={styles.listingPrice}>€{item.price?.toLocaleString()}</Text>
      <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
    </View>
  </TouchableOpacity>
);

// Review Card
const ReviewCard = ({ review }: { review: any }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      {review.reviewer_picture ? (
        <Image source={{ uri: review.reviewer_picture }} style={styles.reviewerAvatar} />
      ) : (
        <View style={styles.reviewerAvatarPlaceholder}>
          <Text style={styles.reviewerInitials}>
            {review.reviewer_name?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
      )}
      <View style={styles.reviewerInfo}>
        <Text style={styles.reviewerName}>{review.reviewer_name || 'Anonymous'}</Text>
        <View style={styles.reviewMeta}>
          <StarDisplay rating={review.rating} size={12} />
          <Text style={styles.reviewDate}>
            {new Date(review.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
    {review.comment && (
      <Text style={styles.reviewComment}>{review.comment}</Text>
    )}
  </View>
);

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const isOwnProfile = user?.user_id === id;

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, listingsRes, reviewsRes] = await Promise.all([
        api.get(`/profile/public/${id}`),
        api.get(`/users/${id}/listings`, { params: { status: 'active', limit: 20 } }),
        api.get(`/users/${id}/reviews`, { params: { limit: 10 } }),
      ]);
      
      setProfile(profileRes.data);
      setIsFollowing(profileRes.data.is_following || false);
      setListings(listingsRes.data.listings || []);
      setReviews(reviewsRes.data.reviews || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${profile?.name}'s profile on avida!`,
        url: `https://avida.app/profile/${id}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/users/${id}/follow`);
        setIsFollowing(false);
        setProfile((p: any) => ({
          ...p,
          stats: { ...p.stats, followers: p.stats.followers - 1 }
        }));
      } else {
        await api.post(`/users/${id}/follow`);
        setIsFollowing(true);
        setProfile((p: any) => ({
          ...p,
          stats: { ...p.stats, followers: p.stats.followers + 1 }
        }));
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (reviewRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setSubmittingReview(true);
    try {
      const response = await api.post(`/users/${id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      
      // Add new review to list
      setReviews(prev => [response.data.review, ...prev]);
      
      // Update profile rating
      fetchProfile();
      
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment('');
      Alert.alert('Success', 'Review submitted successfully');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleMessage = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Navigate to chat or start conversation
    Alert.alert('Message', 'Start a conversation with this seller');
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const getListingRoute = (item: any) => {
    if (item.type === 'property') return `/property/${item.id}`;
    if (item.type === 'auto') return `/auto/${item.id}`;
    return `/listing/${item.id}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile?.name}</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {profile?.picture ? (
            <Image source={{ uri: profile.picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials(profile?.name)}</Text>
            </View>
          )}
          
          <Text style={styles.profileName}>{profile?.name}</Text>
          
          {/* Trust Badges */}
          <View style={styles.badgesRow}>
            {profile?.email_verified && (
              <View style={styles.badge}>
                <Ionicons name="mail" size={12} color={COLORS.success} />
                <Text style={styles.badgeText}>Email</Text>
              </View>
            )}
            {profile?.phone_verified && (
              <View style={styles.badge}>
                <Ionicons name="call" size={12} color={COLORS.success} />
                <Text style={styles.badgeText}>Phone</Text>
              </View>
            )}
            {profile?.id_verified && (
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                <Text style={styles.badgeText}>ID</Text>
              </View>
            )}
          </View>

          {profile?.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          )}

          {profile?.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <StarDisplay rating={profile?.rating || 0} size={18} />
            <Text style={styles.ratingText}>
              {profile?.rating?.toFixed(1) || '0.0'} ({profile?.total_ratings || 0} reviews)
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.stats?.active_listings || 0}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.stats?.sold_listings || 0}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.stat}>
              <Text style={styles.statValue}>{profile?.stats?.followers || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.stat}>
              <Text style={styles.statValue}>{profile?.stats?.following || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.memberSince}>
            Member since {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? COLORS.primary : '#fff'} />
                ) : (
                  <>
                    <Ionicons
                      name={isFollowing ? 'checkmark' : 'person-add-outline'}
                      size={18}
                      color={isFollowing ? COLORS.primary : '#fff'}
                    />
                    <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                <Text style={styles.messageBtnText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'listings' && styles.tabActive]}
            onPress={() => setActiveTab('listings')}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={activeTab === 'listings' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'listings' && styles.tabTextActive]}>
              Listings ({listings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Ionicons
              name="star-outline"
              size={18}
              color={activeTab === 'reviews' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
              Reviews ({reviews.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'listings' ? (
            listings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={40} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No active listings</Text>
              </View>
            ) : (
              <View style={styles.listingsGrid}>
                {listings.map(item => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    onPress={() => router.push(getListingRoute(item))}
                  />
                ))}
              </View>
            )
          ) : (
            <>
              {/* Write Review Button */}
              {!isOwnProfile && isAuthenticated && (
                <TouchableOpacity
                  style={styles.writeReviewBtn}
                  onPress={() => setShowReviewModal(true)}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.writeReviewBtnText}>Write a Review</Text>
                </TouchableOpacity>
              )}

              {reviews.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-outline" size={40} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>No reviews yet</Text>
                  {!isOwnProfile && (
                    <Text style={styles.emptySubtext}>Be the first to leave a review!</Text>
                  )}
                </View>
              ) : (
                <View style={styles.reviewsList}>
                  {reviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Write a Review</Text>
            <TouchableOpacity
              onPress={handleSubmitReview}
              disabled={submittingReview || reviewRating === 0}
            >
              {submittingReview ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={[styles.modalSubmit, reviewRating === 0 && styles.modalSubmitDisabled]}>
                  Submit
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.ratingLabel}>How was your experience?</Text>
            <StarRatingInput rating={reviewRating} onRatingChange={setReviewRating} />
            
            <Text style={styles.commentLabel}>Leave a comment (optional)</Text>
            <TextInput
              style={styles.commentInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share your experience with this seller..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{reviewComment.length}/500</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: { fontSize: 15, color: COLORS.error, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  profileHeader: {
    backgroundColor: COLORS.surface,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarInitials: { fontSize: 36, fontWeight: '700', color: COLORS.primary },
  profileName: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '500', color: COLORS.success },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: { fontSize: 14, color: COLORS.textSecondary },
  bio: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  ratingText: { fontSize: 14, color: COLORS.textSecondary },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  memberSince: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  followingBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  followingBtnText: { color: COLORS.primary },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  messageBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  content: { padding: 16 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  listingCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.border,
  },
  listingInfo: { padding: 10 },
  listingPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  listingTitle: { fontSize: 13, color: COLORS.text, marginTop: 4 },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  writeReviewBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  reviewsList: { gap: 12 },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  reviewHeader: { flexDirection: 'row', gap: 12 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20 },
  reviewerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitials: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  reviewDate: { fontSize: 12, color: COLORS.textSecondary },
  reviewComment: { fontSize: 14, color: COLORS.text, marginTop: 12, lineHeight: 20 },
  starInput: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  starDisplay: { flexDirection: 'row', gap: 2 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: { fontSize: 16, color: COLORS.textSecondary },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  modalSubmit: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  modalSubmitDisabled: { color: COLORS.border },
  modalContent: { padding: 24 },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
});
