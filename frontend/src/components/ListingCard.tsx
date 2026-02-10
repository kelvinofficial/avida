import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { Listing } from '../types';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ListingCardProps {
  listing: Listing;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
  compact?: boolean;
  imageHeight?: number;
  userLocation?: { lat: number; lng: number } | null;
}

// Boost badge configuration
const BOOST_BADGES: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  featured: { label: 'TOP', color: '#FFD700', icon: 'star' },
  homepage: { label: 'SPOTLIGHT', color: '#FF6B6B', icon: 'home' },
  urgent: { label: 'URGENT', color: '#FF9800', icon: 'flash' },
  location: { label: 'LOCAL', color: '#4CAF50', icon: 'location' },
  category: { label: 'PROMOTED', color: '#2196F3', icon: 'grid' },
};

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onPress,
  onFavorite,
  isFavorited = false,
  compact = false,
  imageHeight = 130,
  userLocation = null,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false });
    } catch {
      return '';
    }
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

  // Get distance from user if location data available
  const getDistance = (): string | null => {
    if (!userLocation) return null;
    
    const listingLat = listing.location_data?.lat;
    const listingLng = listing.location_data?.lng;
    
    if (!listingLat || !listingLng) return null;
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      listingLat,
      listingLng
    );
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${Math.round(distance)}km`;
  };

  // Get display location (city name or text location)
  const getDisplayLocation = (): string => {
    if (listing.location_data?.city_name) {
      return listing.location_data.city_name;
    }
    return listing.location || 'Unknown';
  };

  const distance = getDistance();

  const imageSource = listing.images?.[0]
    ? listing.images[0].startsWith('data:')
      ? { uri: listing.images[0] }
      : { uri: `data:image/jpeg;base64,${listing.images[0]}` }
    : null;

  const imageCount = listing.images?.length || 0;

  // Get active boost badges
  const activeBoosts = listing.boosts 
    ? Object.entries(listing.boosts)
        .filter(([_, boost]) => boost?.is_active)
        .map(([type]) => type)
    : [];
  
  // Check if listing is boosted (use is_boosted flag or check boosts object)
  const isBoosted = listing.is_boosted || activeBoosts.length > 0 || listing.featured;
  
  // Get the primary badge to show (highest priority boost)
  const primaryBoost = activeBoosts.length > 0 
    ? activeBoosts.includes('homepage') ? 'homepage'
    : activeBoosts.includes('featured') ? 'featured'
    : activeBoosts.includes('urgent') ? 'urgent'
    : activeBoosts[0]
    : listing.featured ? 'featured' : null;

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color={theme.colors.outline} />
          </View>
        )}
        
        {/* Top badges - show boost type badges */}
        {primaryBoost && BOOST_BADGES[primaryBoost] && (
          <View style={[styles.topBadge, { backgroundColor: BOOST_BADGES[primaryBoost].color }]}>
            <Ionicons name={BOOST_BADGES[primaryBoost].icon} size={10} color="#fff" style={{ marginRight: 3 }} />
            <Text style={styles.topBadgeText}>{BOOST_BADGES[primaryBoost].label}</Text>
          </View>
        )}
        
        {/* Secondary boost badges (if multiple boosts) */}
        {activeBoosts.length > 1 && (
          <View style={styles.secondaryBadges}>
            {activeBoosts.slice(0, 3).filter(type => type !== primaryBoost).map((type) => (
              BOOST_BADGES[type] && (
                <View key={type} style={[styles.smallBadge, { backgroundColor: BOOST_BADGES[type].color }]}>
                  <Ionicons name={BOOST_BADGES[type].icon} size={8} color="#fff" />
                </View>
              )
            ))}
          </View>
        )}
        
        {/* Favorite button */}
        {onFavorite && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorited ? theme.colors.error : theme.colors.onSurface}
            />
          </TouchableOpacity>
        )}

        {/* Image count badge */}
        {imageCount > 0 && (
          <View style={styles.imageCountBadge}>
            <Ionicons name="camera" size={12} color="#fff" />
            <Text style={styles.imageCountText}>{imageCount}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        {/* Location with distance */}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.location} numberOfLines={1}>
            {getDisplayLocation()}
          </Text>
          {distance && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{distance} away</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        
        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(listing.price)}
          </Text>
          {listing.negotiable && (
            <View style={styles.negotiableBadge}>
              <Text style={styles.negotiableText}>Negotiable</Text>
            </View>
          )}
        </View>
        
        {/* Footer - time and views */}
        <View style={styles.footer}>
          <Text style={styles.time}>{getTimeAgo(listing.created_at)}</Text>
          <View style={styles.viewsRow}>
            <Ionicons name="eye-outline" size={12} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.views}>{listing.views || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  cardCompact: {
    width: '100%',
    flexDirection: 'row',
    height: 120,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 130,
    backgroundColor: theme.colors.surfaceVariant,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryBadges: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: 70,
    flexDirection: 'row',
    gap: 4,
  },
  smallBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: theme.borderRadius.full,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation.level2,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: theme.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  location: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.onSurface,
    lineHeight: 17,
    marginBottom: 6,
    minHeight: 34,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  negotiableBadge: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  negotiableText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  views: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
});
