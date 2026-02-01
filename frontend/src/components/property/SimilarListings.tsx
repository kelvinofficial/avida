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
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { Property } from '../../types/property';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;

// Property category - One column, image on top (full width vertical card)
const PROPERTY_CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const PROPERTY_IMAGE_HEIGHT = 180;

// Other categories - Two column grid with image on left (horizontal card)
const OTHER_CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 12) / 2;
const OTHER_IMAGE_SIZE = 100;

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
  category?: 'property' | 'auto' | 'electronics' | 'other';
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
        <Text style={tooltipStyles.text}>These listings are selected based on:</Text>
        <View style={tooltipStyles.list}>
          <Text style={tooltipStyles.listItem}>• Same property type</Text>
          <Text style={tooltipStyles.listItem}>• Similar price range (±20%)</Text>
          <Text style={tooltipStyles.listItem}>• Same or nearby location</Text>
          <Text style={tooltipStyles.listItem}>• Similar size and features</Text>
        </View>
        <TouchableOpacity style={tooltipStyles.closeBtn} onPress={onClose}>
          <Text style={tooltipStyles.closeBtnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
));

const tooltipStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, maxWidth: 340, width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  text: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  list: { marginBottom: 16 },
  listItem: { fontSize: 14, color: COLORS.text, marginVertical: 2 },
  closeBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

// Track event helper
const trackEvent = async (eventType: string, sourceId: string, targetId: string, isSponsored: boolean, position: number) => {
  try {
    await api.post('/property/similar/track', { eventType, sourceListingId: sourceId, targetListingId: targetId, isSponsored, position, sessionId: `session_${Date.now()}` });
  } catch (error) { /* Silent fail */ }
};

// Helper function for relative time
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

// ============ PROPERTY CARD (One Column - Image on Top) ============
const PropertyCard = memo(({ 
  listing, index, onPress, onFavorite, isFavorited, sourceId 
}: { 
  listing: SimilarListing; index: number; onPress: () => void; onFavorite: () => void; isFavorited: boolean; sourceId: string;
}) => {
  useEffect(() => { trackEvent('impression', sourceId, listing.id, listing.isSponsored, index); }, []);

  return (
    <TouchableOpacity 
      style={[propertyCardStyles.container, listing.isSponsored && propertyCardStyles.sponsoredContainer]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image Row */}
      <View style={propertyCardStyles.imageContainer}>
        <Image source={{ uri: listing.images?.[0] }} style={propertyCardStyles.image} />
        
        {listing.isSponsored && (
          <View style={propertyCardStyles.sponsoredLabel}>
            <Text style={propertyCardStyles.sponsoredText}>Sponsored</Text>
          </View>
        )}
        
        <TouchableOpacity style={propertyCardStyles.favoriteBtn} onPress={onFavorite}>
          <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={20} color={isFavorited ? COLORS.error : '#fff'} />
        </TouchableOpacity>

        {listing.images && listing.images.length > 1 && (
          <View style={propertyCardStyles.imageCount}>
            <Ionicons name="camera-outline" size={12} color="#fff" />
            <Text style={propertyCardStyles.imageCountText}>{listing.images.length}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={propertyCardStyles.content}>
        <View style={propertyCardStyles.topRow}>
          <Text style={propertyCardStyles.price}>
            €{listing.price?.toLocaleString()}
            {listing.pricePerMonth && <Text style={propertyCardStyles.priceUnit}>/mo</Text>}
          </Text>
          {listing.priceNegotiable && <Text style={propertyCardStyles.negotiable}>Negotiable</Text>}
        </View>

        <Text style={propertyCardStyles.title} numberOfLines={2}>{listing.title}</Text>

        <View style={propertyCardStyles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text style={propertyCardStyles.location}>{listing.location?.area}, {listing.location?.city}</Text>
        </View>

        {/* Stats */}
        <View style={propertyCardStyles.stats}>
          {listing.bedrooms && (
            <View style={propertyCardStyles.stat}>
              <Ionicons name="bed-outline" size={14} color={COLORS.textSecondary} />
              <Text style={propertyCardStyles.statText}>{listing.bedrooms} Beds</Text>
            </View>
          )}
          {listing.bathrooms && (
            <View style={propertyCardStyles.stat}>
              <Ionicons name="water-outline" size={14} color={COLORS.textSecondary} />
              <Text style={propertyCardStyles.statText}>{listing.bathrooms} Baths</Text>
            </View>
          )}
          {listing.size && (
            <View style={propertyCardStyles.stat}>
              <Ionicons name="resize-outline" size={14} color={COLORS.textSecondary} />
              <Text style={propertyCardStyles.statText}>{listing.size} sqm</Text>
            </View>
          )}
        </View>

        {/* Badges */}
        <View style={propertyCardStyles.badges}>
          {listing.verification?.isVerified && (
            <View style={[propertyCardStyles.badge, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="shield-checkmark" size={10} color={COLORS.verified} />
              <Text style={[propertyCardStyles.badgeText, { color: COLORS.verified }]}>Verified</Text>
            </View>
          )}
          {listing.condition === 'new' && (
            <View style={[propertyCardStyles.badge, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={[propertyCardStyles.badgeText, { color: COLORS.primary }]}>New</Text>
            </View>
          )}
          {listing.furnishing === 'furnished' && (
            <View style={[propertyCardStyles.badge, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[propertyCardStyles.badgeText, { color: COLORS.warning }]}>Furnished</Text>
            </View>
          )}
        </View>

        <Text style={propertyCardStyles.postedDate}>{getRelativeTime(listing.createdAt || new Date().toISOString())}</Text>
      </View>
    </TouchableOpacity>
  );
});

const propertyCardStyles = StyleSheet.create({
  container: {
    width: PROPERTY_CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
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
    height: PROPERTY_IMAGE_HEIGHT,
    backgroundColor: COLORS.background,
  },
  sponsoredLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.sponsored,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCount: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  imageCountText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceUnit: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  negotiable: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 6,
    lineHeight: 20,
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
    marginTop: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: COLORS.text,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  postedDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});

// ============ OTHER CATEGORY CARD (Two Column - Image on Left) ============
const OtherCategoryCard = memo(({ 
  listing, index, onPress, onFavorite, isFavorited, sourceId 
}: { 
  listing: SimilarListing; index: number; onPress: () => void; onFavorite: () => void; isFavorited: boolean; sourceId: string;
}) => {
  useEffect(() => { trackEvent('impression', sourceId, listing.id, listing.isSponsored, index); }, []);

  return (
    <TouchableOpacity 
      style={[otherCardStyles.container, listing.isSponsored && otherCardStyles.sponsoredContainer]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image Left Column */}
      <View style={otherCardStyles.imageContainer}>
        <Image source={{ uri: listing.images?.[0] }} style={otherCardStyles.image} />
        
        {listing.isSponsored && (
          <View style={otherCardStyles.sponsoredLabel}>
            <Text style={otherCardStyles.sponsoredText}>Ad</Text>
          </View>
        )}
        
        <TouchableOpacity style={otherCardStyles.favoriteBtn} onPress={onFavorite}>
          <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={16} color={isFavorited ? COLORS.error : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Content Right Column */}
      <View style={otherCardStyles.content}>
        <Text style={otherCardStyles.price}>
          €{listing.price?.toLocaleString()}
        </Text>
        
        <Text style={otherCardStyles.title} numberOfLines={2}>{listing.title}</Text>

        <View style={otherCardStyles.locationRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={otherCardStyles.location} numberOfLines={1}>{listing.location?.city}</Text>
        </View>

        <View style={otherCardStyles.bottomRow}>
          {listing.verification?.isVerified && (
            <View style={otherCardStyles.badge}>
              <Ionicons name="shield-checkmark" size={10} color={COLORS.verified} />
            </View>
          )}
          <Text style={otherCardStyles.postedDate}>{getRelativeTime(listing.createdAt || new Date().toISOString())}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const otherCardStyles = StyleSheet.create({
  container: {
    width: OTHER_CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
  },
  sponsoredContainer: {
    borderColor: COLORS.sponsoredBorder,
    borderWidth: 2,
  },
  imageContainer: {
    position: 'relative',
    width: OTHER_IMAGE_SIZE,
  },
  image: {
    width: OTHER_IMAGE_SIZE,
    height: OTHER_IMAGE_SIZE,
    backgroundColor: COLORS.background,
  },
  sponsoredLabel: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: COLORS.sponsored,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  sponsoredText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.warning,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  location: {
    fontSize: 10,
    color: COLORS.textSecondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: '#E3F2FD',
    padding: 3,
    borderRadius: 3,
  },
  postedDate: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
});

// ============ MAIN COMPONENT ============
const SimilarListings: React.FC<SimilarListingsProps> = ({ propertyId, category = 'property', onListingPress }) => {
  const router = useRouter();
  const [listings, setListings] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showTooltip, setShowTooltip] = useState(false);
  const [sameCityOnly, setSameCityOnly] = useState(false);
  const [samePriceRange, setSamePriceRange] = useState(false);

  const isPropertyCategory = category === 'property';

  // Fetch similar listings
  const fetchSimilarListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the appropriate endpoint based on category
      const endpoint = isPropertyCategory 
        ? `/property/similar/${propertyId}`
        : `/listings/similar/${propertyId}`;
      
      const response = await api.get(endpoint, {
        params: { limit: 10, include_sponsored: true, same_city_only: sameCityOnly, same_price_range: samePriceRange }
      });
      
      setListings(response.data.listings || []);
    } catch (err) {
      console.error('Error fetching similar listings:', err);
      setError('Failed to load similar listings');
    } finally {
      setLoading(false);
    }
  }, [propertyId, sameCityOnly, samePriceRange, isPropertyCategory]);

  useEffect(() => {
    if (propertyId) fetchSimilarListings();
  }, [fetchSimilarListings]);

  // Toggle favorite
  const toggleFavorite = async (listingId: string) => {
    const isFav = favorites.has(listingId);
    try {
      if (isFav) await api.delete(`/property/favorites/${listingId}`);
      else await api.post(`/property/favorites/${listingId}`);
      
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (isFav) newSet.delete(listingId);
        else newSet.add(listingId);
        return newSet;
      });
      
      const listing = listings.find(l => l.id === listingId);
      if (listing) trackEvent('save', propertyId, listingId, listing.isSponsored, listings.indexOf(listing));
    } catch (err) {
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (isFav) newSet.delete(listingId);
        else newSet.add(listingId);
        return newSet;
      });
    }
  };

  // Handle press
  const handlePress = (listing: SimilarListing, index: number) => {
    trackEvent('click', propertyId, listing.id, listing.isSponsored, index);
    if (onListingPress) onListingPress(listing);
    else router.push(`/property/${listing.id}`);
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
        <Ionicons name={sameCityOnly ? 'checkbox' : 'square-outline'} size={14} color={sameCityOnly ? COLORS.primary : COLORS.textSecondary} />
        <Text style={[styles.filterText, sameCityOnly && styles.filterTextActive]}>Same city only</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.filterChip, samePriceRange && styles.filterChipActive]}
        onPress={() => setSamePriceRange(!samePriceRange)}
      >
        <Ionicons name={samePriceRange ? 'checkbox' : 'square-outline'} size={14} color={samePriceRange ? COLORS.primary : COLORS.textSecondary} />
        <Text style={[styles.filterText, samePriceRange && styles.filterTextActive]}>Same price range</Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="home-outline" size={40} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No similar listings found</Text>
      <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
      <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/property')}>
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
      ) : isPropertyCategory ? (
        // ONE COLUMN LAYOUT - Image on top (for Property category)
        <ScrollView 
          style={styles.propertyList}
          contentContainerStyle={styles.propertyListContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {listings.map((item, index) => (
            <PropertyCard
              key={item.id}
              listing={item}
              index={index}
              onPress={() => handlePress(item, index)}
              onFavorite={() => toggleFavorite(item.id)}
              isFavorited={favorites.has(item.id)}
              sourceId={propertyId}
            />
          ))}
        </ScrollView>
      ) : (
        // TWO COLUMN LAYOUT - Image on left (for other categories)
        <View style={styles.otherGrid}>
          {listings.map((item, index) => (
            <OtherCategoryCard
              key={item.id}
              listing={item}
              index={index}
              onPress={() => handlePress(item, index)}
              onFavorite={() => toggleFavorite(item.id)}
              isFavorited={favorites.has(item.id)}
              sourceId={propertyId}
            />
          ))}
        </View>
      )}

      {/* Tooltip Modal */}
      <InfoTooltip visible={showTooltip} onClose={() => setShowTooltip(false)} />
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
    paddingHorizontal: HORIZONTAL_PADDING,
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
    paddingHorizontal: HORIZONTAL_PADDING,
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
  propertyList: {
    maxHeight: 500,
  },
  propertyListContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  otherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 12,
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
