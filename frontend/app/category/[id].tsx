import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { listingsApi, categoriesApi, favoritesApi } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { safeGoBack } from '../../src/utils/navigation';
import {
  getMainCategory,
  getSubcategories,
  getSubcategoryConfig,
  getConditionOptions,
} from '../../src/config/subcategories';
import {
  ListingCard,
  PropertyListingCard,
  AutoListingCard,
} from '../../src/components/listings';

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

// ============ FILTER CHIP ============
interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  count?: number;
}

const FilterChip = memo<FilterChipProps>(function FilterChip({ label, selected, onPress, count }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, selected && styles.filterChipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.filterChipCount, selected && styles.filterChipCountSelected]}>
          <Text style={[styles.filterChipCountText, selected && styles.filterChipCountTextSelected]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ============ MAIN SCREEN ============
export default function CategoryScreen() {
  const router = useRouter();
  const { id, subcategory: initialSubcategory } = useLocalSearchParams<{ id: string; subcategory?: string }>();
  const { isAuthenticated } = useAuthStore();
  
  const [listings, setListings] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter state
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialSubcategory || '');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  const categoryId = id as string;

  // Get subcategories for this category
  const subcategories = useMemo(() => {
    return getSubcategories(categoryId);
  }, [categoryId]);

  // Get the current subcategory config
  const currentSubcategoryConfig = useMemo(() => {
    if (!selectedSubcategory) return null;
    return getSubcategoryConfig(categoryId, selectedSubcategory);
  }, [categoryId, selectedSubcategory]);

  // Get condition options based on selected subcategory
  const conditionOptions = useMemo(() => {
    if (!selectedSubcategory) return ['New', 'Like New', 'Good', 'Fair'];
    return getConditionOptions(categoryId, selectedSubcategory);
  }, [categoryId, selectedSubcategory]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSubcategory) count++;
    if (selectedCondition) count++;
    if (priceRange.min || priceRange.max) count++;
    count += Object.keys(activeFilters).filter(k => activeFilters[k]).length;
    return count;
  }, [selectedSubcategory, selectedCondition, priceRange, activeFilters]);

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
        setHasMore(true);
      }

      const currentPage = refresh ? 1 : page;
      
      // Build filters JSON string
      const filtersJson = Object.keys(activeFilters).length > 0 
        ? JSON.stringify(activeFilters) 
        : undefined;
      
      // Fetch category info and listings in parallel
      const [listingsRes, categoriesRes] = await Promise.all([
        listingsApi.getAll({ 
          category: categoryId, 
          subcategory: selectedSubcategory || undefined,
          page: currentPage, 
          limit: 20,
          min_price: priceRange.min ? parseFloat(priceRange.min) : undefined,
          max_price: priceRange.max ? parseFloat(priceRange.max) : undefined,
          condition: selectedCondition || undefined,
          sort: sortBy,
          filters: filtersJson,
        }),
        categoriesApi.getAll(),
      ]);

      const cat = categoriesRes.find((c: any) => c.id === categoryId);
      setCategory(cat);

      if (refresh) {
        setListings(listingsRes.listings);
      } else {
        setListings((prev) => [...prev, ...listingsRes.listings]);
      }
      
      setTotal(listingsRes.total);
      setHasMore(listingsRes.page < listingsRes.pages);

      // Fetch favorites if authenticated
      if (isAuthenticated) {
        try {
          const favs = await favoritesApi.getAll();
          setFavorites(new Set(favs.map((f: any) => f.id)));
        } catch (e) {
          console.log('Could not fetch favorites');
        }
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, page, isAuthenticated, selectedSubcategory, priceRange, selectedCondition, sortBy, activeFilters]);

  useEffect(() => {
    fetchData(true);
  }, [categoryId, selectedSubcategory, selectedCondition, sortBy]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage((p) => p + 1);
      fetchData(false);
    }
  };

  const handleFavorite = async (listingId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      if (favorites.has(listingId)) {
        await favoritesApi.remove(listingId);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } else {
        await favoritesApi.add(listingId);
        setFavorites((prev) => new Set(prev).add(listingId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleSubcategorySelect = (subcatId: string) => {
    if (selectedSubcategory === subcatId) {
      setSelectedSubcategory('');
    } else {
      setSelectedSubcategory(subcatId);
    }
    // Reset attribute filters when subcategory changes
    setActiveFilters({});
  };

  const handleApplyFilters = () => {
    setShowFiltersModal(false);
    fetchData(true);
  };

  const handleClearFilters = () => {
    setSelectedSubcategory('');
    setActiveFilters({});
    setPriceRange({ min: '', max: '' });
    setSelectedCondition('');
    setSortBy('newest');
    setShowFiltersModal(false);
  };

  const getListingRoute = (listing: any) => {
    const catId = listing.category_id;
    const listingId = listing.id;
    
    // Only route to /auto/ for listings with auto_ prefix (from auto_listings collection)
    if (catId === 'auto_vehicles' && listingId.startsWith('auto_')) {
      return `/auto/${listingId}`;
    }
    // Only route to /property/ for listings with prop_ prefix (from properties collection)
    if (catId === 'properties' && listingId.startsWith('prop_')) {
      return `/property/${listingId}`;
    }
    // Default: route to generic listing page (for listings in listings collection)
    return `/listing/${listingId}`;
  };

  const isPropertyCategory = categoryId === 'properties';
  const isAutoCategory = categoryId === 'auto_vehicles';
  const isSingleColumn = isPropertyCategory || isAutoCategory;

  const renderListingCard = ({ item }: { item: any }) => {
    if (isPropertyCategory) {
      return (
        <PropertyListingCard
          listing={item}
          onPress={() => router.push(getListingRoute(item))}
          onFavorite={() => handleFavorite(item.id)}
          isFavorited={favorites.has(item.id)}
        />
      );
    }
    if (isAutoCategory) {
      return (
        <AutoListingCard
          listing={item}
          onPress={() => router.push(getListingRoute(item))}
          onFavorite={() => handleFavorite(item.id)}
          isFavorited={favorites.has(item.id)}
        />
      );
    }
    return (
      <ListingCard
        listing={item}
        onPress={() => router.push(getListingRoute(item))}
        onFavorite={() => handleFavorite(item.id)}
        isFavorited={favorites.has(item.id)}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No listings found</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilterCount > 0 
          ? 'Try adjusting your filters to see more results'
          : 'There are no listings in this category yet.'}
      </Text>
      {activeFilterCount > 0 && (
        <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
          <Text style={styles.clearFiltersText}>Clear all filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  // ============ FILTERS MODAL ============
  const renderFiltersModal = () => (
    <Modal
      visible={showFiltersModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowFiltersModal(false)}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFiltersModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={handleClearFilters}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Subcategory Filter */}
          {subcategories.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Subcategory</Text>
              <View style={styles.filterChipsWrap}>
                {subcategories.map((sub) => (
                  <FilterChip
                    key={sub.id}
                    label={sub.name}
                    selected={selectedSubcategory === sub.id}
                    onPress={() => handleSubcategorySelect(sub.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.priceRangeRow}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceInputLabel}>Min</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={priceRange.min}
                  onChangeText={(val) => setPriceRange(prev => ({ ...prev, min: val }))}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
              <View style={styles.priceDivider}>
                <Text style={styles.priceDividerText}>-</Text>
              </View>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceInputLabel}>Max</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Any"
                  keyboardType="numeric"
                  value={priceRange.max}
                  onChangeText={(val) => setPriceRange(prev => ({ ...prev, max: val }))}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>
          </View>

          {/* Condition Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Condition</Text>
            <View style={styles.filterChipsWrap}>
              {conditionOptions.map((cond) => (
                <FilterChip
                  key={cond}
                  label={cond}
                  selected={selectedCondition === cond}
                  onPress={() => setSelectedCondition(selectedCondition === cond ? '' : cond)}
                />
              ))}
            </View>
          </View>

          {/* Subcategory-Specific Attributes */}
          {currentSubcategoryConfig && currentSubcategoryConfig.attributes.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {currentSubcategoryConfig.name} Filters
              </Text>
              {currentSubcategoryConfig.attributes
                .filter(attr => attr.type === 'select' && attr.options)
                .slice(0, 5) // Limit to top 5 attributes for filtering
                .map((attr) => (
                  <View key={attr.name} style={styles.attributeFilter}>
                    <Text style={styles.attributeFilterLabel}>{attr.label}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.attributeChipsRow}>
                        {attr.options?.slice(0, 8).map((opt) => (
                          <FilterChip
                            key={opt}
                            label={opt}
                            selected={activeFilters[attr.name] === opt}
                            onPress={() => {
                              setActiveFilters(prev => ({
                                ...prev,
                                [attr.name]: prev[attr.name] === opt ? undefined : opt
                              }));
                            }}
                          />
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ))}
            </View>
          )}

          {/* Sort By */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.filterChipsWrap}>
              {[
                { id: 'newest', label: 'Newest' },
                { id: 'oldest', label: 'Oldest' },
                { id: 'price_asc', label: 'Price: Low to High' },
                { id: 'price_desc', label: 'Price: High to Low' },
              ].map((sort) => (
                <FilterChip
                  key={sort.id}
                  label={sort.label}
                  selected={sortBy === sort.id}
                  onPress={() => setSortBy(sort.id)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
            <Text style={styles.applyButtonText}>Show {total} Results</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (loading && listings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const mainCategory = getMainCategory(categoryId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {mainCategory?.icon && (
            <Ionicons name={mainCategory.icon as any} size={20} color={COLORS.primary} />
          )}
          <Text style={styles.headerTitle}>{mainCategory?.name || categoryId}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/search')} style={styles.searchButton}>
          <Ionicons name="search" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Subcategory Chips - Horizontal Scroll */}
      {subcategories.length > 0 && (
        <View style={styles.subcategoriesBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesContent}
          >
            <TouchableOpacity
              style={[styles.subcategoryChip, !selectedSubcategory && styles.subcategoryChipSelected]}
              onPress={() => setSelectedSubcategory('')}
            >
              <Text style={[styles.subcategoryChipText, !selectedSubcategory && styles.subcategoryChipTextSelected]}>
                All
              </Text>
            </TouchableOpacity>
            {subcategories.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subcategoryChip, selectedSubcategory === sub.id && styles.subcategoryChipSelected]}
                onPress={() => handleSubcategorySelect(sub.id)}
              >
                <Text style={[styles.subcategoryChipText, selectedSubcategory === sub.id && styles.subcategoryChipTextSelected]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results Bar with Filter Button */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>{total} listings found</Text>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]} 
          onPress={() => setShowFiltersModal(true)}
        >
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#fff' : COLORS.text} />
          <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedSubcategory && (
              <TouchableOpacity 
                style={styles.activeFilterTag}
                onPress={() => setSelectedSubcategory('')}
              >
                <Text style={styles.activeFilterTagText}>
                  {subcategories.find(s => s.id === selectedSubcategory)?.name}
                </Text>
                <Ionicons name="close-circle" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {selectedCondition && (
              <TouchableOpacity 
                style={styles.activeFilterTag}
                onPress={() => setSelectedCondition('')}
              >
                <Text style={styles.activeFilterTagText}>{selectedCondition}</Text>
                <Ionicons name="close-circle" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {(priceRange.min || priceRange.max) && (
              <TouchableOpacity 
                style={styles.activeFilterTag}
                onPress={() => { setPriceRange({ min: '', max: '' }); fetchData(true); }}
              >
                <Text style={styles.activeFilterTagText}>
                  €{priceRange.min || '0'} - €{priceRange.max || 'Any'}
                </Text>
                <Ionicons name="close-circle" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {Object.entries(activeFilters).filter(([_, v]) => v).map(([key, value]) => (
              <TouchableOpacity 
                key={key}
                style={styles.activeFilterTag}
                onPress={() => {
                  setActiveFilters(prev => ({ ...prev, [key]: undefined }));
                  fetchData(true);
                }}
              >
                <Text style={styles.activeFilterTagText}>{value}</Text>
                <Ionicons name="close-circle" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Listings Grid */}
      {isSingleColumn ? (
        <FlatList
          data={listings}
          renderItem={renderListingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={isAutoCategory ? styles.autoListContent : styles.propertyListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={listings}
          renderItem={renderListingCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filters Modal */}
      {renderFiltersModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  searchButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Subcategories Bar
  subcategoriesBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subcategoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subcategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  subcategoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subcategoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  subcategoryChipTextSelected: {
    color: '#fff',
  },

  // Results Bar
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterCountBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Active Filters Bar
  activeFiltersBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    marginRight: 8,
  },
  activeFilterTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 8,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  clearFiltersText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // Filter Chips
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  filterChipCount: {
    marginLeft: 6,
    backgroundColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterChipCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterChipCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipCountTextSelected: {
    color: '#fff',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  clearAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  // Price Range
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  priceInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  priceDivider: {
    paddingHorizontal: 12,
    paddingTop: 18,
  },
  priceDividerText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },

  // Attribute Filters
  attributeFilter: {
    marginTop: 12,
  },
  attributeFilterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  attributeChipsRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },

  // Modal Footer
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // List content styles for different layouts
  propertyListContent: {
    padding: 12,
    flexGrow: 1,
  },
  autoListContent: {
    padding: 12,
    flexGrow: 1,
  },
});
