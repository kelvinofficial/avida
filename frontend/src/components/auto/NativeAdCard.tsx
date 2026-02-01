import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

interface NativeAdCardProps {
  type?: 'listing' | 'banner' | 'sponsored';
}

export const NativeAdCard: React.FC<NativeAdCardProps> = ({ type = 'listing' }) => {
  if (type === 'banner') {
    return (
      <View style={styles.bannerContainer}>
        <View style={styles.bannerContent}>
          <View style={styles.bannerIcon}>
            <Ionicons name="megaphone" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Boost Your Listing</Text>
            <Text style={styles.bannerSubtitle}>Get 10x more views. Starting €5/week</Text>
          </View>
          <TouchableOpacity style={styles.bannerButton}>
            <Text style={styles.bannerButtonText}>Boost</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.adLabel}>
          <Text style={styles.adLabelText}>Ad</Text>
        </View>
      </View>
    );
  }

  if (type === 'sponsored') {
    return (
      <View style={styles.sponsoredContainer}>
        <View style={styles.sponsoredHeader}>
          <Text style={styles.sponsoredTitle}>Promoted Dealers</Text>
          <View style={styles.adLabel}>
            <Text style={styles.adLabelText}>Sponsored</Text>
          </View>
        </View>
        <View style={styles.dealersRow}>
          {[1, 2, 3].map((i) => (
            <TouchableOpacity key={i} style={styles.dealerCard}>
              <View style={styles.dealerLogo}>
                <Ionicons name="storefront" size={24} color={theme.colors.tertiary} />
              </View>
              <Text style={styles.dealerName}>AutoHaus {i}</Text>
              <View style={styles.dealerBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#fff" />
                <Text style={styles.dealerBadgeText}>Certified</Text>
              </View>
              <Text style={styles.dealerListings}>142 cars</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Default listing-style native ad
  return (
    <View style={styles.listingAdContainer}>
      <View style={styles.listingAdImage}>
        <View style={styles.placeholderImage}>
          <Ionicons name="car-sport" size={40} color={theme.colors.tertiary} />
        </View>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>
      </View>
      <View style={styles.listingAdContent}>
        <Text style={styles.listingAdTitle}>Looking for your dream car?</Text>
        <Text style={styles.listingAdSubtitle}>Browse 10,000+ verified listings</Text>
        <TouchableOpacity style={styles.listingAdButton}>
          <Text style={styles.listingAdButtonText}>Explore Now</Text>
          <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Listing-style ad
  listingAdContainer: {
    backgroundColor: theme.colors.tertiaryContainer,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  listingAdImage: {
    height: 100,
    backgroundColor: `${theme.colors.tertiary}20`,
    position: 'relative',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    left: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  listingAdContent: {
    padding: theme.spacing.sm,
  },
  listingAdTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onTertiaryContainer,
    marginBottom: 2,
  },
  listingAdSubtitle: {
    fontSize: 12,
    color: theme.colors.onTertiaryContainer,
    opacity: 0.8,
    marginBottom: theme.spacing.sm,
  },
  listingAdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listingAdButtonText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Banner ad
  bannerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryContainer,
    position: 'relative',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  bannerButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  bannerButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  adLabel: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adLabelText: {
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },

  // Sponsored dealers
  sponsoredContainer: {
    marginBottom: theme.spacing.lg,
  },
  sponsoredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sponsoredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  dealersRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dealerCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  dealerLogo: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.tertiaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  dealerName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  dealerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tertiary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
    marginBottom: 2,
  },
  dealerBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '500',
  },
  dealerListings: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
});
