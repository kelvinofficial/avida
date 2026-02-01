import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { Property } from '../../types/property';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;
const HORIZONTAL_PADDING = 16;

// Property category - One column, vertical layout
const PROPERTY_CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

// Other categories - Two column horizontal layout
const OTHER_CARD_HEIGHT = 120;

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#F57C00',
  sponsored: '#FFF3E0',
  sponsoredBorder: '#FF9800',
  verified: '#1565C0',
};

interface SimilarListing extends Property {
  similarityScore: number;
  isSponsored: boolean;
  sponsoredRank: number | null;
}

interface SimilarListingsProps {
  propertyId: string;
  onListingPress?: (listing: SimilarListing) => void;
}

// Tooltip Component
const InfoTooltip = memo(({ visible, onClose }: { visible: boolean; onClose: () => void }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={tooltipStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={tooltipStyles.container}>
        <View style={tooltipStyles.header}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={tooltipStyles.title}>Why am I seeing this?</Text>
        </View>
        <Text style={tooltipStyles.text}>
          These listings are selected based on:
        </Text>
        <View style={tooltipStyles.list}>
          <Text style={tooltipStyles.listItem}>• Same property type</Text>
          <Text style={tooltipStyles.listItem}>• Similar price range (±20%)</Text>
          <Text style={tooltipStyles.listItem}>• Same or nearby location</Text>
          <Text style={tooltipStyles.listItem}>• Similar size and features</Text>
          <Text style={tooltipStyles.listItem}>• Property condition</Text>
        </View>
        <Text style={tooltipStyles.sponsored}>
          Listings marked "Sponsored" are paid placements from verified sellers.
        </Text>
        <TouchableOpacity style={tooltipStyles.closeBtn} onPress={onClose}>
          <Text style={tooltipStyles.closeBtnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
));

const tooltipStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    maxWidth: 340,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  list: {
    marginBottom: 12,
  },
  listItem: {
    fontSize: 14,
    color: COLORS.text,
    marginVertical: 2,
  },
  sponsored: {
    fontSize: 12,
    color: COLORS.warning,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  closeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

// Quick Preview Modal
const QuickPreviewModal = memo(({ 
  listing, 
  visible, 
  onClose,
  onViewFull,
  onChat,
  onFavorite,
  isFavorited
}: { 
  listing: SimilarListing | null; 
  visible: boolean; 
  onClose: () => void;
  onViewFull: () => void;
  onChat: () => void;
  onFavorite: () => void;
  isFavorited: boolean;
}) => {
  if (!listing) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={previewStyles.overlay}>
        <View style={previewStyles.container}>
          {/* Header */}
          <View style={previewStyles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={previewStyles.headerTitle}>Quick Preview</Text>
            <TouchableOpacity onPress={onFavorite}>
              <Ionicons 
                name={isFavorited ? 'heart' : 'heart-outline'} 
                size={24} 
                color={isFavorited ? COLORS.error : COLORS.text} 
              />
            </TouchableOpacity>
          </View>

          {/* Image */}
          <Image source={{ uri: listing.images?.[0] }} style={previewStyles.image} />

          {/* Info */}
          <View style={previewStyles.info}>
            {listing.isSponsored && (
              <View style={previewStyles.sponsoredBadge}>
                <Text style={previewStyles.sponsoredText}>Sponsored</Text>
              </View>
            )}
            
            <Text style={previewStyles.price}>
              €{listing.price?.toLocaleString()}
              {listing.pricePerMonth && <Text style={previewStyles.priceUnit}>/mo</Text>}
            </Text>
            
            <Text style={previewStyles.title} numberOfLines={2}>{listing.title}</Text>
            
            <View style={previewStyles.locationRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
              <Text style={previewStyles.location}>
                {listing.location?.area}, {listing.location?.city}
              </Text>
            </View>

            {/* Stats */}
            <View style={previewStyles.stats}>
              {listing.bedrooms && (
                <View style={previewStyles.stat}>
                  <Ionicons name="bed-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={previewStyles.statText}>{listing.bedrooms}</Text>
                </View>
              )}
              {listing.bathrooms && (
                <View style={previewStyles.stat}>
                  <Ionicons name="water-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={previewStyles.statText}>{listing.bathrooms}</Text>
                </View>
              )}
              {listing.size && (
                <View style={previewStyles.stat}>
                  <Ionicons name="resize-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={previewStyles.statText}>{listing.size} sqm</Text>
                </View>
              )}
            </View>

            {/* Badges */}
            <View style={previewStyles.badges}>
              {listing.verification?.isVerified && (
                <View style={[previewStyles.badge, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.verified} />
                  <Text style={[previewStyles.badgeText, { color: COLORS.verified }]}>Verified</Text>
                </View>
              )}
              {listing.condition === 'new' && (
                <View style={[previewStyles.badge, { backgroundColor: COLORS.primaryLight }]}>
                  <Text style={[previewStyles.badgeText, { color: COLORS.primary }]}>New</Text>
                </View>
              )}
              {listing.furnishing === 'furnished' && (
                <View style={[previewStyles.badge, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[previewStyles.badgeText, { color: COLORS.warning }]}>Furnished</Text>
                </View>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={previewStyles.actions}>
            <TouchableOpacity style={previewStyles.chatBtn} onPress={onChat}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
              <Text style={previewStyles.chatBtnText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={previewStyles.viewBtn} onPress={onViewFull}>
              <Text style={previewStyles.viewBtnText}>View Full Details</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const previewStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.background,
  },
  info: {
    padding: 16,
  },
  sponsoredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.sponsored,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  sponsoredText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.warning,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  location: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: COLORS.text,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatBtn: {
    flex: 0.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  chatBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  viewBtn: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    gap: 6,
  },
  viewBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

// Similar Listing Card
const SimilarListingCard = memo(({ 
  listing, 
  index,
  onPress, 
  onQuickView,
  onFavorite, 
  onShare,
  onChat,
  isFavorited,
  sourceId,
}: { 
  listing: SimilarListing;
  index: number;
  onPress: () => void;
  onQuickView: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onChat: () => void;
  isFavorited: boolean;
  sourceId: string;
}) => {
  // Track impression on mount
  useEffect(() => {
    trackEvent('impression', sourceId, listing.id, listing.isSponsored, index);
  }, []);

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <TouchableOpacity 
      style={[
        cardStyles.container,
        listing.isSponsored && cardStyles.sponsoredContainer
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image */}
      <View style={cardStyles.imageContainer}>
        <Image source={{ uri: listing.images?.[0] }} style={cardStyles.image} />
        
        {/* Sponsored Label */}
        {listing.isSponsored && (
          <View style={cardStyles.sponsoredLabel}>
            <Text style={cardStyles.sponsoredText}>Sponsored</Text>
          </View>
        )}
        
        {/* Favorite Button */}
        <TouchableOpacity style={cardStyles.favoriteBtn} onPress={onFavorite}>
          <Ionicons 
            name={isFavorited ? 'heart' : 'heart-outline'} 
            size={18} 
            color={isFavorited ? COLORS.error : '#fff'} 
          />
        </TouchableOpacity>

        {/* Quick View Button */}
        <TouchableOpacity style={cardStyles.quickViewBtn} onPress={onQuickView}>
          <Ionicons name="eye-outline" size={16} color="#fff" />
        </TouchableOpacity>

        {/* Image Count */}
        {listing.images && listing.images.length > 1 && (
          <View style={cardStyles.imageCount}>
            <Ionicons name="camera-outline" size={12} color="#fff" />
            <Text style={cardStyles.imageCountText}>{listing.images.length}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={cardStyles.content}>
        {/* Price */}
        <Text style={cardStyles.price}>
          €{listing.price?.toLocaleString()}
          {listing.pricePerMonth && <Text style={cardStyles.priceUnit}>/mo</Text>}
        </Text>

        {/* Title */}
        <Text style={cardStyles.title} numberOfLines={2}>{listing.title}</Text>

        {/* Location */}
        <View style={cardStyles.locationRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={cardStyles.location} numberOfLines={1}>
            {listing.location?.city}
          </Text>
        </View>

        {/* Tags Row */}
        <View style={cardStyles.tagsRow}>
          {listing.verification?.isVerified && (
            <View style={[cardStyles.tag, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="shield-checkmark" size={10} color={COLORS.verified} />
              <Text style={[cardStyles.tagText, { color: COLORS.verified }]}>Verified</Text>
            </View>
          )}
          {listing.condition && (
            <View style={[cardStyles.tag, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={[cardStyles.tagText, { color: COLORS.primary }]}>
                {listing.condition === 'new' ? 'New' : listing.condition === 'renovated' ? 'Renovated' : 'Used'}
              </Text>
            </View>
          )}
        </View>

        {/* Posted Date */}
        <Text style={cardStyles.postedDate}>
          {getRelativeTime(listing.createdAt || new Date().toISOString())}
        </Text>

        {/* Quick Actions */}
        <View style={cardStyles.quickActions}>
          <TouchableOpacity style={cardStyles.actionBtn} onPress={onShare}>
            <Ionicons name="share-outline" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={cardStyles.actionBtn} onPress={onChat}>
            <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const cardStyles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sponsoredContainer: {
    borderColor: COLORS.sponsoredBorder,
    borderWidth: 2,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: COLORS.background,
  },
  sponsoredLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.sponsored,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sponsoredText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.warning,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickViewBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCount: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  imageCountText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 4,
    lineHeight: 18,
    height: 36,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  location: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  postedDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Track event helper
const trackEvent = async (
  eventType: string,
  sourceId: string,
  targetId: string,
  isSponsored: boolean,
  position: number
) => {
  try {
    await api.post('/property/similar/track', {
      eventType,
      sourceListingId: sourceId,
      targetListingId: targetId,
      isSponsored,
      position,
      sessionId: `session_${Date.now()}`,
    });
  } catch (error) {
    // Silent fail for analytics
  }
};

// Main Component
const SimilarListings: React.FC<SimilarListingsProps> = ({ propertyId, onListingPress }) => {
  const router = useRouter();
  const [listings, setListings] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showTooltip, setShowTooltip] = useState(false);
  const [previewListing, setPreviewListing] = useState<SimilarListing | null>(null);
  const [sameCityOnly, setSameCityOnly] = useState(false);
  const [samePriceRange, setSamePriceRange] = useState(false);

  // Fetch similar listings
  const fetchSimilarListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/property/similar/${propertyId}`, {
        params: {
          limit: 10,
          include_sponsored: true,
          same_city_only: sameCityOnly,
          same_price_range: samePriceRange,
        }
      });
      
      setListings(response.data.listings || []);
    } catch (err) {
      console.error('Error fetching similar listings:', err);
      setError('Failed to load similar listings');
    } finally {
      setLoading(false);
    }
  }, [propertyId, sameCityOnly, samePriceRange]);

  useEffect(() => {
    if (propertyId) {
      fetchSimilarListings();
    }
  }, [fetchSimilarListings]);

  // Toggle favorite
  const toggleFavorite = async (listingId: string) => {
    const isFav = favorites.has(listingId);
    
    try {
      if (isFav) {
        await api.delete(`/property/favorites/${listingId}`);
      } else {
        await api.post(`/property/favorites/${listingId}`);
      }
      
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (isFav) newSet.delete(listingId);
        else newSet.add(listingId);
        return newSet;
      });
      
      // Track event
      const listing = listings.find(l => l.id === listingId);
      if (listing) {
        trackEvent('save', propertyId, listingId, listing.isSponsored, listings.indexOf(listing));
      }
    } catch (err) {
      // Optimistic update fallback
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (isFav) newSet.delete(listingId);
        else newSet.add(listingId);
        return newSet;
      });
    }
  };

  // Handle share
  const handleShare = async (listing: SimilarListing, index: number) => {
    try {
      await Share.share({
        title: listing.title,
        message: `Check out this listing: ${listing.title} - €${listing.price?.toLocaleString()}`,
        url: `https://example.com/property/${listing.id}`,
      });
      trackEvent('share', propertyId, listing.id, listing.isSponsored, index);
    } catch (err) {
      // Silent fail
    }
  };

  // Handle chat
  const handleChat = (listing: SimilarListing, index: number) => {
    trackEvent('chat', propertyId, listing.id, listing.isSponsored, index);
    router.push(`/property/chat/${listing.id}`);
  };

  // Handle press
  const handlePress = (listing: SimilarListing, index: number) => {
    trackEvent('click', propertyId, listing.id, listing.isSponsored, index);
    if (onListingPress) {
      onListingPress(listing);
    } else {
      router.push(`/property/${listing.id}`);
    }
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.title}>Similar Listings</Text>
        <Text style={styles.subtitle}>Based on price, condition, and location</Text>
      </View>
      <TouchableOpacity style={styles.infoBtn} onPress={() => setShowTooltip(true)}>
        <Ionicons name="help-circle-outline" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  // Render filters
  const renderFilters = () => (
    <View style={styles.filters}>
      <TouchableOpacity 
        style={[styles.filterChip, sameCityOnly && styles.filterChipActive]}
        onPress={() => setSameCityOnly(!sameCityOnly)}
      >
        <Ionicons 
          name={sameCityOnly ? 'checkbox' : 'square-outline'} 
          size={14} 
          color={sameCityOnly ? COLORS.primary : COLORS.textSecondary} 
        />
        <Text style={[styles.filterText, sameCityOnly && styles.filterTextActive]}>
          Same city only
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.filterChip, samePriceRange && styles.filterChipActive]}
        onPress={() => setSamePriceRange(!samePriceRange)}
      >
        <Ionicons 
          name={samePriceRange ? 'checkbox' : 'square-outline'} 
          size={14} 
          color={samePriceRange ? COLORS.primary : COLORS.textSecondary} 
        />
        <Text style={[styles.filterText, samePriceRange && styles.filterTextActive]}>
          Same price range
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="home-outline" size={40} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No similar listings found</Text>
      <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
      <TouchableOpacity 
        style={styles.browseBtn}
        onPress={() => router.push('/property')}
      >
        <Text style={styles.browseBtnText}>Browse all properties</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Finding similar listings...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchSimilarListings}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderFilters()}
      
      {listings.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={listings}
          horizontal
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SimilarListingCard
              listing={item}
              index={index}
              onPress={() => handlePress(item, index)}
              onQuickView={() => setPreviewListing(item)}
              onFavorite={() => toggleFavorite(item.id)}
              onShare={() => handleShare(item, index)}
              onChat={() => handleChat(item, index)}
              isFavorited={favorites.has(item.id)}
              sourceId={propertyId}
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Tooltip Modal */}
      <InfoTooltip visible={showTooltip} onClose={() => setShowTooltip(false)} />

      {/* Quick Preview Modal */}
      <QuickPreviewModal
        listing={previewListing}
        visible={!!previewListing}
        onClose={() => setPreviewListing(null)}
        onViewFull={() => {
          if (previewListing) {
            handlePress(previewListing, listings.indexOf(previewListing));
            setPreviewListing(null);
          }
        }}
        onChat={() => {
          if (previewListing) {
            handleChat(previewListing, listings.indexOf(previewListing));
            setPreviewListing(null);
          }
        }}
        onFavorite={() => {
          if (previewListing) {
            toggleFavorite(previewListing.id);
          }
        }}
        isFavorited={previewListing ? favorites.has(previewListing.id) : false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoBtn: {
    padding: 4,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
  retryText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  browseBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  browseBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SimilarListings;
