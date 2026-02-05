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
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { Property } from '../../types/property';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;

// Card width for 2-column grid (matching Auto page design)
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const IMAGE_HEIGHT = 110;

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  secondary: '#1565C0',
  secondaryLight: '#E3F2FD',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  verified: '#4CAF50',
  certified: '#9C27B0',
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
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

// Format price
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// ============ LISTING CARD (Auto Page Style - 2 Column Grid) ============
const ListingCard = memo(({ 
  listing, 
  index, 
  onPress, 
  onFavorite, 
  isFavorited, 
  sourceId,
  onWhatsApp,
}: { 
  listing: SimilarListing; 
  index: number; 
  onPress: () => void; 
  onFavorite: () => void; 
  isFavorited: boolean; 
  sourceId: string;
  onWhatsApp?: () => void;
}) => {
  useEffect(() => { 
    trackEvent('impression', sourceId, listing.id, listing.isSponsored, index); 
  }, []);

  const imageCount = listing.images?.length || 0;
  const imageSource = listing.images?.[0] ? { uri: listing.images[0] } : null;

  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        listing.featured && cardStyles.cardFeatured,
        listing.isSponsored && cardStyles.cardSponsored,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image Container */}
      <View style={cardStyles.imageContainer}>
        {imageSource ? (
          <Image source={imageSource} style={cardStyles.image} resizeMode="cover" />
        ) : (
          <View style={cardStyles.placeholderImage}>
            <Ionicons name="home" size={32} color={COLORS.border} />
          </View>
        )}

        {/* Badges Row - Featured/Sponsored/Boosted */}
        <View style={cardStyles.badgeRow}>
          {listing.featured && (
            <View style={cardStyles.featuredBadge}>
              <Text style={cardStyles.featuredText}>Featured</Text>
            </View>
          )}
          {listing.isSponsored && !listing.featured && (
            <View style={cardStyles.sponsoredBadge}>
              <Ionicons name="megaphone" size={9} color="#fff" />
              <Text style={cardStyles.sponsoredText}>Ad</Text>
            </View>
          )}
        </View>

        {/* Favorite Button */}
        <TouchableOpacity
          style={cardStyles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onFavorite();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorited ? COLORS.error : COLORS.text}
          />
        </TouchableOpacity>

        {/* Image Count Badge */}
        {imageCount > 1 && (
          <View style={cardStyles.imageCountBadge}>
            <Ionicons name="camera" size={10} color="#fff" />
            <Text style={cardStyles.imageCountText}>{imageCount}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={cardStyles.content}>
        {/* Price Row */}
        <View style={cardStyles.priceRow}>
          <Text style={cardStyles.price}>{formatPrice(listing.price || 0)}</Text>
          {listing.priceNegotiable && (
            <View style={cardStyles.negotiableBadge}>
              <Text style={cardStyles.negotiableText}>Negotiable</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={cardStyles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        {/* Property Specs */}
        <View style={cardStyles.specsRow}>
          {listing.bedrooms && (
            <>
              <Text style={cardStyles.specText}>{listing.bedrooms} Beds</Text>
              <View style={cardStyles.specDot} />
            </>
          )}
          {listing.bathrooms && (
            <>
              <Text style={cardStyles.specText}>{listing.bathrooms} Baths</Text>
              <View style={cardStyles.specDot} />
            </>
          )}
          {listing.size && (
            <Text style={cardStyles.specText}>{listing.size} m²</Text>
          )}
        </View>

        {/* Location */}
        <View style={cardStyles.locationRow}>
          <Ionicons name="location" size={11} color={COLORS.textSecondary} />
          <Text style={cardStyles.location} numberOfLines={1}>
            {listing.location?.city || listing.location?.area || 'Location'}
          </Text>
        </View>

        {/* Seller Badges */}
        <View style={cardStyles.sellerRow}>
          {listing.seller?.isVerified && (
            <View style={cardStyles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={9} color={COLORS.primary} />
              <Text style={cardStyles.verifiedText}>Verified</Text>
            </View>
          )}
          {listing.verification?.isVerified && (
            <View style={cardStyles.certifiedBadge}>
              <Ionicons name="ribbon" size={9} color="#fff" />
              <Text style={cardStyles.certifiedText}>Certified</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={cardStyles.actionsRow}>
          <TouchableOpacity
            style={[cardStyles.actionButton, cardStyles.whatsappButton]}
            onPress={(e) => {
              e.stopPropagation?.();
              onWhatsApp?.();
            }}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const cardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardFeatured: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  cardSponsored: {
    borderColor: COLORS.warning,
    borderWidth: 2,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: COLORS.surfaceVariant,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    gap: 4,
  },
  featuredBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  sponsoredBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sponsoredText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  negotiableBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  negotiableText: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 16,
    marginBottom: 4,
    minHeight: 32,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  specText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  specDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  location: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  sellerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  verifiedText: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: '500',
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.certified,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  certifiedText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 2,
  },
  actionButton: {
    width: 32,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappButton: {
    backgroundColor: '#E7FFE7',
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

  // Fetch similar listings
  const fetchSimilarListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = `/property/similar/${propertyId}`;
      const response = await api.get(endpoint, {
        params: { limit: 10, include_sponsored: true }
      });
      
      setListings(response.data.listings || []);
    } catch (err) {
      console.error('Error fetching similar listings:', err);
      setError('Failed to load similar listings');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId) fetchSimilarListings();
  }, [fetchSimilarListings]);

  // Toggle favorite
  const toggleFavorite = async (listingId: string) => {
    const isFav = favorites.has(listingId);
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (isFav) newSet.delete(listingId);
      else newSet.add(listingId);
      return newSet;
    });
    
    try {
      if (isFav) await api.delete(`/property/favorites/${listingId}`);
      else await api.post(`/property/favorites/${listingId}`);
      
      const listing = listings.find(l => l.id === listingId);
      if (listing) trackEvent('save', propertyId, listingId, listing.isSponsored, listings.indexOf(listing));
    } catch (err) {
      // Revert on error
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (isFav) newSet.add(listingId);
        else newSet.delete(listingId);
        return newSet;
      });
    }
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

  // Handle WhatsApp
  const handleWhatsApp = (listing: SimilarListing) => {
    const phone = listing.seller?.whatsapp || listing.seller?.phone;
    if (phone) {
      const message = `Hi, I'm interested in your property: ${listing.title}`;
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      import('react-native').then(({ Linking }) => Linking.openURL(url));
    }
  };

  // Render header with See All
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Ionicons name="home" size={18} color={COLORS.primary} />
        <Text style={styles.title}>Similar Listings</Text>
      </View>
      <TouchableOpacity 
        style={styles.seeAllBtn} 
        onPress={() => router.push('/property')}
      >
        <Text style={styles.seeAllText}>See All</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="home-outline" size={40} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No similar listings found</Text>
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

  // Create pairs for 2-column horizontal scroll (matching Auto page)
  const pairs: SimilarListing[][] = [];
  for (let i = 0; i < listings.length; i += 2) {
    pairs.push(listings.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {listings.length === 0 ? (
        renderEmpty()
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          pagingEnabled={false}
          snapToInterval={CARD_WIDTH * 2 + CARD_GAP + HORIZONTAL_PADDING}
          decelerationRate="fast"
        >
          {pairs.map((pair, pairIndex) => (
            <View key={pairIndex} style={styles.pairContainer}>
              {pair.map((item, itemIndex) => {
                const globalIndex = pairIndex * 2 + itemIndex;
                return (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    index={globalIndex}
                    onPress={() => handlePress(item, globalIndex)}
                    onFavorite={() => toggleFavorite(item.id)}
                    isFavorited={favorites.has(item.id)}
                    sourceId={propertyId}
                    onWhatsApp={() => handleWhatsApp(item)}
                  />
                );
              })}
            </View>
          ))}
        </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  pairContainer: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginRight: HORIZONTAL_PADDING,
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
