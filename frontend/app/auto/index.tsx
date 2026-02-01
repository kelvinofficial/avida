import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../src/utils/theme';
import { AutoFilters, AutoListing } from '../../src/types/auto';
import { CAR_BRANDS, EXPLORE_CARDS, CITIES } from '../../src/data/autoData';
import { api } from '../../src/utils/api';

// Components
import { SegmentedTabs } from '../../src/components/auto/SegmentedTabs';
import { SmartSearchBar } from '../../src/components/auto/SmartSearchBar';
import { LocationControls } from '../../src/components/auto/LocationControls';
import { BrandGrid } from '../../src/components/auto/BrandGrid';
import { FilterTabs } from '../../src/components/auto/FilterTabs';
import { ExploreCards } from '../../src/components/auto/ExploreCards';
import { AutoListingCard } from '../../src/components/auto/AutoListingCard';
import { HorizontalListingCard } from '../../src/components/auto/HorizontalListingCard';
import { AdvancedFiltersSheet } from '../../src/components/auto/AdvancedFiltersSheet';
import { NativeAdCard } from '../../src/components/auto/NativeAdCard';
import { RecommendationSection } from '../../src/components/auto/RecommendationSection';
import { CityPickerModal } from '../../src/components/auto/CityPickerModal';
import { PriceRangeModal } from '../../src/components/auto/PriceRangeModal';
import { SortModal } from '../../src/components/auto/SortModal';
import { MakeModelModal } from '../../src/components/auto/MakeModelModal';

const { width } = Dimensions.get('window');

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'motors', label: 'Motors', icon: 'car' },
  { id: 'property', label: 'Property', icon: 'home' },
];

const FILTER_TABS = [
  { id: 'make', label: 'Make' },
  { id: 'model', label: 'Model' },
  { id: 'city', label: 'City' },
  { id: 'price', label: 'Price' },
];

// Analytics tracking helper
const trackEvent = (eventName: string, data?: any) => {
  console.log(`[Analytics] ${eventName}:`, data);
};

export default function AutoCategoryScreen() {
  const router = useRouter();
  
  // State - now fetching from real backend
  const [activeTab, setActiveTab] = useState('motors');
  const [allListings, setAllListings] = useState<AutoListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<AutoFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Modal states
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showPriceRange, setShowPriceRange] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showMakeModelModal, setShowMakeModelModal] = useState(false);
  const [makeModelMode, setMakeModelMode] = useState<'make' | 'model'>('make');
  
  // Filter states
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [radius, setRadius] = useState(50);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Search history
  const [recentSearches, setRecentSearches] = useState(['BMW 3 Series', 'Mercedes C-Class', 'Audi A4']);
  const [popularSearches] = useState(['Tesla Model 3', 'VW Golf', 'BMW X5', 'Porsche 911']);

  // Fetch listings from backend API
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query params based on current filters
      const params: Record<string, any> = {
        limit: 50,
        sort: sortBy,
      };
      
      if (selectedBrand) {
        const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || selectedBrand;
        params.make = brandName;
      }
      if (selectedModel) params.model = selectedModel;
      if (selectedCity) params.city = selectedCity;
      if (filters.fuelType) params.fuel_type = filters.fuelType;
      if (filters.transmission) params.transmission = filters.transmission;
      if (filters.bodyType) params.body_type = filters.bodyType;
      if (filters.condition) params.condition = filters.condition;
      if (filters.priceMin) params.price_min = filters.priceMin;
      if (filters.priceMax) params.price_max = filters.priceMax;
      if (filters.mileageMax) params.mileage_max = filters.mileageMax;
      if (filters.verifiedSeller) params.verified_seller = true;
      
      const response = await api.get('/auto/listings', { params });
      setAllListings(response.data.listings || []);
    } catch (error) {
      console.error('Error fetching auto listings:', error);
      Alert.alert('Error', 'Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortBy, selectedBrand, selectedModel, selectedCity, filters]);

  // Initial fetch and refetch when filters change
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Client-side filtering for search and near-me (backend handles other filters)
  const filteredListings = useMemo(() => {
    let result = [...allListings];
    
    // Client-side search filter (for instant feedback)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((listing) =>
        listing.title.toLowerCase().includes(query) ||
        listing.make.toLowerCase().includes(query) ||
        listing.model.toLowerCase().includes(query) ||
        listing.city.toLowerCase().includes(query)
      );
    }
    
    // Near me filter with radius (client-side for now)
    if (nearMeEnabled) {
      result = result.filter((listing) => (listing.distance || 0) <= radius);
    }
    
    // Sort client-side for immediate response
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'mileage_asc':
        result.sort((a, b) => a.mileage - b.mileage);
        break;
      case 'year_desc':
        result.sort((a, b) => b.year - a.year);
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    
    return result;
  }, [allListings, searchQuery, nearMeEnabled, radius, sortBy]);

  // Derived data
  const featuredListings = useMemo(() => 
    filteredListings.filter((l) => l.featured).slice(0, 6), 
    [filteredListings]
  );
  const verifiedListings = useMemo(() => 
    filteredListings.filter((l) => l.seller?.verified).slice(0, 6), 
    [filteredListings]
  );
  const lowMileageListings = useMemo(() => 
    [...filteredListings].sort((a, b) => a.mileage - b.mileage).slice(0, 6),
    [filteredListings]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    trackEvent('pull_to_refresh');
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    trackEvent('search', { query });
    
    // Add to recent searches
    if (query && !recentSearches.includes(query)) {
      setRecentSearches((prev) => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleBrandSelect = (brandId: string | null) => {
    setSelectedBrand(brandId);
    setSelectedModel(null);
    trackEvent('brand_select', { brandId });
  };

  const handleFilterTabPress = (tabId: string) => {
    trackEvent('filter_tab_press', { tabId });
    
    switch (tabId) {
      case 'make':
        setMakeModelMode('make');
        setShowMakeModelModal(true);
        break;
      case 'model':
        if (selectedBrand) {
          setMakeModelMode('model');
          setShowMakeModelModal(true);
        } else {
          Alert.alert('Select Make First', 'Please select a car make before choosing a model');
        }
        break;
      case 'city':
        setShowCityPicker(true);
        break;
      case 'price':
        setShowPriceRange(true);
        break;
    }
  };

  const handleApplyFilters = (newFilters: AutoFilters) => {
    setFilters(newFilters);
    trackEvent('filters_applied', newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedCity(null);
    setSearchQuery('');
    trackEvent('filters_cleared');
  };

  const toggleFavorite = (listingId: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
        trackEvent('favorite_removed', { listingId });
      } else {
        newSet.add(listingId);
        trackEvent('favorite_added', { listingId });
      }
      return newSet;
    });
  };

  const handleListingPress = (listing: AutoListing) => {
    trackEvent('listing_view', { listingId: listing.id, title: listing.title });
    router.push(`/auto/${listing.id}`);
  };

  const handleChat = (listing: AutoListing) => {
    trackEvent('chat_initiated', { listingId: listing.id });
    Alert.alert('Start Chat', `Chat with ${listing.seller?.name || 'Seller'} about "${listing.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Chat', onPress: () => router.push(`/chat/${listing.id}`) },
    ]);
  };

  const handleCall = (listing: AutoListing) => {
    trackEvent('call_initiated', { listingId: listing.id });
    Alert.alert('Call Seller', `Call ${listing.seller?.name || 'Seller'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL('tel:+4912345678') },
    ]);
  };

  const handleWhatsApp = (listing: AutoListing) => {
    trackEvent('whatsapp_initiated', { listingId: listing.id });
    const message = encodeURIComponent(`Hi, I'm interested in your "${listing.title}" listed for €${listing.price.toLocaleString()}`);
    Linking.openURL(`https://wa.me/4912345678?text=${message}`);
  };

  const handleNearMeToggle = () => {
    if (!nearMeEnabled) {
      // Simulate GPS detection
      Alert.alert(
        'Enable Location',
        'Allow LocalMarket to access your location to find cars near you?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Allow',
            onPress: () => {
              setNearMeEnabled(true);
              trackEvent('near_me_enabled');
              Alert.alert('Location Detected', 'Showing cars within 50km of Berlin');
            },
          },
        ]
      );
    } else {
      setNearMeEnabled(false);
      trackEvent('near_me_disabled');
    }
  };

  const handleExploreCardPress = (card: typeof EXPLORE_CARDS[0]) => {
    trackEvent('explore_card_press', { cardId: card.id, title: card.title });
    Alert.alert(card.title, card.subtitle + '\n\nThis feature is coming soon!');
  };

  const handleBrandLongPress = (brandId: string) => {
    const brand = CAR_BRANDS.find((b) => b.id === brandId);
    Alert.alert(
      `Follow ${brand?.name}`,
      'Get notified about new listings from this brand?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Follow',
          onPress: () => {
            trackEvent('brand_followed', { brandId });
            Alert.alert('Following!', `You'll get notifications for new ${brand?.name} listings`);
          },
        },
      ]
    );
  };

  const renderListItem = ({ item, index }: { item: AutoListing; index: number }) => {
    const showAd = (index + 1) % 7 === 0;
    
    return (
      <View style={styles.listItemWrapper}>
        <HorizontalListingCard
          listing={item}
          onPress={() => handleListingPress(item)}
          onFavorite={() => toggleFavorite(item.id)}
          onChat={() => handleChat(item)}
          onCall={() => handleCall(item)}
          isFavorited={favorites.has(item.id)}
        />
        {showAd && (
          <NativeAdCard type="listing" />
        )}
      </View>
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedBrand) count++;
    if (selectedModel) count++;
    if (selectedCity) count++;
    if (filters.priceMin || filters.priceMax) count++;
    Object.keys(filters).forEach((key) => {
      if (!['priceMin', 'priceMax'].includes(key) && filters[key as keyof AutoFilters]) {
        count++;
      }
    });
    return count;
  };

  const renderHeader = () => (
    <View>
      {/* Segmented Tabs */}
      <View style={styles.tabsSection}>
        <SegmentedTabs
          tabs={CATEGORY_TABS}
          activeTab={activeTab}
          onTabPress={(tab) => {
            setActiveTab(tab);
            if (tab === 'all') router.push('/');
            if (tab === 'property') router.push('/');
          }}
        />
      </View>

      {/* Smart Search */}
      <View style={styles.searchSection}>
        <SmartSearchBar
          onSearch={handleSearch}
          onVoiceSearch={() => Alert.alert('Voice Search', 'Voice search coming soon!')}
          recentSearches={recentSearches}
          popularSearches={popularSearches}
        />
      </View>

      {/* Location Controls */}
      <LocationControls
        selectedCity={selectedCity}
        nearMeEnabled={nearMeEnabled}
        radius={radius}
        onSelectCity={() => setShowCityPicker(true)}
        onToggleNearMe={handleNearMeToggle}
        onChangeRadius={setRadius}
      />

      {/* Brand Grid */}
      <BrandGrid
        brands={CAR_BRANDS}
        selectedBrand={selectedBrand}
        onSelectBrand={handleBrandSelect}
        onLongPressBrand={handleBrandLongPress}
      />

      {/* Filter Tabs */}
      <FilterTabs
        tabs={FILTER_TABS.map((tab) => ({
          ...tab,
          value: tab.id === 'make' && selectedBrand 
            ? CAR_BRANDS.find(b => b.id === selectedBrand)?.name 
            : tab.id === 'model' && selectedModel 
            ? selectedModel 
            : tab.id === 'city' && selectedCity
            ? selectedCity
            : tab.id === 'price' && (filters.priceMin || filters.priceMax)
            ? `€${filters.priceMin || 0} - ${filters.priceMax ? '€' + filters.priceMax : 'Any'}`
            : undefined,
        }))}
        activeFilters={{ 
          make: selectedBrand, 
          model: selectedModel, 
          city: selectedCity,
          price: filters.priceMin || filters.priceMax ? true : undefined,
          ...filters 
        }}
        onTabPress={handleFilterTabPress}
        onMoreFilters={() => setShowFiltersSheet(true)}
      />

      {/* Explore Cards */}
      <ExploreCards
        cards={EXPLORE_CARDS}
        onPressCard={handleExploreCardPress}
      />

      {/* Promoted Dealers Ad */}
      <NativeAdCard type="sponsored" />

      {/* Recommendation Sections */}
      {featuredListings.length > 0 && (
        <RecommendationSection
          title="Featured Listings"
          icon="star"
          listings={featuredListings}
          onPressListing={handleListingPress}
          onFavorite={toggleFavorite}
          favorites={favorites}
          onPressSeeAll={() => {
            trackEvent('see_all_featured');
            setSortBy('newest');
          }}
        />
      )}

      {verifiedListings.length > 0 && (
        <RecommendationSection
          title="Verified & Inspected"
          icon="shield-checkmark"
          listings={verifiedListings}
          onPressListing={handleListingPress}
          onFavorite={toggleFavorite}
          favorites={favorites}
          onPressSeeAll={() => {
            trackEvent('see_all_verified');
            setFilters((prev) => ({ ...prev, verifiedSeller: true }));
          }}
        />
      )}

      {lowMileageListings.length > 0 && (
        <RecommendationSection
          title="Low Mileage Cars"
          icon="speedometer"
          listings={lowMileageListings}
          onPressListing={handleListingPress}
          onFavorite={toggleFavorite}
          favorites={favorites}
          onPressSeeAll={() => {
            trackEvent('see_all_low_mileage');
            setSortBy('mileage_asc');
          }}
        />
      )}

      {/* Banner Ad */}
      <NativeAdCard type="banner" />

      {/* Section Header with Sort */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          All Listings ({filteredListings.length})
        </Text>
        <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
          <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
          <Text style={styles.sortText}>
            {sortBy === 'newest' ? 'Newest' : 
             sortBy === 'price_asc' ? 'Price ↑' : 
             sortBy === 'price_desc' ? 'Price ↓' : 
             sortBy === 'mileage_asc' ? 'Mileage ↑' :
             sortBy === 'year_desc' ? 'Year' : 'Sort'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters Badge */}
      {getActiveFilterCount() > 0 && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersText}>
            {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} active
          </Text>
          <TouchableOpacity onPress={handleClearFilters}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Motors</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications-outline" size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => Alert.alert('Safety Tips', '• Always meet in public places\n• Verify seller identity\n• Inspect car before payment\n• Use secure payment methods\n• Get a professional inspection')}
          >
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={filteredListings}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color={theme.colors.outline} />
            <Text style={styles.emptyTitle}>No listings found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
          ) : (
            <View style={styles.footerPadding} />
          )
        }
        onEndReachedThreshold={0.5}
      />

      {/* Modals */}
      <AdvancedFiltersSheet
        visible={showFiltersSheet}
        onClose={() => setShowFiltersSheet(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      <CityPickerModal
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        selectedCity={selectedCity}
        onSelectCity={(city) => {
          setSelectedCity(city);
          trackEvent('city_selected', { city });
        }}
      />

      <PriceRangeModal
        visible={showPriceRange}
        onClose={() => setShowPriceRange(false)}
        minPrice={filters.priceMin}
        maxPrice={filters.priceMax}
        onApply={(min, max) => {
          setFilters((prev) => ({ ...prev, priceMin: min, priceMax: max }));
          trackEvent('price_range_applied', { min, max });
        }}
      />

      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        selectedSort={sortBy}
        onSelectSort={(sort) => {
          setSortBy(sort);
          trackEvent('sort_changed', { sort });
        }}
      />

      <MakeModelModal
        visible={showMakeModelModal}
        onClose={() => setShowMakeModelModal(false)}
        mode={makeModelMode}
        selectedMake={selectedBrand}
        selectedModel={selectedModel}
        onSelectMake={(make) => {
          setSelectedBrand(make);
          trackEvent('make_selected', { make });
        }}
        onSelectModel={(model) => {
          setSelectedModel(model);
          trackEvent('model_selected', { model });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  backButton: {
    padding: 4,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    padding: 4,
  },
  tabsSection: {
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.borderRadius.full,
  },
  sortText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primaryContainer,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  activeFiltersText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  listItemWrapper: {
    marginBottom: theme.spacing.xs,
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
  adContainer: {
    marginTop: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.xs,
  },
  clearButton: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  clearButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    paddingVertical: theme.spacing.lg,
  },
  footerPadding: {
    height: theme.spacing.xxl,
  },
});
