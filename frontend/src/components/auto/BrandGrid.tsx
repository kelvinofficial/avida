import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { CarBrand } from '../../types/auto';

interface BrandGridProps {
  brands: CarBrand[];
  selectedBrand?: string;
  onSelectBrand: (brandId: string | null) => void;
  onLongPressBrand?: (brandId: string) => void;
}

export const BrandGrid: React.FC<BrandGridProps> = ({
  brands,
  selectedBrand,
  onSelectBrand,
  onLongPressBrand,
}) => {
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse by Brand</Text>
        <TouchableOpacity onPress={() => onSelectBrand(null)}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {brands.map((brand) => (
          <TouchableOpacity
            key={brand.id}
            style={[
              styles.brandTile,
              selectedBrand === brand.id && styles.brandTileSelected,
            ]}
            onPress={() => onSelectBrand(selectedBrand === brand.id ? null : brand.id)}
            onLongPress={() => onLongPressBrand?.(brand.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.logoContainer,
              selectedBrand === brand.id && styles.logoContainerSelected,
            ]}>
              <Text style={styles.logo}>{brand.logo}</Text>
            </View>
            <Text style={[
              styles.brandName,
              selectedBrand === brand.id && styles.brandNameSelected,
            ]} numberOfLines={1}>
              {brand.name}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{formatCount(brand.listingsCount)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  viewAll: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  brandTile: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    minWidth: 72,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  brandTileSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  logoContainerSelected: {
    backgroundColor: theme.colors.primary,
  },
  logo: {
    fontSize: 24,
  },
  brandName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 2,
  },
  brandNameSelected: {
    color: theme.colors.primary,
  },
  countBadge: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
});
