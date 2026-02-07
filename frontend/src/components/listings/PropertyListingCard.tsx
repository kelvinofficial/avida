import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ListingCardProps } from './ListingCard';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
};

const PropertyListingCard = memo<ListingCardProps>(({ listing, onPress, onFavorite, isFavorited = false }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: listing.currency || 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const attributes = listing.attributes || {};
  const bedrooms = attributes.bedrooms || attributes.rooms;
  const bathrooms = attributes.bathrooms;
  const size = attributes.size || attributes.area;
  const propertyType = attributes.property_type || listing.subcategory?.replace(/_/g, ' ');

  return (
    <TouchableOpacity style={[styles.propertyCard, listing.featured && styles.propertyCardFeatured]} onPress={onPress} activeOpacity={0.97}>
      {/* Image on Top */}
      <View style={styles.propertyImageContainer}>
        <Image
          source={{ uri: listing.images?.[0] || 'https://via.placeholder.com/400x200' }}
          style={styles.propertyImage}
          resizeMode="cover"
        />
        {listing.featured && (
          <View style={styles.propertyFeaturedBadge}>
            <Text style={styles.propertyFeaturedText}>FEATURED</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.propertyFavoriteButton}
          onPress={(e) => { e.stopPropagation(); onFavorite(); }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorited ? '#E53935' : '#FFFFFF'}
          />
        </TouchableOpacity>
        {listing.images?.length > 1 && (
          <View style={styles.imageCountBadge}>
            <Ionicons name="camera-outline" size={11} color="#fff" />
            <Text style={styles.imageCountText}>{listing.images.length}</Text>
          </View>
        )}
        {propertyType && (
          <View style={styles.propertyTypeBadge}>
            <Text style={styles.propertyTypeBadgeText}>{propertyType}</Text>
          </View>
        )}
        {/* Views Counter - Bottom Right */}
        <View style={styles.viewsContainer}>
          <Ionicons name="eye-outline" size={11} color="#fff" />
          <Text style={styles.viewsText}>{listing.views || 0}</Text>
        </View>
      </View>

      {/* Content Below */}
      <View style={styles.propertyCardContent}>
        {/* Price Row */}
        <View style={styles.propertyPriceRow}>
          <Text style={styles.propertyPrice}>{formatPrice(listing.price)}</Text>
          {listing.negotiable && (
            <Text style={styles.negotiableTag}>Negotiable</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.propertyTitle} numberOfLines={1}>{listing.title}</Text>

        {/* Features Row: Beds | Baths | Size */}
        <View style={styles.propertyFeatures}>
          {bedrooms && (
            <View style={styles.featureItem}>
              <Ionicons name="bed-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.featureText}>{bedrooms} {bedrooms === 1 ? 'Bed' : 'Beds'}</Text>
            </View>
          )}
          {bedrooms && (bathrooms || size) && <View style={styles.featureDivider} />}
          {bathrooms && (
            <View style={styles.featureItem}>
              <Ionicons name="water-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.featureText}>{bathrooms} {bathrooms === 1 ? 'Bath' : 'Baths'}</Text>
            </View>
          )}
          {bathrooms && size && <View style={styles.featureDivider} />}
          {size && (
            <View style={styles.featureItem}>
              <Ionicons name="expand-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.featureText}>{size} m²</Text>
            </View>
          )}
        </View>

        {/* Bottom Row: Location & Date */}
        <View style={styles.propertyBottomRow}>
          <View style={styles.propertyLocationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.propertyLocation} numberOfLines={1}>{listing.location}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.dateText}>{formatDate(listing.created_at)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  propertyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  propertyCardFeatured: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  propertyImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
  },
  propertyFeaturedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  propertyFeaturedText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  propertyFavoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 10,
    left: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  viewsContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  viewsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  propertyTypeBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  propertyTypeBadgeText: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  propertyCardContent: {
    padding: 12,
  },
  propertyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  negotiableTag: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  propertyFeatures: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureDivider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  propertyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propertyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  propertyLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
});

export default PropertyListingCard;
