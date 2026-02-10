import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Modal,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { listingsApi, categoriesApi, favoritesApi, locationsApi } from '../../src/utils/api';
import { sandboxAwareListingsApi, sandboxAwareCategoriesApi, sandboxUtils } from '../../src/utils/sandboxAwareApi';
import { Listing, Category } from '../../src/types';
import { ListingCard } from '../../src/components/ListingCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';
import { useSandbox } from '../../src/utils/sandboxContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useUserLocation } from '../../src/context/LocationContext';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 12;
const MAX_CONTENT_WIDTH = 1280;

const CONDITIONS = [
  { value: 'New', label: 'New', icon: 'sparkles' },
  { value: 'Like New', label: 'Like New', icon: 'star' },
  { value: 'Good', label: 'Good', icon: 'thumbs-up' },
  { value: 'Fair', label: 'Fair', icon: 'hand-right' },
  { value: 'For Parts', label: 'For Parts', icon: 'construct' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: 'time-outline' },
  { value: 'oldest', label: 'Oldest First', icon: 'hourglass-outline' },
  { value: 'price_asc', label: 'Price: Low to High', icon: 'trending-up-outline' },
  { value: 'price_desc', label: 'Price: High to Low', icon: 'trending-down-outline' },
  { value: 'distance', label: 'Nearest First', icon: 'location-outline' },
];

const PRICE_RANGES = [
  { label: 'Under €50', min: 0, max: 50 },
  { label: '€50 - €100', min: 50, max: 100 },
  { label: '€100 - €500', min: 100, max: 500 },
  { label: '€500 - €1000', min: 500, max: 1000 },
  { label: 'Over €1000', min: 1000, max: undefined },
];

const POPULAR_LOCATIONS = [
  'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Dresden'
];

export default function SearchScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();
  const dynamicCardWidth = Math.floor((windowWidth - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2);
  
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
  const [negotiableOnly, setNegotiableOnly] = useState(false);
  
  // Modals
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
      // Check if sandbox mode is active and use sandbox-aware API
      const sandboxActive = await sandboxUtils.isActive();
      
      let result;
      if (sandboxActive) {
        result = await sandboxAwareListingsApi.getAll({
          search: query || undefined,
          category: selectedCategory || undefined,
          limit: 50,
        });
        // Normalize response structure
        result = { listings: result.listings || result };
      } else {
        result = await listingsApi.getAll({
          search: query || undefined,
          category: selectedCategory || undefined,
          min_price: minPrice ? parseFloat(minPrice) : undefined,
          max_price: maxPrice ? parseFloat(maxPrice) : undefined,
          condition: condition || undefined,
          location: location || undefined,
          sort: sortBy,
          limit: 50,
        });
      }
      
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
    setNegotiableOnly(false);
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
    negotiableOnly,
  ].filter(Boolean).length;

  const applyPriceRange = (range: typeof PRICE_RANGES[0]) => {
    setMinPrice(range.min.toString());
    setMaxPrice(range.max ? range.max.toString() : '');
  };

  // Grid rendering with rows
  const renderGrid = () => {
    if (listings.length === 0) return null;
    
    const rows = [];
    for (let i = 0; i < listings.length; i += 2) {
      rows.push(listings.slice(i, i + 2));
    }
    
    return (
      <View>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((item) => (
              <View key={item.id} style={[styles.cardWrapper, { width: dynamicCardWidth }]}>
                <ListingCard
                  listing={item}
                  onPress={() => router.push(`/listing/${item.id}`)}
                  onFavorite={() => toggleFavorite(item.id)}
                  isFavorited={favorites.has(item.id)}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Search</Text>
          {activeFiltersCount > 0 && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Search Input */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="What are you looking for?"
              placeholderTextColor="#999"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={search} activeOpacity={0.8}>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Quick Filters Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.quickFiltersContent}
          style={styles.quickFiltersScroll}
        >
          {/* Filter Button */}
          <TouchableOpacity
            style={[styles.filterChip, activeFiltersCount > 0 && styles.filterChipActive]}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={activeFiltersCount > 0 ? '#fff' : '#333'}
            />
            <Text style={[styles.filterChipText, activeFiltersCount > 0 && styles.filterChipTextActive]}>
              Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </TouchableOpacity>

          {/* Sort Button */}
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setShowSort(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-vertical" size={16} color="#333" />
            <Text style={styles.filterChipText} numberOfLines={1}>
              {SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sort'}
            </Text>
          </TouchableOpacity>

          {/* Quick Category Chips */}
          {categories.slice(0, 4).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, selectedCategory === cat.id && styles.filterChipActive]}
              onPress={() => {
                setSelectedCategory(selectedCategory === cat.id ? null : cat.id);
                if (hasSearched) search();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, selectedCategory === cat.id && styles.filterChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.resultsContainer}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {hasSearched && listings.length > 0 && (
            <Text style={styles.resultsCount}>{listings.length} results found</Text>
          )}
          
          {renderGrid()}
          
          {listings.length === 0 && (
            hasSearched ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptyDescription}>
                  Try different keywords or adjust your filters
                </Text>
                <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
                  <Text style={styles.emptyButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="search" size={48} color="#2E7D32" />
                </View>
                <Text style={styles.emptyTitle}>Find what you need</Text>
                <Text style={styles.emptyDescription}>
                  Search for listings by name, category, or location
                </Text>
                
                {/* Popular Searches */}
                <View style={styles.popularSection}>
                  <Text style={styles.popularTitle}>Popular Categories</Text>
                  <View style={styles.popularTags}>
                    {categories.slice(0, 6).map((cat) => (
                      <TouchableOpacity 
                        key={cat.id} 
                        style={styles.popularTag}
                        onPress={() => {
                          setSelectedCategory(cat.id);
                          search();
                        }}
                      >
                        <Text style={styles.popularTagText}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )
          )}
        </ScrollView>
      )}

      {/* Filters Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Category Section */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Category</Text>
                  <View style={styles.categoryGrid}>
                    <TouchableOpacity
                      style={[styles.categoryChip, !selectedCategory && styles.categoryChipSelected]}
                      onPress={() => setSelectedCategory(null)}
                    >
                      <Ionicons name="apps" size={18} color={!selectedCategory ? '#fff' : '#666'} />
                      <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextSelected]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipSelected]}
                        onPress={() => setSelectedCategory(cat.id)}
                      >
                        <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextSelected]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Price Range Section */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Price Range</Text>
                  <View style={styles.priceInputRow}>
                    <View style={styles.priceInputWrapper}>
                      <Text style={styles.priceLabel}>Min (€)</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="0"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={minPrice}
                        onChangeText={setMinPrice}
                      />
                    </View>
                    <View style={styles.priceDivider}>
                      <Text style={styles.priceDividerText}>—</Text>
                    </View>
                    <View style={styles.priceInputWrapper}>
                      <Text style={styles.priceLabel}>Max (€)</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="Any"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={maxPrice}
                        onChangeText={setMaxPrice}
                      />
                    </View>
                  </View>
                  
                  {/* Quick Price Ranges */}
                  <View style={styles.priceRangeChips}>
                    {PRICE_RANGES.map((range, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.priceRangeChip,
                          minPrice === range.min.toString() && styles.priceRangeChipSelected
                        ]}
                        onPress={() => applyPriceRange(range)}
                      >
                        <Text style={[
                          styles.priceRangeChipText,
                          minPrice === range.min.toString() && styles.priceRangeChipTextSelected
                        ]}>
                          {range.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Condition Section */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Condition</Text>
                  <View style={styles.conditionGrid}>
                    {CONDITIONS.map((c) => (
                      <TouchableOpacity
                        key={c.value}
                        style={[styles.conditionChip, condition === c.value && styles.conditionChipSelected]}
                        onPress={() => setCondition(condition === c.value ? null : c.value)}
                      >
                        <Ionicons 
                          name={c.icon as any} 
                          size={16} 
                          color={condition === c.value ? '#fff' : '#666'} 
                        />
                        <Text style={[styles.conditionChipText, condition === c.value && styles.conditionChipTextSelected]}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Location Section */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Location</Text>
                  <View style={styles.locationInputWrapper}>
                    <Ionicons name="location-outline" size={20} color="#666" />
                    <TextInput
                      style={styles.locationInput}
                      placeholder="Enter city or area"
                      placeholderTextColor="#999"
                      value={location}
                      onChangeText={setLocation}
                    />
                    {location.length > 0 && (
                      <TouchableOpacity onPress={() => setLocation('')}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Popular Locations */}
                  <View style={styles.popularLocations}>
                    {POPULAR_LOCATIONS.map((loc) => (
                      <TouchableOpacity
                        key={loc}
                        style={[styles.locationChip, location === loc && styles.locationChipSelected]}
                        onPress={() => setLocation(location === loc ? '' : loc)}
                      >
                        <Text style={[styles.locationChipText, location === loc && styles.locationChipTextSelected]}>
                          {loc}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Additional Options */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Additional Options</Text>
                  <TouchableOpacity 
                    style={styles.toggleOption}
                    onPress={() => setNegotiableOnly(!negotiableOnly)}
                  >
                    <View style={styles.toggleOptionLeft}>
                      <Ionicons name="pricetag-outline" size={20} color="#333" />
                      <Text style={styles.toggleOptionText}>Negotiable price only</Text>
                    </View>
                    <View style={[styles.toggleSwitch, negotiableOnly && styles.toggleSwitchActive]}>
                      <View style={[styles.toggleKnob, negotiableOnly && styles.toggleKnobActive]} />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
              </ScrollView>

              {/* Modal Footer */}
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
                  <Text style={styles.applyButtonText}>Show Results</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSort} animationType="fade" transparent>
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
                style={[styles.sortOption, sortBy === option.value && styles.sortOptionSelected]}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSort(false);
                  if (hasSearched) search();
                }}
              >
                <View style={styles.sortOptionLeft}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={20} 
                    color={sortBy === option.value ? '#2E7D32' : '#666'} 
                  />
                  <Text style={[styles.sortOptionText, sortBy === option.value && styles.sortOptionTextSelected]}>
                    {option.label}
                  </Text>
                </View>
                {sortBy === option.value && (
                  <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
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
    backgroundColor: '#F5F5F5',
  },
  
  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  clearAllBtn: {
    padding: 8,
  },
  clearAllText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  
  // Search Row
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Quick Filters
  quickFiltersScroll: {
    marginHorizontal: -16,
  },
  quickFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  
  // Results
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    paddingBottom: 100,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardWrapper: {
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Popular Section
  popularSection: {
    marginTop: 32,
    width: '100%',
  },
  popularTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  popularTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  popularTagText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 500,
  },
  
  // Filter Sections
  filterSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  
  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#2E7D32',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  
  // Price Input
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  priceInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
  },
  priceDivider: {
    paddingTop: 18,
  },
  priceDividerText: {
    color: '#999',
    fontSize: 16,
  },
  priceRangeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  priceRangeChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  priceRangeChipSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  priceRangeChipText: {
    fontSize: 12,
    color: '#666',
  },
  priceRangeChipTextSelected: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  
  // Condition
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  conditionChipSelected: {
    backgroundColor: '#2E7D32',
  },
  conditionChipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  conditionChipTextSelected: {
    color: '#fff',
  },
  
  // Location
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  locationInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
  },
  popularLocations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  locationChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  locationChipSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  locationChipText: {
    fontSize: 12,
    color: '#666',
  },
  locationChipTextSelected: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  
  // Toggle Option
  toggleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
  },
  toggleOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleOptionText: {
    fontSize: 15,
    color: '#333',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#2E7D32',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
  
  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    backgroundColor: '#fff',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Sort Modal
  sortOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sortModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    padding: 20,
  },
  sortTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sortOptionSelected: {
    backgroundColor: '#F8FFF8',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortOptionText: {
    fontSize: 15,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },
});
