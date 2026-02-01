import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../src/utils/theme';
import { listingsApi, categoriesApi, favoritesApi } from '../../src/utils/api';
import { Listing, Category } from '../../src/types';
import { ListingCard } from '../../src/components/ListingCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';

const { width } = Dimensions.get('window');
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'For Parts'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function SearchScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [query, setQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Modal
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(console.error);
    if (isAuthenticated) {
      favoritesApi.getAll()
        .then((favs) => setFavorites(new Set(favs.map((f: Listing) => f.id))))
        .catch(console.error);
    }
  }, [isAuthenticated]);

  const search = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const result = await listingsApi.getAll({
        search: query || undefined,
        category: selectedCategory || undefined,
        min_price: minPrice ? parseFloat(minPrice) : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        condition: condition || undefined,
        location: location || undefined,
        sort: sortBy,
        limit: 50,
      });
      setListings(result.listings);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [query, selectedCategory, minPrice, maxPrice, condition, location, sortBy]);

  const clearFilters = () => {
    setSelectedCategory(null);
    setMinPrice('');
    setMaxPrice('');
    setCondition(null);
    setLocation('');
  };

  const toggleFavorite = async (listingId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      if (favorites.has(listingId)) {
        await favoritesApi.remove(listingId);
        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(listingId);
          return newSet;
        });
      } else {
        await favoritesApi.add(listingId);
        setFavorites((prev) => new Set(prev).add(listingId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const activeFiltersCount = [
    selectedCategory,
    minPrice,
    maxPrice,
    condition,
    location,
  ].filter(Boolean).length;

  const renderItem = ({ item, index }: { item: Listing; index: number }) => (
    <View style={[styles.cardWrapper, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}>
      <ListingCard
        listing={item}
        onPress={() => router.push(`/listing/${item.id}`)}
        onFavorite={() => toggleFavorite(item.id)}
        isFavorited={favorites.has(item.id)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search listings..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              returnKeyType="search"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <TouchableOpacity style={styles.searchButton} onPress={search}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFiltersCount > 0 && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={activeFiltersCount > 0 ? theme.colors.onPrimary : theme.colors.onSurface}
            />
            <Text
              style={[
                styles.filterButtonText,
                activeFiltersCount > 0 && styles.filterButtonTextActive,
              ]}
            >
              Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSort(true)}
          >
            <Ionicons name="swap-vertical" size={18} color={theme.colors.onSurface} />
            <Text style={styles.sortButtonText}>
              {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            hasSearched ? (
              <EmptyState
                icon="search-outline"
                title="No results found"
                description="Try different keywords or adjust your filters"
              />
            ) : (
              <EmptyState
                icon="search"
                title="Find what you need"
                description="Search for listings or browse by category"
              />
            )
          }
        />
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.filterLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  !selectedCategory && styles.chipSelected,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.chipText, !selectedCategory && styles.chipTextSelected]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    selectedCategory === cat.id && styles.chipSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextSelected]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>Price Range</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
              />
              <Text style={styles.priceSeparator}>to</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
            </View>

            <Text style={styles.filterLabel}>Condition</Text>
            <View style={styles.conditionRow}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    condition === c && styles.chipSelected,
                  ]}
                  onPress={() => setCondition(condition === c ? null : c)}
                >
                  <Text style={[styles.chipText, condition === c && styles.chipTextSelected]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Location</Text>
            <TextInput
              style={styles.locationInput}
              placeholder="Enter city or area"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={location}
              onChangeText={setLocation}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowFilters(false);
                search();
              }}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSort}
        animationType="fade"
        transparent
      >
        <TouchableOpacity
          style={styles.sortOverlay}
          activeOpacity={1}
          onPress={() => setShowSort(false)}
        >
          <View style={styles.sortModal}>
            <Text style={styles.sortTitle}>Sort By</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  sortBy === option.value && styles.sortOptionSelected,
                ]}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSort(false);
                  if (hasSearched) search();
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...theme.elevation.level1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    color: theme.colors.onSurface,
  },
  filterButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  sortButtonText: {
    fontSize: 13,
    color: theme.colors.onSurface,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  cardWrapper: {
    flex: 1,
  },
  cardLeft: {
    paddingRight: theme.spacing.xs,
  },
  cardRight: {
    paddingLeft: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  chip: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.onSurface,
  },
  chipTextSelected: {
    color: theme.colors.onPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  priceInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  priceSeparator: {
    color: theme.colors.onSurfaceVariant,
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  locationInput: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  clearButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: 'center',
  },
  clearButtonText: {
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  sortOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  sortModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxWidth: 320,
    padding: theme.spacing.md,
  },
  sortTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  sortOptionSelected: {
    // selected state
  },
  sortOptionText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  sortOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
