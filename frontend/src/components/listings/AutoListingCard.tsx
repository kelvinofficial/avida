import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ListingCardProps } from './ListingCard';
import { TouchableScale, OptimizedImage } from '../common';

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

const AutoListingCard = memo<ListingCardProps>(({ listing, onPress, onFavorite, isFavorited = false }) => {
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
  const year = attributes.year;
  const mileage = attributes.mileage || attributes.km || attributes.miles;
  const transmission = attributes.transmission;
  const vehicleType = attributes.body_type || listing.subcategory?.replace(/_/g, ' ');

  const formatMileage = (value: number) => {
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return `${value}`;
  };

  return (
    <TouchableScale 
      style={[styles.autoCard, listing.featured && styles.autoCardFeatured]} 
      onPress={onPress}
      hapticFeedback="light"
      testID={`auto-card-${listing._id || listing.id}`}
    >
      {/* Image on Top */}
      <View style={styles.autoImageContainer}>
        <OptimizedImage
          uri={listing.images?.[0]}
          style={styles.autoImage}
          placeholderType="listing"
          placeholderSize="large"
          priority={listing.featured ? 'high' : 'normal'}
        />
        {listing.featured && (
          <View style={styles.autoFeaturedBadge}>
            <Text style={styles.autoFeaturedText}>FEATURED</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.autoFavoriteButton}
          onPress={(e) => { e.stopPropagation(); onFavorite(); }}
          testID={`auto-favorite-btn-${listing._id || listing.id}`}
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
        {vehicleType && (
          <View style={styles.vehicleTypeBadge}>
            <Text style={styles.vehicleTypeBadgeText}>{vehicleType}</Text>
          </View>
        )}
        {/* Views Counter - Bottom Right */}
        <View style={styles.viewsContainer}>
          <Ionicons name="eye-outline" size={11} color="#fff" />
          <Text style={styles.viewsText}>{listing.views || 0}</Text>
        </View>
      </View>

      {/* Content Below */}
      <View style={styles.autoCardContent}>
        {/* Price Row */}
        <View style={styles.autoPriceRow}>
          <Text style={styles.autoPrice}>{formatPrice(listing.price)}</Text>
          {listing.negotiable && (
            <Text style={styles.negotiableTag}>Negotiable</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.autoTitle} numberOfLines={1}>{listing.title}</Text>

        {/* Features Row: Mileage | Year | Transmission */}
        <View style={styles.autoFeatures}>
          {mileage && (
            <View style={styles.featureItem}>
              <Ionicons name="speedometer-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.featureText}>{formatMileage(mileage)} mi</Text>
            </View>
          )}
          {mileage && (year || transmission) && <View style={styles.featureDivider} />}
          {year && (
            <View style={styles.featureItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.featureText}>{year}</Text>
            </View>
          )}
          {year && transmission && <View style={styles.featureDivider} />}
          {transmission && (
            <View style={styles.featureItem}>
              <Ionicons name="cog-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.featureText}>{transmission}</Text>
            </View>
          )}
        </View>

        {/* Bottom Row: Location & Date */}
        <View style={styles.autoBottomRow}>
          <View style={styles.autoLocationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.autoLocation} numberOfLines={1}>{listing.location}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.dateText}>{formatDate(listing.created_at)}</Text>
          </View>
        </View>
      </View>
    </TouchableScale>
  );
});

const styles = StyleSheet.create({
  autoCard: {
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
  autoCardFeatured: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  autoImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  autoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
  },
  autoFeaturedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  autoFeaturedText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  autoFavoriteButton: {
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
  vehicleTypeBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  vehicleTypeBadgeText: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  autoCardContent: {
    padding: 12,
  },
  autoPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  autoPrice: {
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
  autoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  autoFeatures: {
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
  autoBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  autoLocation: {
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

export default AutoListingCard;
