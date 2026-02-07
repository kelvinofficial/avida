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
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onPress,
  onFavorite,
  isFavorited = false,
  compact = false,
  imageHeight = 130,
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

  const imageSource = listing.images?.[0]
    ? listing.images[0].startsWith('data:')
      ? { uri: listing.images[0] }
      : { uri: `data:image/jpeg;base64,${listing.images[0]}` }
    : null;

  const imageCount = listing.images?.length || 0;

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color={theme.colors.outline} />
          </View>
        )}
        
        {/* Top badges */}
        {listing.featured && (
          <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>TOP</Text>
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
        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.location} numberOfLines={1}>
            {listing.location}
          </Text>
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
  },
  topBadgeText: {
    color: theme.colors.onPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
