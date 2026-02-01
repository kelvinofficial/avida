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
import { theme } from '../../utils/theme';
import { AutoListing } from '../../types/auto';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface AutoListingCardProps {
  listing: AutoListing;
  onPress: () => void;
  onFavorite?: () => void;
  onChat?: () => void;
  onCall?: () => void;
  isFavorited?: boolean;
}

export const AutoListingCard: React.FC<AutoListingCardProps> = ({
  listing,
  onPress,
  onFavorite,
  onChat,
  onCall,
  isFavorited = false,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
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

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false });
    } catch {
      return '';
    }
  };

  const imageSource = listing.images?.[0]
    ? listing.images[0].startsWith('data:')
      ? { uri: listing.images[0] }
      : { uri: `data:image/jpeg;base64,${listing.images[0]}` }
    : null;

  const imageCount = listing.images?.length || 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        listing.featured && styles.cardFeatured,
        listing.boosted && styles.cardBoosted,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="car" size={40} color={theme.colors.outline} />
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgeRow}>
          {listing.featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
          {listing.boosted && !listing.featured && (
            <View style={styles.boostedBadge}>
              <Ionicons name="rocket" size={10} color="#fff" />
              <Text style={styles.boostedText}>Boosted</Text>
            </View>
          )}
        </View>

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

        {/* Image count */}
        {imageCount > 0 && (
          <View style={styles.imageCountBadge}>
            <Ionicons name="camera" size={12} color="#fff" />
            <Text style={styles.imageCountText}>{imageCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          {listing.negotiable && (
            <View style={styles.negotiableBadge}>
              <Text style={styles.negotiableText}>Negotiable</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        {/* Car specs */}
        <View style={styles.specsRow}>
          <Text style={styles.specText}>{listing.year}</Text>
          <View style={styles.specDot} />
          <Text style={styles.specText}>{formatMileage(listing.mileage)}</Text>
          <View style={styles.specDot} />
          <Text style={styles.specText}>{listing.fuelType}</Text>
        </View>

        {/* Location & distance */}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.location} numberOfLines={1}>
            {listing.city}
            {listing.distance && ` • ${listing.distance} km away`}
          </Text>
        </View>

        {/* Seller badge */}
        {listing.seller && (
          <View style={styles.sellerRow}>
            {listing.seller.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={10} color={theme.colors.primary} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            {listing.seller.sellerType === 'dealer' && (
              <View style={styles.dealerBadge}>
                <Text style={styles.dealerText}>Dealer</Text>
              </View>
            )}
            {listing.seller.sellerType === 'certified' && (
              <View style={styles.certifiedBadge}>
                <Ionicons name="ribbon" size={10} color="#fff" />
                <Text style={styles.certifiedText}>Certified</Text>
              </View>
            )}
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          {onChat && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onChat();
              }}
            >
              <Ionicons name="chatbubble-outline" size={16} color={theme.colors.primary} />
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
              <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.whatsappButton]}
            onPress={(e) => e.stopPropagation()}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>
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
  cardFeatured: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  cardBoosted: {
    borderColor: theme.colors.warning,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 110,
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
  badgeRow: {
    position: 'absolute',
    top: theme.spacing.xs,
    left: theme.spacing.xs,
    flexDirection: 'row',
    gap: 4,
  },
  featuredBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  boostedBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  boostedText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: theme.borderRadius.full,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: theme.spacing.xs,
    left: theme.spacing.xs,
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
    padding: theme.spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  price: {
    fontSize: 15,
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
    fontSize: 9,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurface,
    lineHeight: 16,
    marginBottom: 4,
    minHeight: 32,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
    marginBottom: 4,
  },
  location: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  sellerRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  verifiedText: {
    fontSize: 9,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  dealerBadge: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dealerText: {
    fontSize: 9,
    color: theme.colors.onSecondaryContainer,
    fontWeight: '500',
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tertiary,
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
    gap: 6,
    marginTop: 2,
  },
  actionButton: {
    width: 32,
    height: 28,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappButton: {
    backgroundColor: '#E7FFE7',
  },
});
