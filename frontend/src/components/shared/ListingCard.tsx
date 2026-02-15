import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useFeatureSettingsStore } from '../../store/featureSettingsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants
const CARD_MARGIN = 8;
const NUM_COLUMNS = 2;
export const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
export const CARD_IMAGE_HEIGHT = 160;
export const BORDER_RADIUS = 12;

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
};

export interface Listing {
  id?: string;
  _id?: string;
  title: string;
  price: number;
  images?: string[];
  location?: string | { city?: string };
  location_data?: {
    city_name?: string;
    lat?: number;
    lng?: number;
  };
  category_id?: string;
  created_at: string;
  views?: number;
  featured?: boolean;
  is_featured?: boolean;
  is_top?: boolean;
  negotiable?: boolean;
}

export interface ListingCardProps {
  listing: Listing;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  /** Variant for different card sizes */
  variant?: 'compact' | 'full';
}

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: false });
  } catch {
    return '';
  }
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

// Haversine distance calculation
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Unified ListingCard component for the entire application.
 * Supports compact (home grid) and full (category page) variants.
 */
export const ListingCard = memo<ListingCardProps>(({ 
  listing, 
  onPress, 
  onFavorite, 
  isFavorited = false, 
  userLocation = null,
  variant = 'compact'
}) => {
  const { settings } = useFeatureSettingsStore();
  const listingId = listing._id || listing.id || '';
  
  const formatPrice = (price: number) => {
    const { currency_symbol, currency_position } = settings;
    const formattedNumber = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0 }).format(price);
    
    if (currency_position === 'before') {
      return `${currency_symbol} ${formattedNumber}`;
    }
    return `${formattedNumber} ${currency_symbol}`;
  };

  // Get distance from user if location data available
  const getDistance = (): string | null => {
    if (!userLocation) return null;
    const listingLat = listing.location_data?.lat;
    const listingLng = listing.location_data?.lng;
    if (!listingLat || !listingLng) return null;
    const distance = calculateDistance(userLocation.lat, userLocation.lng, listingLat, listingLng);
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${Math.round(distance)}km`;
  };

  // Get display location
  const getDisplayLocation = (): string => {
    if (listing.location_data?.city_name) return listing.location_data.city_name;
    if (typeof listing.location === 'object' && listing.location?.city) return listing.location.city;
    if (typeof listing.location === 'string') return listing.location;
    return 'Unknown';
  };

  const distance = getDistance();
  const imageUri = listing.images?.[0];
  const imageCount = listing.images?.length || 0;
  const isCompact = variant === 'compact';

  // Render image based on platform
  const renderImage = () => {
    if (!imageUri) {
      return (
        <View style={[styles.imagePlaceholder, isCompact && styles.imagePlaceholderCompact]}>
          <Ionicons name="image-outline" size={32} color="#CCC" />
        </View>
      );
    }

    // Use native img tag for web for better compatibility
    if (Platform.OS === 'web') {
      return (
        <img 
          src={imageUri}
          alt={listing.title}
          style={{
            width: '100%',
            height: isCompact ? '140px' : '180px',
            objectFit: 'cover',
          }}
          loading="lazy"
        />
      );
    }

    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.image, isCompact && styles.imageCompact]}
        resizeMode="cover"
      />
    );
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        isCompact && styles.cardCompact,
        listing.featured && styles.cardFeatured
      ]} 
      onPress={onPress} 
      activeOpacity={0.95}
      data-testid={`listing-card-${listingId}`}
    >
      <View style={[styles.imageContainer, isCompact && styles.imageContainerCompact]}>
        {renderImage()}
        
        {/* Badges - Just Listed, Featured & TOP */}
        <View style={styles.badgesContainer}>
          {isJustListed(listing.created_at) && (
            <View style={styles.justListedBadge}>
              <Ionicons name="time" size={9} color="#fff" />
              <Text style={styles.badgeText}>Just Listed</Text>
            </View>
          )}
          {settings.show_featured_badge !== false && listing.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={9} color="#fff" />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
          {settings.show_featured_badge !== false && (listing.is_top || listing.featured) && (
            <View style={styles.topBadge}>
              <Ionicons name="arrow-up" size={9} color="#fff" />
              <Text style={styles.badgeText}>TOP</Text>
            </View>
          )}
        </View>

        {/* Heart/Favorite Button */}
        {onFavorite && (
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={(e) => { e.stopPropagation(); onFavorite(); }}
            data-testid={`favorite-btn-${listingId}`}
          >
            <Ionicons 
              name={isFavorited ? 'heart' : 'heart-outline'} 
              size={20} 
              color={isFavorited ? '#E91E63' : '#fff'} 
            />
          </TouchableOpacity>
        )}

        {/* Image Count Badge */}
        {imageCount > 1 && (
          <View style={styles.imageCountBadge}>
            <Ionicons name="camera" size={11} color="#fff" />
            <Text style={styles.imageCountText}>{imageCount}</Text>
          </View>
        )}

        {/* Negotiable Badge */}
        {listing.negotiable && (
          <View style={styles.negotiableBadge}>
            <Text style={styles.negotiableText}>Negotiable</Text>
          </View>
        )}

        {/* Views Counter */}
        {settings.show_view_count !== false && (
          <View style={styles.viewsOverlay}>
            <Ionicons name="eye-outline" size={11} color="#fff" />
            <Text style={styles.viewsOverlayText}>{listing.views || 0}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Location Row */}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={11} color="#999" />
          <Text style={styles.location} numberOfLines={1}>{getDisplayLocation()}</Text>
          {distance && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, isCompact && styles.titleCompact]} numberOfLines={2}>
          {listing.title}
        </Text>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
        </View>

        {/* Time Posted */}
        {settings.show_time_ago !== false && (
          <View style={styles.metaRow}>
            <Text style={styles.time}>{formatTimeAgo(listing.created_at)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: { 
    width: '100%', 
    backgroundColor: COLORS.surface, 
    borderRadius: BORDER_RADIUS, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCompact: {
    height: 280,
  },
  cardFeatured: { 
    borderWidth: 2, 
    borderColor: COLORS.primary,
  },
  imageContainer: { 
    height: 180,
    position: 'relative',
  },
  imageContainerCompact: { 
    height: 140,
  },
  image: { 
    width: '100%', 
    height: 180,
    backgroundColor: COLORS.border,
  },
  imageCompact: {
    height: 140,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderCompact: {
    height: 140,
  },
  badgesContainer: { 
    position: 'absolute', 
    top: 8, 
    left: 8, 
    flexDirection: 'column', 
    gap: 4,
  },
  justListedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: '#2196F3', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 4,
  },
  featuredBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: '#FF9800', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 4,
  },
  topBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: '#2E7D32', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 4,
  },
  badgeText: { 
    color: '#fff', 
    fontSize: 9, 
    fontWeight: '700',
  },
  favoriteButton: { 
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
  imageCountBadge: { 
    position: 'absolute', 
    bottom: 8, 
    left: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 4,
  },
  imageCountText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '600',
  },
  negotiableBadge: { 
    position: 'absolute', 
    bottom: 8, 
    right: 8, 
    backgroundColor: '#E8F5E9', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 4,
  },
  negotiableText: { 
    color: '#2E7D32', 
    fontSize: 9, 
    fontWeight: '600',
  },
  viewsOverlay: { 
    position: 'absolute', 
    bottom: 34, 
    right: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    paddingHorizontal: 5, 
    paddingVertical: 2, 
    borderRadius: 4,
  },
  viewsOverlayText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '500',
  },
  content: { 
    padding: 10,
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    marginBottom: 4,
  },
  location: { 
    flex: 1, 
    fontSize: 11, 
    color: '#999',
  },
  distanceBadge: { 
    backgroundColor: '#E3F2FD', 
    paddingHorizontal: 5, 
    paddingVertical: 1, 
    borderRadius: 8,
  },
  distanceText: { 
    fontSize: 9, 
    color: '#1976D2', 
    fontWeight: '600',
  },
  title: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: COLORS.text, 
    marginBottom: 6, 
    lineHeight: 18,
  },
  titleCompact: {
    fontSize: 13,
    lineHeight: 17,
    height: 34,
  },
  priceRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
  },
  price: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: COLORS.primary,
  },
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4,
  },
  time: { 
    fontSize: 10, 
    color: '#999',
  },
});

export default ListingCard;
