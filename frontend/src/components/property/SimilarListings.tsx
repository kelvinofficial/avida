import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { useResponsive } from '../../hooks/useResponsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;

// Card dimensions - horizontal card (image left, content right)
const IMAGE_SIZE = 130;
const DESKTOP_IMAGE_SIZE = 200;

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
  borderLight: '#F0F0F0',
  error: '#D32F2F',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  verified: '#4CAF50',
  certified: '#9C27B0',
};

// Generic listing interface that works for all categories
interface SimilarListing {
  id: string;
  title: string;
  price?: number;
  images?: string[];
  location?: { city?: string; area?: string };
  featured?: boolean;
  boosted?: boolean;
  isSponsored?: boolean;
  sponsoredRank?: number | null;
  similarityScore?: number;
  priceNegotiable?: boolean;
  negotiable?: boolean;
  seller?: {
    id?: string;
    name?: string;
    isVerified?: boolean;
    verified?: boolean;
    phone?: string;
    whatsapp?: string;
    sellerType?: string;
  };
  verification?: { isVerified?: boolean };
  // Property specific
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  // Auto specific
  year?: number;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  city?: string;
  distance?: number;
  // General listing
  condition?: string;
  category?: string;
  createdAt?: string;
}

interface SimilarListingsProps {
  propertyId: string;
  category?: 'property' | 'auto' | 'electronics' | 'other';
  onListingPress?: (listing: SimilarListing) => void;
}

// Track event helper
const trackEvent = async (eventType: string, sourceId: string, targetId: string, isSponsored: boolean, position: number) => {
  try {
    await api.post('/property/similar/track', { eventType, sourceListingId: sourceId, targetListingId: targetId, isSponsored, position, sessionId: `session_${Date.now()}` });
  } catch (error) { /* Silent fail */ }
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

// Format mileage
const formatMileage = (mileage: number) => {
  if (mileage >= 1000) {
    return `${(mileage / 1000).toFixed(0)}k km`;
  }
  return `${mileage} km`;
};

// ============ HORIZONTAL LISTING CARD (Auto Page Style) ============
const HorizontalListingCard = memo(({ 
  listing, 
  index, 
  category,
  onPress, 
  onFavorite, 
  isFavorited, 
  sourceId,
  onChat,
  onCall,
  onWhatsApp,
  isDesktop = false,
}: { 
  listing: SimilarListing; 
  index: number;
  category: 'property' | 'auto' | 'electronics' | 'other';
  onPress: () => void; 
  onFavorite: () => void; 
  isFavorited: boolean; 
  sourceId: string;
  onChat?: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
  isDesktop?: boolean;
}) => {
  useEffect(() => { 
    trackEvent('impression', sourceId, listing.id, listing.isSponsored || false, index); 
  }, []);

  const imageSize = isDesktop ? DESKTOP_IMAGE_SIZE : IMAGE_SIZE;
  const imageCount = listing.images?.length || 0;
  const imageSource = listing.images?.[0] ? { uri: listing.images[0] } : null;
  const isNegotiable = listing.priceNegotiable || listing.negotiable;
  const isFeatured = listing.featured || listing.boosted;
  const isVerified = listing.seller?.isVerified || listing.seller?.verified;

  // Get category-specific icon
  const getCategoryIcon = () => {
    switch (category) {
      case 'property': return 'home';
      case 'auto': return 'car';
      case 'electronics': return 'phone-portrait';
      default: return 'cube';
    }
  };

  // Render specs based on category
  const renderSpecs = () => {
    if (category === 'property') {
      const specs = [];
      if (listing.bedrooms) specs.push(`${listing.bedrooms} Beds`);
      if (listing.bathrooms) specs.push(`${listing.bathrooms} Baths`);
      if (listing.size) specs.push(`${listing.size} m²`);
      return specs;
    } else if (category === 'auto') {
      const specs = [];
      if (listing.year) specs.push(`${listing.year}`);
      if (listing.mileage) specs.push(formatMileage(listing.mileage));
      if (listing.fuelType) specs.push(listing.fuelType);
      if (listing.transmission) specs.push(listing.transmission);
      return specs.slice(0, 4); // Max 4 specs
    } else {
      const specs = [];
      if (listing.condition) specs.push(listing.condition);
      if (listing.category) specs.push(listing.category);
      return specs;
    }
  };

  const specs = renderSpecs();
  const locationText = listing.location?.city || listing.location?.area || listing.city || 'Location';

  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        isFeatured && cardStyles.cardFeatured,
        listing.isSponsored && cardStyles.cardSponsored,
        isDesktop && desktopCardStyles.card,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* LEFT: Image */}
      <View style={[cardStyles.imageContainer, isDesktop && { width: imageSize, height: imageSize }]}>
        {imageSource ? (
          <Image source={imageSource} style={cardStyles.image} resizeMode="cover" />
        ) : (
          <View style={cardStyles.placeholderImage}>
            <Ionicons name={getCategoryIcon()} size={isDesktop ? 48 : 32} color={COLORS.border} />
          </View>
        )}

        {/* Featured/Sponsored Badge */}
        {(isFeatured || listing.isSponsored) && (
          <View style={[
            cardStyles.badge,
            isFeatured ? cardStyles.featuredBadge : cardStyles.sponsoredBadge
          ]}>
            {isFeatured ? (
              <Ionicons name="star" size={10} color="#fff" />
            ) : (
              <Ionicons name="megaphone" size={10} color="#fff" />
            )}
          </View>
        )}

        {/* Image Count Badge */}
        {imageCount > 1 && (
          <View style={cardStyles.imageCountBadge}>
            <Ionicons name="camera" size={10} color="#fff" />
            <Text style={cardStyles.imageCountText}>{imageCount}</Text>
          </View>
        )}
      </View>

      {/* RIGHT: Content */}
      <View style={cardStyles.content}>
        {/* Price Row */}
        <View style={cardStyles.priceRow}>
          <Text style={cardStyles.price}>{formatPrice(listing.price || 0)}</Text>
          {isNegotiable && (
            <View style={cardStyles.negotiableBadge}>
              <Text style={cardStyles.negotiableText}>VB</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={cardStyles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        {/* Specs Row */}
        {specs.length > 0 && (
          <View style={cardStyles.specsRow}>
            {specs.map((spec, i) => (
              <React.Fragment key={i}>
                <Text style={cardStyles.specText}>{spec}</Text>
                {i < specs.length - 1 && <View style={cardStyles.specDot} />}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Location */}
        <View style={cardStyles.locationRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={cardStyles.locationText} numberOfLines={1}>
            {locationText}
            {listing.distance && ` • ${listing.distance} km`}
          </Text>
        </View>

        {/* Bottom Row: Seller Info & Actions */}
        <View style={cardStyles.bottomRow}>
          {/* Seller Info */}
          <View style={cardStyles.sellerInfo}>
            {isVerified && (
              <View style={cardStyles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
              </View>
            )}
            {listing.seller?.sellerType === 'dealer' && (
              <View style={cardStyles.dealerBadge}>
                <Text style={cardStyles.dealerText}>Dealer</Text>
              </View>
            )}
            {listing.seller?.sellerType === 'certified' && (
              <View style={cardStyles.certifiedBadge}>
                <Ionicons name="ribbon" size={10} color="#fff" />
                <Text style={cardStyles.certifiedText}>Certified</Text>
              </View>
            )}
            {listing.verification?.isVerified && !isVerified && (
              <View style={cardStyles.certifiedBadge}>
                <Ionicons name="ribbon" size={10} color="#fff" />
                <Text style={cardStyles.certifiedText}>Certified</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={cardStyles.actionsRow}>
            {onFavorite && (
              <TouchableOpacity
                style={cardStyles.actionButton}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onFavorite();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isFavorited ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isFavorited ? COLORS.error : COLORS.textSecondary}
                />
              </TouchableOpacity>
            )}
            {onChat && (
              <TouchableOpacity
                style={cardStyles.actionButton}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onChat();
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {onCall && (
              <TouchableOpacity
                style={cardStyles.actionButton}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onCall();
                }}
              >
                <Ionicons name="call-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[cardStyles.actionButton, cardStyles.whatsappButton]}
              onPress={(e) => {
                e.stopPropagation?.();
                onWhatsApp?.();
              }}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardFeatured: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  cardSponsored: {
    borderColor: COLORS.warning,
    borderWidth: 2,
  },
  // Image container
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: COLORS.surfaceVariant,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    backgroundColor: COLORS.primary,
  },
  sponsoredBadge: {
    backgroundColor: COLORS.warning,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  // Content
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  negotiableBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  negotiableText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: 17,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  },
  locationText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealerBadge: {
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealerText: {
    fontSize: 9,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.certified,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  certifiedText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappButton: {
    backgroundColor: '#E7FFE7',
  },
});

// ============ FILTER CHIP COMPONENT ============
const FilterChip = memo(({ 
  label, 
  active, 
  onPress 
}: { 
  label: string; 
  active: boolean; 
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[filterStyles.chip, active && filterStyles.chipActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[filterStyles.chipText, active && filterStyles.chipTextActive]}>
      {label}
    </Text>
    {active && (
      <Ionicons name="checkmark" size={14} color="#fff" style={{ marginLeft: 4 }} />
    )}
  </TouchableOpacity>
));

const filterStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  chipTextActive: {
    color: '#fff',
  },
});

// ============ MAIN COMPONENT ============
const SimilarListings: React.FC<SimilarListingsProps> = ({ propertyId, category = 'property', onListingPress }) => {
  const router = useRouter();
  const [listings, setListings] = useState<SimilarListing[]>([]);
  const [allListings, setAllListings] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Filter states
  const [filterSameCity, setFilterSameCity] = useState(false);
  const [filterSamePriceRange, setFilterSamePriceRange] = useState(false);
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);

  // Get the appropriate API endpoint based on category
  const getApiEndpoint = () => {
    if (category === 'property') {
      return `/property/similar/${propertyId}`;
    } else {
      // For auto, electronics, and other categories
      return `/listings/similar/${propertyId}`;
    }
  };

  // Get the detail page route based on category
  const getDetailRoute = (listingId: string) => {
    if (category === 'property') {
      return `/property/${listingId}`;
    } else if (category === 'auto') {
      return `/auto/${listingId}`;
    } else {
      return `/listing/${listingId}`;
    }
  };

  // Get category icon
  const getCategoryIcon = (): string => {
    switch (category) {
      case 'property': return 'home';
      case 'auto': return 'car';
      case 'electronics': return 'phone-portrait';
      default: return 'grid';
    }
  };

  // Fetch similar listings
  const fetchSimilarListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = getApiEndpoint();
      const response = await api.get(endpoint, {
        params: { limit: 20, include_sponsored: true }
      });
      
      const fetchedListings = response.data.listings || [];
      setAllListings(fetchedListings);
      setListings(fetchedListings);
    } catch (err) {
      console.error('Error fetching similar listings:', err);
      setError('Failed to load similar listings');
    } finally {
      setLoading(false);
    }
  }, [propertyId, category]);

  // Apply filters whenever filter state changes
  useEffect(() => {
    let filtered = [...allListings];
    
    if (filterSameCity) {
      const firstCity = allListings[0]?.location?.city || allListings[0]?.city;
      if (firstCity) {
        filtered = filtered.filter(l => 
          (l.location?.city || l.city) === firstCity
        );
      }
    }
    
    if (filterSamePriceRange) {
      const avgPrice = allListings.reduce((sum, l) => sum + (l.price || 0), 0) / allListings.length;
      const minPrice = avgPrice * 0.7;
      const maxPrice = avgPrice * 1.3;
      filtered = filtered.filter(l => 
        l.price && l.price >= minPrice && l.price <= maxPrice
      );
    }
    
    if (filterVerifiedOnly) {
      filtered = filtered.filter(l => 
        l.seller?.isVerified || l.seller?.verified || l.verification?.isVerified
      );
    }
    
    setListings(filtered);
  }, [filterSameCity, filterSamePriceRange, filterVerifiedOnly, allListings]);

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
      const favEndpoint = category === 'property' 
        ? `/property/favorites/${listingId}` 
        : `/listings/favorites/${listingId}`;
      
      if (isFav) await api.delete(favEndpoint);
      else await api.post(favEndpoint);
      
      const listing = listings.find(l => l.id === listingId);
      if (listing) trackEvent('save', propertyId, listingId, listing.isSponsored || false, listings.indexOf(listing));
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
    trackEvent('click', propertyId, listing.id, listing.isSponsored || false, index);
    if (onListingPress) {
      onListingPress(listing);
    } else {
      router.push(getDetailRoute(listing.id));
    }
  };

  // Handle WhatsApp
  const handleWhatsApp = (listing: SimilarListing) => {
    const phone = listing.seller?.whatsapp || listing.seller?.phone;
    if (phone) {
      const message = `Hi, I'm interested in: ${listing.title}`;
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      Linking.openURL(url);
    }
  };

  // Handle Chat
  const handleChat = (listing: SimilarListing) => {
    router.push(`/chat/${listing.seller?.id || listing.id}`);
  };

  // Handle Call
  const handleCall = (listing: SimilarListing) => {
    const phone = listing.seller?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  // Render header with filters
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={getCategoryIcon() as any} size={18} color={COLORS.primary} />
          <Text style={styles.title}>Similar Listings</Text>
        </View>
        <Text style={styles.countText}>{listings.length} found</Text>
      </View>
      
      {/* Filter Chips */}
      <View style={styles.filtersRow}>
        <FilterChip 
          label="Same City" 
          active={filterSameCity} 
          onPress={() => setFilterSameCity(!filterSameCity)} 
        />
        <FilterChip 
          label="Similar Price" 
          active={filterSamePriceRange} 
          onPress={() => setFilterSamePriceRange(!filterSamePriceRange)} 
        />
        <FilterChip 
          label="Verified Only" 
          active={filterVerifiedOnly} 
          onPress={() => setFilterVerifiedOnly(!filterVerifiedOnly)} 
        />
      </View>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name={getCategoryIcon() as any} size={40} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No similar listings found</Text>
      <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
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
      
      {listings.length === 0 ? (
        renderEmpty()
      ) : (
        <View style={styles.listContainer}>
          {listings.map((item, index) => (
            <HorizontalListingCard
              key={item.id}
              listing={item}
              index={index}
              category={category}
              onPress={() => handlePress(item, index)}
              onFavorite={() => toggleFavorite(item.id)}
              isFavorited={favorites.has(item.id)}
              sourceId={propertyId}
              onChat={() => handleChat(item)}
              onCall={() => handleCall(item)}
              onWhatsApp={() => handleWhatsApp(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  countText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  listContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
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
});

export default SimilarListings;
