import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { AutoListing } from '../../types/auto';
import { AutoListingCard } from './AutoListingCard';
import { TouchableScale } from '../common';

interface RecommendationSectionProps {
  title: string;
  icon: string;
  listings: AutoListing[];
  onPressListing: (listing: AutoListing) => void;
  onPressSeeAll?: () => void;
  onFavorite?: (listingId: string) => void;
  favorites?: Set<string>;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  title,
  icon,
  listings,
  onPressListing,
  onPressSeeAll,
  onFavorite,
  favorites = new Set(),
}) => {
  if (listings.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={icon as any} size={18} color={theme.colors.primary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {onPressSeeAll && (
          <TouchableScale onPress={onPressSeeAll} style={styles.seeAllButton} hapticFeedback="light">
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
          </TouchableScale>
        )}
      </View>
      <FlatList
        data={listings}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <AutoListingCard
              listing={item}
              onPress={() => onPressListing(item)}
              onFavorite={() => onFavorite?.(item.id)}
              isFavorited={favorites.has(item.id)}
            />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardWrapper: {
    width: 170,
  },
});
