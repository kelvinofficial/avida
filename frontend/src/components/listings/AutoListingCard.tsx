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
import { ImagePlaceholder } from '../common/ImagePlaceholder';

const COLORS = {
  primary: '#2E7D32',
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
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const attributes = listing.attributes || {};
  const year = attributes.year;
  const mileage = attributes.mileage || attributes.km;
  const transmission = attributes.transmission;

  const formatMileage = (km: number) => {
    if (km >= 1000) return `${Math.round(km / 1000)}k km`;
    return `${km} km`;
  };

  // Build highlights array (max 3)
  const highlights: string[] = [];
  if (year) highlights.push(String(year));
  if (mileage) highlights.push(formatMileage(mileage));
  if (transmission) highlights.push(transmission);

  return (
    <TouchableOpacity style={[styles.autoCard, listing.featured && styles.autoCardFeatured]} onPress={onPress} activeOpacity={0.97}>
      <View style={styles.autoCardRow}>
        {/* Left: Image */}
        <View style={styles.autoImageContainer}>
          <Image
            source={{ uri: listing.images?.[0] || 'https://via.placeholder.com/300x200' }}
            style={styles.autoImage}
            resizeMode="cover"
          />
          {listing.featured && (
            <View style={styles.autoFeaturedBadge}>
              <Text style={styles.autoFeaturedText}>TOP</Text>
            </View>
          )}
          {listing.images?.length > 1 && (
            <View style={styles.autoImageCount}>
              <Ionicons name="camera-outline" size={10} color="#fff" />
              <Text style={styles.autoImageCountText}>{listing.images.length}</Text>
            </View>
          )}
          {/* Views Counter - Bottom Right */}
          <View style={styles.viewsContainer}>
            <Ionicons name="eye-outline" size={10} color="#fff" />
            <Text style={styles.viewsText}>{listing.views || 0}</Text>
          </View>
        </View>

        {/* Right: Content */}
        <View style={styles.autoCardContent}>
          {/* Price */}
          <Text style={styles.autoPrice}>{formatPrice(listing.price)}</Text>

          {/* Title */}
          <Text style={styles.autoTitle} numberOfLines={2}>{listing.title}</Text>

          {/* Highlights Row (no icons) */}
          {highlights.length > 0 && (
            <Text style={styles.autoHighlights}>{highlights.join(' • ')}</Text>
          )}

          {/* Location */}
          <View style={styles.autoLocationRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.autoLocation} numberOfLines={1}>{listing.location}</Text>
          </View>

          {/* Date */}
          <Text style={styles.autoDate}>{formatDate(listing.created_at)}</Text>
        </View>

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.autoFavoriteButton}
          onPress={(e) => { e.stopPropagation(); onFavorite(); }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorited ? '#E53935' : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  autoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  autoCardFeatured: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  autoCardRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  autoImageContainer: {
    width: 150,
    height: 115,
    position: 'relative',
  },
  autoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
  },
  autoFeaturedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  autoFeaturedText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  autoImageCount: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoImageCountText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  viewsContainer: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewsText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  autoCardContent: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 36,
  },
  autoPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  autoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  autoHighlights: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  autoLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  autoLocation: {
    fontSize: 10,
    color: COLORS.textLight,
    flex: 1,
  },
  autoDate: {
    fontSize: 9,
    color: COLORS.textLight,
  },
  autoFavoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AutoListingCard;
