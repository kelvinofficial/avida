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
  Dimensions,
  Linking,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/utils/api';
import { safeGoBack } from '../../src/utils/navigation';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  verified: '#1976D2',
};

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  identifier: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  brand_color: string | null;
  primary_categories: string[];
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  is_premium: boolean;
  verification_tier: string;
  total_listings: number;
  total_views: number;
  created_at: string;
  user?: {
    name: string;
    picture: string | null;
    rating: number;
    total_ratings: number;
  };
}

interface Listing {
  id: string;
  title: string;
  price: number;
  images: string[];
  location: string;
  created_at: string;
  views: number;
  category_id: string;
}

// ============ LISTING CARD ============
const ListingCard = ({ item, onPress }: { item: Listing; onPress: () => void }) => {
  const hasImage = item.images && item.images.length > 0 && item.images[0];

  return (
    <TouchableOpacity 
      style={cardStyles.container} 
      onPress={onPress}
      data-testid={`listing-card-${item.id}`}
    >
      {hasImage ? (
        <Image source={{ uri: item.images[0] }} style={cardStyles.image} />
      ) : (
        <View style={[cardStyles.image, { backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="image-outline" size={32} color={COLORS.textSecondary} />
        </View>
      )}
      <View style={cardStyles.content}>
        <Text style={cardStyles.price}>EUR {item.price?.toLocaleString()}</Text>
        <Text style={cardStyles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={cardStyles.location} numberOfLines={1}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          {' '}{item.location}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.border,
  },
  content: {
    padding: 10,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  location: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

// ============ CATEGORY CHIP ============
const CategoryChip = ({ name, isActive, onPress }: { name: string; isActive: boolean; onPress: () => void }) => (
  <TouchableOpacity 
    style={[chipStyles.chip, isActive && chipStyles.chipActive]} 
    onPress={onPress}
  >
    <Text style={[chipStyles.chipText, isActive && chipStyles.chipTextActive]}>{name}</Text>
  </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
});

// Category name mapping
const CATEGORY_NAMES: Record<string, string> = {
  'auto_vehicles': 'Auto & Vehicles',
  'properties': 'Properties',
  'electronics': 'Electronics',
  'phones_tablets': 'Phones & Tablets',
  'home_furniture': 'Home & Furniture',
  'fashion_beauty': 'Fashion & Beauty',
  'jobs_services': 'Jobs & Services',
  'kids_baby': 'Kids & Baby',
  'sports_hobbies': 'Sports & Hobbies',
  'pets': 'Pets',
};

// ============ MAIN SCREEN ============
export default function BusinessProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalListings, setTotalListings] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get(`/business-profiles/public/${slug}`);
      setProfile(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching business profile:', error);
      if (error.response?.status === 404) {
        setError('Business profile not found');
      } else {
        setError('Failed to load business profile');
      }
    }
  }, [slug]);

  const fetchListings = useCallback(async (pageNum: number = 1, category?: string | null, reset: boolean = false) => {
    try {
      if (reset) {
        setLoadingMore(false);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', '18');
      if (category) {
        params.append('category', category);
      }

      const response = await api.get(`/business-profiles/public/${slug}/listings?${params.toString()}`);
      
      if (reset || pageNum === 1) {
        setListings(response.data.listings);
      } else {
        setListings(prev => [...prev, ...response.data.listings]);
      }
      
      setTotalListings(response.data.total);
      setHasMore(response.data.listings.length === 18);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [slug]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProfile();
      await fetchListings(1, null, true);
      setLoading(false);
    };
    
    if (slug) {
      loadData();
    }
  }, [slug, fetchProfile, fetchListings]);

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    fetchListings(1, category, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchListings(page + 1, selectedCategory);
    }
  };

  const handleCall = () => {
    if (profile?.phone) {
      Linking.openURL(`tel:${profile.phone}`);
    }
  };

  const handleEmail = () => {
    if (profile?.email) {
      Linking.openURL(`mailto:${profile.email}`);
    }
  };

  const handleShare = async () => {
    if (!profile) return;
    
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://analytics-dash-v2.preview.emergentagent.com';
    const profileUrl = `${baseUrl.replace('/api', '')}/business/${slug}`;
    
    try {
      // Fetch OG meta data for rich sharing
      const ogResponse = await api.get(`/business-profiles/${slug}/og-meta`);
      const shareData = ogResponse.data;
      
      if (Platform.OS === 'web') {
        // Web: Use native share API if available, otherwise copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: shareData.title,
            text: shareData.share_text,
            url: shareData.share_url,
          });
        } else {
          await navigator.clipboard.writeText(shareData.share_url);
          Alert.alert('Link Copied!', 'Business profile link has been copied to your clipboard');
        }
      } else {
        // Mobile: Use React Native Share
        await Share.share({
          title: shareData.title,
          message: `${shareData.share_text}\n\n${shareData.share_url}`,
          url: shareData.share_url,
        });
      }
    } catch (error) {
      // Fallback if OG meta fetch fails
      const fallbackUrl = profileUrl;
      const fallbackText = `Check out ${profile.business_name} on Avida Marketplace!`;
      
      if (Platform.OS === 'web') {
        try {
          await navigator.clipboard.writeText(fallbackUrl);
          Alert.alert('Link Copied!', 'Business profile link has been copied to your clipboard');
        } catch (e) {
          console.error('Failed to copy:', e);
        }
      } else {
        await Share.share({
          title: profile.business_name,
          message: `${fallbackText}\n\n${fallbackUrl}`,
          url: fallbackUrl,
        });
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} data-testid="back-button">
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} data-testid="back-button">
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="storefront-outline" size={64} color={COLORS.border} />
          <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
          <TouchableOpacity 
            style={styles.retryBtn} 
            onPress={() => router.back()}
          >
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const brandColor = profile.brand_color || COLORS.primary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router)} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} data-testid="share-button">
          <Ionicons name="share-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: brandColor + '15' }]}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            {profile.logo_url ? (
              <Image source={{ uri: profile.logo_url }} style={styles.logo} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: brandColor + '30' }]}>
                <Ionicons name="storefront" size={40} color={brandColor} />
              </View>
            )}
          </View>

          {/* Business Info */}
          <View style={styles.businessInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.businessName}>{profile.business_name}</Text>
              {profile.is_verified && (
                <View style={[
                  styles.verifiedBadge,
                  profile.is_premium && styles.premiumBadge
                ]} data-testid="verified-badge">
                  <Ionicons 
                    name={profile.is_premium ? "diamond" : "checkmark-circle"} 
                    size={18} 
                    color={profile.is_premium ? '#FF8F00' : COLORS.verified} 
                  />
                  <Text style={[
                    styles.verifiedText,
                    profile.is_premium && styles.premiumText
                  ]}>
                    {profile.is_premium ? 'Premium' : 'Verified'}
                  </Text>
                </View>
              )}
            </View>

            {profile.city && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.locationText}>
                  {profile.city}{profile.country ? `, ${profile.country}` : ''}
                </Text>
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.total_listings}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.total_views || 0}</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
              {profile.user?.rating > 0 && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#FFB300" />
                      <Text style={styles.statValue}>{profile.user.rating.toFixed(1)}</Text>
                    </View>
                    <Text style={styles.statLabel}>{profile.user.total_ratings} reviews</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Description */}
        {profile.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{profile.description}</Text>
          </View>
        )}

        {/* Contact Buttons */}
        {(profile.phone || profile.email) && (
          <View style={styles.contactButtons}>
            {profile.phone && (
              <TouchableOpacity 
                style={[styles.contactBtn, { backgroundColor: brandColor }]} 
                onPress={handleCall}
                data-testid="call-button"
              >
                <Ionicons name="call-outline" size={20} color="#fff" />
                <Text style={styles.contactBtnText}>Call</Text>
              </TouchableOpacity>
            )}
            {profile.email && (
              <TouchableOpacity 
                style={[styles.contactBtn, styles.contactBtnOutline, { borderColor: brandColor }]} 
                onPress={handleEmail}
                data-testid="email-button"
              >
                <Ionicons name="mail-outline" size={20} color={brandColor} />
                <Text style={[styles.contactBtnText, { color: brandColor }]}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Categories Filter */}
        {profile.primary_categories && profile.primary_categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              <CategoryChip 
                name="All" 
                isActive={selectedCategory === null}
                onPress={() => handleCategorySelect(null)}
              />
              {profile.primary_categories.map((cat) => (
                <CategoryChip
                  key={cat}
                  name={CATEGORY_NAMES[cat] || cat}
                  isActive={selectedCategory === cat}
                  onPress={() => handleCategorySelect(cat)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Listings Section */}
        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>
            Listings ({totalListings})
          </Text>

          {listings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No listings yet</Text>
            </View>
          ) : (
            <View style={styles.listingsGrid}>
              {listings.map((item) => (
                <ListingCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/listing/${item.id}`)}
                />
              ))}
            </View>
          )}

          {/* Load More */}
          {hasMore && listings.length > 0 && (
            <TouchableOpacity 
              style={styles.loadMoreBtn} 
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.loadMoreText}>Load More</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  profileHeader: {
    padding: 20,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  businessInfo: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.verified,
  },
  premiumBadge: {
    backgroundColor: '#FFF8E1',
  },
  premiumText: {
    color: '#FF8F00',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 18,
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
    height: 30,
    backgroundColor: COLORS.border,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    padding: 16,
    backgroundColor: COLORS.surface,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.surface,
    marginTop: 8,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  contactBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  contactBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  categoriesSection: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
  },
  listingsSection: {
    padding: 16,
    backgroundColor: COLORS.surface,
    marginTop: 8,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
