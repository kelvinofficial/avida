import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ImageWithSkeleton } from '../common';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 8;
const NUM_COLUMNS = 2;
export const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
export const CARD_IMAGE_HEIGHT = 160;
export const BORDER_RADIUS = 12;

export interface Listing {
  id: string;
  title: string;
  price: number;
  images?: string[];
  location?: string;
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
}

// Custom comparison function for memo - only re-render when relevant props change
const areEqual = (prevProps: ListingCardProps, nextProps: ListingCardProps) => {
  return (
    prevProps.listing.id === nextProps.listing.id &&
    prevProps.listing.price === nextProps.listing.price &&
    prevProps.listing.title === nextProps.listing.title &&
    prevProps.listing.views === nextProps.listing.views &&
    prevProps.isFavorited === nextProps.isFavorited &&
    prevProps.userLocation?.lat === nextProps.userLocation?.lat &&
    prevProps.userLocation?.lng === nextProps.userLocation?.lng
  );
};

export const ListingCard = memo<ListingCardProps>(({ listing, onPress, onFavorite, isFavorited = false, userLocation = null }) => {
  // Determine if this is an auto or property category
  const isAutoOrProperty = listing.category_id === 'auto_vehicles' || listing.category_id === 'properties';
  
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(price);

  const getTimeAgo = (date: string) => {
    try { return formatDistanceToNow(new Date(date), { addSuffix: false }); } catch { return ''; }
  };

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

  // Get display location (city name or text location)
  const getDisplayLocation = (): string => {
    if (listing.location_data?.city_name) return listing.location_data.city_name;
    return listing.location || 'Unknown';
  };

  const distance = getDistance();

  const getImageSource = () => {
    const img = listing.images?.[0];
    if (!img) return null;
    if (img.startsWith('http') || img.startsWith('data:')) return { uri: img };
    return { uri: `data:image/jpeg;base64,${img}` };
  };

  const imageSource = getImageSource();
  const imageCount = listing.images?.length || 0;

  return (
    <TouchableOpacity 
      style={[styles.card, listing.featured && styles.cardFeatured]} 
      onPress={onPress} 
      activeOpacity={0.95}
      data-testid={`listing-card-${listing.id}`}
    >
      <View style={[styles.imageContainer, !isAutoOrProperty && styles.compactImageContainer]}>
        <ImageWithSkeleton
          source={imageSource}
          style={styles.image}
          containerStyle={styles.imageWrapper}
          resizeMode="cover"
          placeholderIcon="image-outline"
          placeholderIconSize={32}
          placeholderIconColor="#CCC"
          testID={`listing-image-${listing.id}`}
        />
        {/* Badges - Just Listed, Featured & TOP */}
        <View style={styles.badgesContainer}>
          {isJustListed(listing.created_at) && (
            <View style={styles.justListedBadge}>
              <Ionicons name="time" size={9} color="#fff" />
              <Text style={styles.badgeText}>Just Listed</Text>
            </View>
          )}
          {listing.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={9} color="#fff" />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
          {(listing.is_top || listing.featured) && (
            <View style={styles.topBadge}>
              <Ionicons name="arrow-up" size={9} color="#fff" />
              <Text style={styles.badgeText}>TOP</Text>
            </View>
          )}
        </View>
        {onFavorite && (
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={(e) => { e.stopPropagation(); onFavorite(); }}
            data-testid={`favorite-btn-${listing.id}`}
          >
            <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={20} color={isFavorited ? '#E91E63' : '#fff'} />
          </TouchableOpacity>
        )}
        {imageCount > 1 && (
          <View style={styles.imageCountBadge}>
            <Ionicons name="camera" size={11} color="#fff" />
            <Text style={styles.imageCountText}>{imageCount}</Text>
          </View>
        )}
        {/* Negotiable Badge - Bottom Right of Image */}
        {listing.negotiable && (
          <View style={styles.negotiableBadge}>
            <Text style={styles.negotiableText}>Negotiable</Text>
          </View>
        )}
        {/* Views Counter - Bottom Right */}
        <View style={styles.viewsOverlay}>
          <Ionicons name="eye-outline" size={11} color="#fff" />
          <Text style={styles.viewsOverlayText}>{listing.views || 0}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={11} color="#999" />
          <Text style={styles.location} numberOfLines={1}>{getDisplayLocation()}</Text>
          {distance && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{distance} away</Text>
            </View>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{getTimeAgo(listing.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: { 
    width: '100%', 
    backgroundColor: '#fff', 
    borderRadius: BORDER_RADIUS, 
    overflow: 'hidden' 
  },
  cardFeatured: { 
    borderWidth: 2, 
    borderColor: '#2E7D32' 
  },
  imageContainer: { 
    height: CARD_IMAGE_HEIGHT, 
    position: 'relative' 
  },
  compactImageContainer: { 
    height: 140 
  },
  imageWrapper: { 
    width: '100%', 
    height: '100%' 
  },
  image: { 
    width: '100%', 
    height: '100%' 
  },
  badgesContainer: { 
    position: 'absolute', 
    top: 8, 
    left: 8, 
    flexDirection: 'column', 
    gap: 4 
  },
  justListedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: '#2196F3', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 4 
  },
  featuredBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: '#FF9800', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 4 
  },
  topBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    backgroundColor: '#2E7D32', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 4 
  },
  badgeText: { 
    color: '#fff', 
    fontSize: 9, 
    fontWeight: '700' 
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
    alignItems: 'center' 
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
    borderRadius: 4 
  },
  imageCountText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '600' 
  },
  negotiableBadge: { 
    position: 'absolute', 
    bottom: 8, 
    right: 8, 
    backgroundColor: '#E8F5E9', 
    paddingHorizontal: 6, 
    paddingVertical: 3, 
    borderRadius: 4 
  },
  negotiableText: { 
    color: '#2E7D32', 
    fontSize: 9, 
    fontWeight: '600' 
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
    borderRadius: 4 
  },
  viewsOverlayText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '500' 
  },
  content: { 
    padding: 10 
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    marginBottom: 4 
  },
  location: { 
    flex: 1, 
    fontSize: 11, 
    color: '#999' 
  },
  distanceBadge: { 
    backgroundColor: '#E3F2FD', 
    paddingHorizontal: 5, 
    paddingVertical: 1, 
    borderRadius: 8 
  },
  distanceText: { 
    fontSize: 9, 
    color: '#1976D2', 
    fontWeight: '600' 
  },
  title: { 
    fontSize: 13, 
    fontWeight: '500', 
    color: '#333', 
    marginBottom: 6, 
    lineHeight: 17 
  },
  priceRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  price: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#2E7D32' 
  },
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  time: { 
    fontSize: 10, 
    color: '#999' 
  },
});

export default ListingCard;
