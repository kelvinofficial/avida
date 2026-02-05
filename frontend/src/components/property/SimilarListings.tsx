import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { Property } from '../../types/property';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;

// Card dimensions - horizontal card (image left, content right)
const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const IMAGE_SIZE = 130;

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

// ============ HORIZONTAL LISTING CARD (Auto Page Style) ============
const HorizontalListingCard = memo(({ 
  listing, 
  index, 
  onPress, 
  onFavorite, 
  isFavorited, 
  sourceId,
  onChat,
  onCall,
  onWhatsApp,
}: { 
  listing: SimilarListing; 
  index: number; 
  onPress: () => void; 
  onFavorite: () => void; 
  isFavorited: boolean; 
  sourceId: string;
  onChat?: () => void;
  onCall?: () => void;
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
      {/* LEFT: Image */}
      <View style={cardStyles.imageContainer}>
        {imageSource ? (
          <Image source={imageSource} style={cardStyles.image} resizeMode="cover" />
        ) : (
          <View style={cardStyles.placeholderImage}>
            <Ionicons name="home" size={32} color={COLORS.border} />
          </View>
        )}

        {/* Featured/Sponsored Badge */}
        {(listing.featured || listing.isSponsored) && (
          <View style={[
            cardStyles.badge,
            listing.featured ? cardStyles.featuredBadge : cardStyles.sponsoredBadge
          ]}>
            {listing.featured ? (
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
          {listing.priceNegotiable && (
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
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={cardStyles.locationText} numberOfLines={1}>
            {listing.location?.city || listing.location?.area || 'Location'}
          </Text>
        </View>

        {/* Bottom Row: Seller Info & Actions */}
        <View style={cardStyles.bottomRow}>
          {/* Seller Info */}
          <View style={cardStyles.sellerInfo}>
            {listing.seller?.isVerified && (
              <View style={cardStyles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
              </View>
            )}
            {listing.verification?.isVerified && (
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

// ============ MAIN COMPONENT ============
const SimilarListings: React.FC<SimilarListingsProps> = ({ propertyId, category = 'property', onListingPress }) => {
  const router = useRouter();
  const [listings, setListings] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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

  // Render header
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
