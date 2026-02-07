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
import { useResponsive } from '../../../src/hooks/useResponsive';

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

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return 'Just now';
  if (diffInMins < 60) return `${diffInMins} min ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
  return date.toLocaleDateString();
};

// Helper function to check if listing is less than 24 hours old
const isJustListed = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  return diffInHours < 24;
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
  const { isDesktop, isTablet, isReady } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  
  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

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
      // Fetch profile first (required)
      const profileRes = await api.get(`/profile/public/${id}`);
      setProfile(profileRes.data);
      setIsFollowing(profileRes.data.is_following || false);
      
      // Fetch listings and reviews in parallel
      const [listingsRes, reviewsRes] = await Promise.allSettled([
        api.get(`/users/${id}/listings`, { params: { status: 'active', limit: 20 } }),
        api.get(`/users/${id}/reviews`, { params: { limit: 20 } })
      ]);
      
      // Handle listings
      if (listingsRes.status === 'fulfilled') {
        setListings(listingsRes.value.data.listings || []);
      } else {
        console.warn('Failed to fetch listings:', listingsRes.reason);
        setListings([]);
      }
      
      // Handle reviews
      if (reviewsRes.status === 'fulfilled') {
        const reviewData = reviewsRes.value.data;
        setReviews(reviewData.reviews || []);
        setRatingBreakdown(reviewData.rating_breakdown || {});
        
        // Check if current user has already reviewed
        if (isAuthenticated && user?.user_id) {
          const alreadyReviewed = (reviewData.reviews || []).some(
            (r: any) => r.reviewer_id === user.user_id
          );
          setHasReviewed(alreadyReviewed);
        }
      } else {
        console.warn('Failed to fetch reviews:', reviewsRes.reason);
        setReviews([]);
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.detail || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, isAuthenticated, user?.user_id]);

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

    if (isOwnProfile) {
      Alert.alert('Error', 'Cannot follow yourself');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/users/${id}/follow`);
        setIsFollowing(false);
        setProfile((p: any) => ({
          ...p,
          stats: { ...p.stats, followers: Math.max(0, (p.stats?.followers || 0) - 1) }
        }));
      } else {
        await api.post(`/users/${id}/follow`);
        setIsFollowing(true);
        setProfile((p: any) => ({
          ...p,
          stats: { ...p.stats, followers: (p.stats?.followers || 0) + 1 }
        }));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update follow status';
      if (errorMessage.includes('not found')) {
        Alert.alert('Error', 'This seller account is not yet registered');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isOwnProfile) {
      Alert.alert('Error', 'Cannot review yourself');
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
      
      // Add new review to list and mark as reviewed
      setReviews(prev => [response.data.review, ...prev]);
      setHasReviewed(true);
      
      // Update profile rating
      fetchProfile();
      
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment('');
      Alert.alert('Success', 'Review submitted successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to submit review';
      if (errorMessage.includes('already reviewed')) {
        Alert.alert('Error', 'You have already reviewed this user');
        setHasReviewed(true);
      } else if (errorMessage.includes('not found')) {
        Alert.alert('Error', 'This seller account is not yet registered');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleMessage = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (isOwnProfile) {
      Alert.alert('Error', 'Cannot message yourself');
      return;
    }

    setMessageLoading(true);
    try {
      // Create or get existing direct conversation
      const response = await api.post('/conversations/direct', {
        user_id: id as string
      });
      
      // Navigate to the chat screen
      router.push(`/chat/${response.data.id}`);
    } catch (err: any) {
      console.error('Error starting conversation:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to start conversation';
      if (errorMessage.includes('not found')) {
        Alert.alert('Error', 'This seller account is not yet registered');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setMessageLoading(false);
    }
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

  if (loading || !isReady) {
    return (
      <SafeAreaView style={[styles.container, isLargeScreen && desktopStyles.container]} edges={['top']}>
        {isLargeScreen && (
          <View style={desktopStyles.globalHeader}>
            <View style={desktopStyles.globalHeaderInner}>
              <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
                <View style={desktopStyles.logoIcon}>
                  <Ionicons name="storefront" size={20} color="#fff" />
                </View>
                <Text style={desktopStyles.logoText}>avida</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {!isLargeScreen && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={{ width: 24 }} />
          </View>
        )}
        <View style={[styles.centerContent, isLargeScreen && desktopStyles.pageWrapper]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, isLargeScreen && desktopStyles.container]} edges={['top']}>
        {isLargeScreen && (
          <View style={desktopStyles.globalHeader}>
            <View style={desktopStyles.globalHeaderInner}>
              <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
                <View style={desktopStyles.logoIcon}>
                  <Ionicons name="storefront" size={20} color="#fff" />
                </View>
                <Text style={desktopStyles.logoText}>avida</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {!isLargeScreen && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={{ width: 24 }} />
          </View>
        )}
        <View style={[styles.centerContent, isLargeScreen && desktopStyles.pageWrapper]}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============ DESKTOP VIEW ============
  if (isLargeScreen) {
    return (
      <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
        {/* Global Header */}
        <View style={desktopStyles.globalHeader}>
          <View style={desktopStyles.globalHeaderInner}>
            <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
              <View style={desktopStyles.logoIcon}>
                <Ionicons name="storefront" size={20} color="#fff" />
              </View>
              <Text style={desktopStyles.logoText}>avida</Text>
            </TouchableOpacity>
            <View style={desktopStyles.headerActions}>
              {isAuthenticated ? (
                <>
                  <TouchableOpacity style={desktopStyles.headerIconBtn} onPress={() => router.push('/notifications')}>
                    <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={desktopStyles.headerIconBtn} onPress={() => router.push('/profile')}>
                    <Ionicons name="person-circle-outline" size={26} color={COLORS.text} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={desktopStyles.signInBtn} onPress={() => router.push('/login')}>
                    <Text style={desktopStyles.signInBtnText}>Sign In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={desktopStyles.signUpBtn} onPress={() => router.push('/login')}>
                    <Text style={desktopStyles.signUpBtnText}>Sign Up</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={desktopStyles.postBtn} onPress={() => router.push('/post')}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={desktopStyles.postBtnText}>Post Listing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Page Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        >
          <View style={desktopStyles.pageWrapper}>
            {/* Back Button */}
            <View style={desktopStyles.pageHeader}>
              <TouchableOpacity style={desktopStyles.backBtn} onPress={handleGoBack}>
                <Ionicons name="arrow-back" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={desktopStyles.pageTitle}>Seller Profile</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={desktopStyles.shareBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color={COLORS.primary} />
                <Text style={desktopStyles.shareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Desktop Profile Layout - 2 Column */}
            <View style={desktopStyles.profileLayout}>
              {/* Left Sidebar - Profile Info */}
              <View style={desktopStyles.profileSidebar}>
                <View style={desktopStyles.profileCard}>
                  {profile?.picture ? (
                    <Image source={{ uri: profile.picture }} style={desktopStyles.avatar} />
                  ) : (
                    <View style={desktopStyles.avatarPlaceholder}>
                      <Text style={desktopStyles.avatarInitials}>{getInitials(profile?.name)}</Text>
                    </View>
                  )}
                  
                  <Text style={desktopStyles.profileName}>{profile?.name}</Text>
                  
                  {/* Trust Badges */}
                  <View style={desktopStyles.badgesRow}>
                    {profile?.email_verified && (
                      <View style={desktopStyles.badge}>
                        <Ionicons name="mail" size={12} color={COLORS.success} />
                        <Text style={desktopStyles.badgeText}>Email</Text>
                      </View>
                    )}
                    {profile?.phone_verified && (
                      <View style={desktopStyles.badge}>
                        <Ionicons name="call" size={12} color={COLORS.success} />
                        <Text style={desktopStyles.badgeText}>Phone</Text>
                      </View>
                    )}
                    {profile?.id_verified && (
                      <View style={desktopStyles.badge}>
                        <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                        <Text style={desktopStyles.badgeText}>ID</Text>
                      </View>
                    )}
                  </View>

                  {profile?.location && (
                    <View style={desktopStyles.locationRow}>
                      <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={desktopStyles.locationText}>{profile.location}</Text>
                    </View>
                  )}

                  {profile?.bio && (
                    <Text style={desktopStyles.bio}>{profile.bio}</Text>
                  )}

                  {/* Rating */}
                  <View style={desktopStyles.ratingContainer}>
                    <StarDisplay rating={profile?.rating || 0} size={18} />
                    <Text style={desktopStyles.ratingText}>
                      {profile?.rating?.toFixed(1) || '0.0'} ({profile?.total_ratings || 0} reviews)
                    </Text>
                  </View>

                  {/* Stats */}
                  <View style={desktopStyles.statsRow}>
                    <View style={desktopStyles.stat}>
                      <Text style={desktopStyles.statValue}>{profile?.stats?.active_listings || 0}</Text>
                      <Text style={desktopStyles.statLabel}>Listings</Text>
                    </View>
                    <View style={desktopStyles.stat}>
                      <Text style={desktopStyles.statValue}>{profile?.stats?.sold_listings || 0}</Text>
                      <Text style={desktopStyles.statLabel}>Sold</Text>
                    </View>
                    <View style={desktopStyles.stat}>
                      <Text style={desktopStyles.statValue}>{profile?.stats?.followers || 0}</Text>
                      <Text style={desktopStyles.statLabel}>Followers</Text>
                    </View>
                    <View style={desktopStyles.stat}>
                      <Text style={desktopStyles.statValue}>{profile?.stats?.following || 0}</Text>
                      <Text style={desktopStyles.statLabel}>Following</Text>
                    </View>
                  </View>

                  <Text style={desktopStyles.memberSince}>
                    Member since {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>

                  {/* Action Buttons */}
                  {!isOwnProfile && (
                    <View style={desktopStyles.actionButtons}>
                      <TouchableOpacity
                        style={[desktopStyles.followBtn, isFollowing && desktopStyles.followingBtn]}
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
                            <Text style={[desktopStyles.followBtnText, isFollowing && desktopStyles.followingBtnText]}>
                              {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[desktopStyles.messageBtn, messageLoading && { opacity: 0.7 }]} 
                        onPress={handleMessage}
                        disabled={messageLoading}
                      >
                        {messageLoading ? (
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                          <>
                            <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                            <Text style={desktopStyles.messageBtnText}>Message</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Right Content - Listings & Reviews */}
              <View style={desktopStyles.mainContent}>
                {/* Tabs */}
                <View style={desktopStyles.tabsContainer}>
                  <TouchableOpacity
                    style={[desktopStyles.tab, activeTab === 'listings' && desktopStyles.tabActive]}
                    onPress={() => setActiveTab('listings')}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={18}
                      color={activeTab === 'listings' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[desktopStyles.tabText, activeTab === 'listings' && desktopStyles.tabTextActive]}>
                      Listings ({listings.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[desktopStyles.tab, activeTab === 'reviews' && desktopStyles.tabActive]}
                    onPress={() => setActiveTab('reviews')}
                  >
                    <Ionicons
                      name="star-outline"
                      size={18}
                      color={activeTab === 'reviews' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[desktopStyles.tabText, activeTab === 'reviews' && desktopStyles.tabTextActive]}>
                      Reviews ({reviews.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={desktopStyles.content}>
                  {activeTab === 'listings' ? (
                    listings.length === 0 ? (
                      <View style={desktopStyles.emptyState}>
                        <Ionicons name="cube-outline" size={48} color={COLORS.textSecondary} />
                        <Text style={desktopStyles.emptyText}>No active listings</Text>
                      </View>
                    ) : (
                      <View style={desktopStyles.listingsGrid}>
                        {listings.map(item => (
                          <View key={item.id} style={desktopStyles.listingCardWrapper}>
                            <TouchableOpacity 
                              style={desktopStyles.listingCard}
                              onPress={() => router.push(getListingRoute(item))}
                            >
                              <View style={desktopStyles.listingImageContainer}>
                                <Image
                                  source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
                                  style={desktopStyles.listingImage}
                                />
                                {/* Badges */}
                                <View style={desktopStyles.listingBadges}>
                                  {isJustListed(item.created_at) && (
                                    <View style={desktopStyles.justListedBadge}>
                                      <Ionicons name="time" size={10} color="#fff" />
                                      <Text style={desktopStyles.justListedBadgeText}>Just Listed</Text>
                                    </View>
                                  )}
                                  {item.is_featured && (
                                    <View style={desktopStyles.featuredBadge}>
                                      <Ionicons name="star" size={10} color="#fff" />
                                      <Text style={desktopStyles.featuredBadgeText}>Featured</Text>
                                    </View>
                                  )}
                                  {item.is_top && (
                                    <View style={desktopStyles.topBadge}>
                                      <Ionicons name="arrow-up" size={10} color="#fff" />
                                      <Text style={desktopStyles.topBadgeText}>TOP</Text>
                                    </View>
                                  )}
                                </View>
                                {/* Heart Icon */}
                                <TouchableOpacity style={desktopStyles.heartButton}>
                                  <Ionicons name="heart-outline" size={20} color="#fff" />
                                </TouchableOpacity>
                                {/* Views Counter - Bottom Right */}
                                <View style={desktopStyles.viewsOverlay}>
                                  <Ionicons name="eye-outline" size={11} color="#fff" />
                                  <Text style={desktopStyles.viewsOverlayText}>{item.views || 0}</Text>
                                </View>
                              </View>
                              <View style={desktopStyles.listingInfo}>
                                <Text style={desktopStyles.listingPrice}>€{item.price?.toLocaleString()}</Text>
                                <Text style={desktopStyles.listingTitle} numberOfLines={2}>{item.title}</Text>
                                {/* Location */}
                                {item.location && (
                                  <View style={desktopStyles.listingLocation}>
                                    <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                                    <Text style={desktopStyles.listingLocationText} numberOfLines={1}>{item.location}</Text>
                                  </View>
                                )}
                                {/* Time Posted */}
                                <Text style={desktopStyles.listingTime}>
                                  {formatTimeAgo(item.created_at)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )
                  ) : (
                    <>
                      {/* Rating Summary */}
                      {reviews.length > 0 && (
                        <View style={desktopStyles.ratingSummary}>
                          <View style={desktopStyles.ratingOverview}>
                            <Text style={desktopStyles.ratingBig}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
                            <StarDisplay rating={profile?.rating || 0} size={24} />
                            <Text style={desktopStyles.ratingCount}>{profile?.total_ratings || 0} reviews</Text>
                          </View>
                          <View style={desktopStyles.ratingBars}>
                            {[5, 4, 3, 2, 1].map(star => {
                              const count = ratingBreakdown[String(star)] || 0;
                              const total = reviews.length || 1;
                              const percentage = (count / total) * 100;
                              return (
                                <View key={star} style={desktopStyles.ratingBarRow}>
                                  <Text style={desktopStyles.ratingBarLabel}>{star}</Text>
                                  <View style={desktopStyles.ratingBarBg}>
                                    <View style={[desktopStyles.ratingBarFill, { width: `${percentage}%` }]} />
                                  </View>
                                  <Text style={desktopStyles.ratingBarCount}>{count}</Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {/* Write Review Button */}
                      {!isOwnProfile && isAuthenticated && !hasReviewed && (
                        <TouchableOpacity
                          style={desktopStyles.writeReviewBtn}
                          onPress={() => setShowReviewModal(true)}
                        >
                          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                          <Text style={desktopStyles.writeReviewBtnText}>Write a Review</Text>
                        </TouchableOpacity>
                      )}

                      {!isOwnProfile && isAuthenticated && hasReviewed && (
                        <View style={[desktopStyles.writeReviewBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                          <Text style={[desktopStyles.writeReviewBtnText, { color: COLORS.success }]}>
                            You've already reviewed this seller
                          </Text>
                        </View>
                      )}

                      {reviews.length === 0 ? (
                        <View style={desktopStyles.emptyState}>
                          <Ionicons name="chatbubble-outline" size={48} color={COLORS.textSecondary} />
                          <Text style={desktopStyles.emptyText}>No reviews yet</Text>
                          {!isOwnProfile && (
                            <Text style={desktopStyles.emptySubtext}>Be the first to leave a review!</Text>
                          )}
                        </View>
                      ) : (
                        <View style={desktopStyles.reviewsList}>
                          {reviews.map(review => (
                            <ReviewCard key={review.id} review={review} />
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Review Modal */}
        <Modal visible={showReviewModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={handleSubmitReview} disabled={submittingReview || reviewRating === 0}>
                {submittingReview ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={[styles.modalSubmit, reviewRating === 0 && styles.modalSubmitDisabled]}>Submit</Text>
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

  // ============ MOBILE VIEW ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
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
              
              <TouchableOpacity 
                style={[styles.messageBtn, messageLoading && styles.messageBtnDisabled]} 
                onPress={handleMessage}
                disabled={messageLoading}
              >
                {messageLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.messageBtnText}>Message</Text>
                  </>
                )}
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
              {/* Rating Summary */}
              {reviews.length > 0 && (
                <View style={styles.ratingSummary}>
                  <View style={styles.ratingOverview}>
                    <Text style={styles.ratingBig}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
                    <StarDisplay rating={profile?.rating || 0} size={24} />
                    <Text style={styles.ratingCount}>{profile?.total_ratings || 0} reviews</Text>
                  </View>
                  <View style={styles.ratingBars}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = ratingBreakdown[String(star)] || 0;
                      const total = reviews.length || 1;
                      const percentage = (count / total) * 100;
                      return (
                        <View key={star} style={styles.ratingBarRow}>
                          <Text style={styles.ratingBarLabel}>{star}</Text>
                          <View style={styles.ratingBarBg}>
                            <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                          </View>
                          <Text style={styles.ratingBarCount}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Write Review Button */}
              {!isOwnProfile && isAuthenticated && !hasReviewed && (
                <TouchableOpacity
                  style={styles.writeReviewBtn}
                  onPress={() => setShowReviewModal(true)}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.writeReviewBtnText}>Write a Review</Text>
                </TouchableOpacity>
              )}

              {!isOwnProfile && isAuthenticated && hasReviewed && (
                <View style={[styles.writeReviewBtn, styles.writeReviewBtnDisabled]}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={[styles.writeReviewBtnText, { color: COLORS.success }]}>
                    You've already reviewed this seller
                  </Text>
                </View>
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
  messageBtnDisabled: {
    opacity: 0.7,
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
  ratingSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  ratingOverview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  ratingBig: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
  },
  ratingCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  ratingBars: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBarLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 12,
    textAlign: 'center',
  },
  ratingBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.warning,
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 20,
    textAlign: 'right',
  },
  writeReviewBtnDisabled: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
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

// ============ DESKTOP STYLES ============
const desktopStyles = StyleSheet.create({
  container: { backgroundColor: '#F0F2F5' },
  
  // Global Header
  globalHeader: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  globalHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  signInBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  signUpBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  postBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Page Wrapper
  pageWrapper: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    minHeight: '100%',
  },
  
  // Page Header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // Profile Layout - 2 Column
  profileLayout: {
    flexDirection: 'row',
    padding: 24,
    gap: 24,
  },
  profileSidebar: {
    width: 320,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mainContent: {
    flex: 1,
  },

  // Avatar
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarInitials: { fontSize: 42, fontWeight: '700', color: COLORS.primary },
  profileName: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  
  // Badges
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '500', color: COLORS.success },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  locationText: { fontSize: 14, color: COLORS.textSecondary },
  
  // Bio
  bio: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },

  // Rating
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  ratingText: { fontSize: 14, color: COLORS.textSecondary },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  memberSince: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 20,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  followingBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  followingBtnText: { color: COLORS.primary },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  messageBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 15, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },

  // Content
  content: {},

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  // Listings Grid - 3 columns
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  listingCardWrapper: {
    width: '33.333%',
    padding: 8,
  },
  listingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listingImageContainer: {
    position: 'relative',
  },
  listingImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.border,
  },
  listingBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: '70%',
  },
  justListedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  justListedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  topBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewsOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  viewsOverlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  listingInfo: { padding: 12 },
  listingPrice: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  listingTitle: { fontSize: 14, color: COLORS.text, marginTop: 4, lineHeight: 20 },
  listingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  listingLocationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  listingTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Rating Summary
  ratingSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingOverview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  ratingBig: { fontSize: 48, fontWeight: '700', color: COLORS.text },
  ratingCount: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  ratingBars: { flex: 1, justifyContent: 'center', gap: 6 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingBarLabel: { fontSize: 14, color: COLORS.textSecondary, width: 16, textAlign: 'center' },
  ratingBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.warning,
    borderRadius: 5,
  },
  ratingBarCount: { fontSize: 14, color: COLORS.textSecondary, width: 24, textAlign: 'right' },

  // Write Review
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  writeReviewBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },

  // Reviews List
  reviewsList: { gap: 16 },
});
