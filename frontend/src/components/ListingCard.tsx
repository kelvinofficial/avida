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
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onPress,
  onFavorite,
  isFavorited = false,
  compact = false,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const imageSource = listing.images?.[0]
    ? listing.images[0].startsWith('data:')
      ? { uri: listing.images[0] }
      : { uri: `data:image/jpeg;base64,${listing.images[0]}` }
    : null;

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color={theme.colors.outline} />
          </View>
        )}
        
        {listing.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        
        {onFavorite && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorited ? theme.colors.error : theme.colors.onSurface}
            />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.price}>
          {formatPrice(listing.price)}
          {listing.negotiable && (
            <Text style={styles.negotiable}> VB</Text>
          )}
        </Text>
        
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        
        <View style={styles.footer}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.location} numberOfLines={1}>
              {listing.location}
            </Text>
          </View>
          <Text style={styles.time}>{getTimeAgo(listing.created_at)}</Text>
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
    ...theme.elevation.level1,
    overflow: 'hidden',
  },
  cardCompact: {
    width: '100%',
    flexDirection: 'row',
    height: 120,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
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
  featuredBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  featuredText: {
    color: theme.colors.onPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: theme.borderRadius.full,
    padding: 6,
  },
  content: {
    padding: theme.spacing.sm,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  negotiable: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.onSurfaceVariant,
  },
  title: {
    fontSize: 13,
    color: theme.colors.onSurface,
    marginTop: 4,
    lineHeight: 18,
  },
  footer: {
    marginTop: theme.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  time: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
});
