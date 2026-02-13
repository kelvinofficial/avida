import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { AutoListing } from '../../types/auto';
import { TouchableScale, OptimizedImage } from '../common';

const { width } = Dimensions.get('window');

interface HorizontalListingCardProps {
  listing: AutoListing;
  onPress: () => void;
  onFavorite?: () => void;
  onChat?: () => void;
  onCall?: () => void;
  isFavorited?: boolean;
}

export const HorizontalListingCard: React.FC<HorizontalListingCardProps> = ({
  listing,
  onPress,
  onFavorite,
  onChat,
  onCall,
  isFavorited = false,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatMileage = (mileage: number) => {
    if (mileage >= 1000) {
      return `${(mileage / 1000).toFixed(0)}k km`;
    }
    return `${mileage} km`;
  };

  return (
    <TouchableScale
      style={[
        styles.card,
        listing.featured && styles.cardFeatured,
        listing.boosted && styles.cardBoosted,
      ]}
      onPress={onPress}
      hapticFeedback="light"
      testID={`horizontal-listing-${listing.id}`}
    >
      {/* Left: Image */}
      <View style={styles.imageContainer}>
        <OptimizedImage
          uri={listing.images?.[0]}
          style={styles.image}
          placeholderType="listing"
          placeholderSize="medium"
          priority={listing.featured ? 'high' : 'normal'}
        />

        {/* Featured/Boosted Badge */}
        {(listing.featured || listing.boosted) && (
          <View style={[
            styles.badge,
            listing.featured ? styles.featuredBadge : styles.boostedBadge
          ]}>
            {listing.featured ? (
              <Ionicons name="star" size={10} color="#fff" />
            ) : (
              <Ionicons name="rocket" size={10} color="#fff" />
            )}
          </View>
        )}

        {/* Image count */}
        {listing.images && listing.images.length > 1 && (
          <View style={styles.imageCountBadge}>
            <Ionicons name="camera" size={10} color="#fff" />
            <Text style={styles.imageCountText}>{listing.images.length}</Text>
          </View>
        )}
      </View>

      {/* Right: Content */}
      <View style={styles.content}>
        {/* Price Row */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          {listing.negotiable && (
            <View style={styles.negotiableBadge}>
              <Text style={styles.negotiableText}>VB</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        {/* Specs Row */}
        <View style={styles.specsRow}>
          <Text style={styles.specText}>{listing.year}</Text>
          <View style={styles.specDot} />
          <Text style={styles.specText}>{formatMileage(listing.mileage)}</Text>
          <View style={styles.specDot} />
          <Text style={styles.specText}>{listing.fuelType}</Text>
          <View style={styles.specDot} />
          <Text style={styles.specText}>{listing.transmission}</Text>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.locationText} numberOfLines={1}>
            {listing.city}
            {listing.distance && ` • ${listing.distance} km`}
          </Text>
        </View>

        {/* Bottom Row: Seller & Actions */}
        <View style={styles.bottomRow}>
          {/* Seller Info */}
          <View style={styles.sellerInfo}>
            {listing.seller?.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color={theme.colors.primary} />
              </View>
            )}
            {listing.seller?.sellerType === 'dealer' && (
              <View style={styles.dealerBadge}>
                <Text style={styles.dealerText}>Dealer</Text>
              </View>
            )}
            {listing.seller?.sellerType === 'certified' && (
              <View style={styles.certifiedBadge}>
                <Ionicons name="ribbon" size={10} color="#fff" />
                <Text style={styles.certifiedText}>Certified</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {onFavorite && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onFavorite();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isFavorited ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isFavorited ? theme.colors.error : theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            )}
            {onChat && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onChat();
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            {onCall && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onCall();
                }}
              >
                <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  cardFeatured: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  cardBoosted: {
    borderColor: theme.colors.warning,
  },
  imageContainer: {
    width: 130,
    height: 130,
    backgroundColor: theme.colors.surfaceVariant,
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
    backgroundColor: theme.colors.surfaceVariant,
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
    backgroundColor: theme.colors.primary,
  },
  boostedBadge: {
    backgroundColor: theme.colors.warning,
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
  content: {
    flex: 1,
    padding: theme.spacing.sm,
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
    color: theme.colors.onSurface,
  },
  negotiableBadge: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  negotiableText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.onSurface,
    lineHeight: 17,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  specText: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  specDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.outline,
    marginHorizontal: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
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
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealerBadge: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealerText: {
    fontSize: 9,
    color: theme.colors.onSecondaryContainer,
    fontWeight: '600',
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tertiary,
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
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
