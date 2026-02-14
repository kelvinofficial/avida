import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Image,
  ScrollView,
  useWindowDimensions,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  Switch,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Storage } from '../../src/utils/storage';
import { theme } from '../../src/utils/theme';
import { categoriesApi, locationsApi } from '../../src/utils/api';
import { Listing, Category } from '../../src/types';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { useSandbox } from '../../src/utils/sandboxContext';
import { formatDistanceToNow } from 'date-fns';
import { getSubcategories, SubcategoryConfig, getMainCategory } from '../../src/config/subcategories';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useHomeData } from '../../src/hooks/useHomeData';
import { ResponsiveLayout, Footer } from '../../src/components/layout';
import { FeedBanner, HeaderBanner } from '../../src/components/BannerSlot';
import { LocationPicker, LocationData } from '../../src/components/LocationPicker';
import { ImageWithSkeleton } from '../../src/components/common';
import { 
  ListingCard,
  FeaturedSellersSection,
  SubcategoryModal,
  MobileHeader,
  HomeDesktopHeader,
} from '../../src/components/home';
import type { FeaturedSeller, FeaturedListing } from '../../src/components/home';
import { 
  styles, 
  HORIZONTAL_PADDING, 
} from '../../src/components/home/homeStyles';

const { width } = Dimensions.get('window');

// Storage key for recently viewed subcategories
const RECENT_SUBCATEGORIES_KEY = '@avida_recent_subcategories';

// ============ LAYOUT CONSTANTS - Material 3 ============
const COLUMN_GAP = 12;

// Category icon constants - CIRCULAR DESIGN
const CATEGORY_ICON_SIZE = 48;
const CATEGORY_ICON_RADIUS = 24; // Full circle
const CATEGORY_INNER_ICON = 22;
const CATEGORY_GAP = 4;

// ============ CATEGORIES DATA - Match backend DEFAULT_CATEGORIES ============
const FULL_CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles', icon: 'car-outline' },
  { id: 'properties', name: 'Properties', icon: 'business-outline' },
  { id: 'electronics', name: 'Electronics', icon: 'laptop-outline' },
  { id: 'phones_tablets', name: 'Phones & Tablets', icon: 'phone-portrait-outline' },
  { id: 'home_furniture', name: 'Home & Furniture', icon: 'home-outline' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty', icon: 'shirt-outline' },
  { id: 'jobs_services', name: 'Jobs & Services', icon: 'briefcase-outline' },
  { id: 'kids_baby', name: 'Kids & Baby', icon: 'people-outline' },
  { id: 'sports_hobbies', name: 'Sports & Hobbies', icon: 'football-outline' },
  { id: 'pets', name: 'Pets', icon: 'paw-outline' },
  { id: 'agriculture', name: 'Agriculture & Food', icon: 'leaf-outline' },
  { id: 'commercial_equipment', name: 'Commercial Equipment', icon: 'construct-outline' },
  { id: 'repair_construction', name: 'Repair & Construction', icon: 'hammer-outline' },
  { id: 'friendship_dating', name: 'Friendship & Dating', icon: 'heart-outline' },
];

// ============ MAIN HOME SCREEN ============
export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isSandboxMode } = useSandbox();
  const { width: windowWidth } = useWindowDimensions();
  
  // Global location store - used by DesktopHeader
  const locationStore = useLocationStore();
  
  // ============ USE HOME DATA HOOK ============
  // Centralized data fetching and state management
  const {
    // Listings data
    listings,
    categories,
    loading,
    initialLoadDone,
    refreshing,
    hasMore,
    
    // Featured data
    featuredSellers,
    featuredListings,
    loadingFeatured,
    
    // User data
    favorites,
    notificationCount,
    creditBalance,
    unviewedBadgeCount,
    
    // Location state
    selectedCity,
    currentCity,
    selectedLocationFilter,
    includeNearbyCities,
    searchRadius,
    expandedSearch,
    expandedSearchMessage,
    
    // Search state
    homeSearchQuery,
    showSearchSuggestions,
    searchSuggestions,
    
    // Category state
    selectedCategory,
    
    // Actions
    fetchData,
    handleRefresh: onRefresh,
    loadMore,
    toggleFavorite,
    setSelectedCategory,
    setHomeSearchQuery,
    setShowSearchSuggestions,
    handleSearchInputChange,
    handleSuggestionClick: hookSuggestionClick,
    clearRecentSearches,
    setSelectedLocationFilter,
    setCurrentCity,
    saveSelectedCity,
    handleClearLocationFilter,
    
    // Additional setters for desktop location dropdown
    setPage,
    setHasMore,
    setSelectedCity,
    setExpandedSearch,
    setExpandedSearchMessage,
  } = useHomeData();
  
  // ============ UI-SPECIFIC STATE (not in hook) ============
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  
  // Subcategory Modal State
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [selectedCategoryForSubcats, setSelectedCategoryForSubcats] = useState<{
    id: string;
    name: string;
    icon: string;
    subcategories: SubcategoryConfig[];
  } | null>(null);
  const [subcategoryCounts, setSubcategoryCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [recentSubcategories, setRecentSubcategories] = useState<Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    subcategoryId: string;
    subcategoryName: string;
    timestamp: number;
  }>>([]);
  
  // Desktop Location Dropdown State
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationDropdownStep, setLocationDropdownStep] = useState<'countries' | 'regions'>('countries');
  const [locationCountries, setLocationCountries] = useState<Array<{ code: string; name: string; flag: string }>>([]);
  const [locationRegions, setLocationRegions] = useState<Array<{ country_code: string; region_code: string; name: string; lat?: number; lng?: number }>>([]);
  const [selectedCountryForDropdown, setSelectedCountryForDropdown] = useState<{ code: string; name: string; flag: string } | null>(null);
  const [locationDropdownLoading, setLocationDropdownLoading] = useState(false);

  // Sync with global location store for DesktopHeader
  useEffect(() => {
    // When global location changes (from DesktopHeader), sync local state
    if (locationStore.selectedLocationFilter) {
      setSelectedLocationFilter(locationStore.selectedLocationFilter);
      setCurrentCity(locationStore.currentCity);
    } else if (locationStore.currentCity === 'All Locations') {
      setSelectedLocationFilter(null);
      setCurrentCity('All Locations');
    }
  }, [locationStore.selectedLocationFilter, locationStore.currentCity]);

  // Sync local location changes to global store
  useEffect(() => {
    if (selectedLocationFilter) {
      locationStore.setLocation(currentCity, selectedLocationFilter);
    }
  }, [selectedLocationFilter, currentCity, locationStore]);

  // Load recent subcategories from storage
  const loadRecentSubcategories = useCallback(async () => {
    try {
      const stored = await Storage.getItem(RECENT_SUBCATEGORIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Keep only last 10 and those from last 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recent = parsed
          .filter((item: any) => item.timestamp > thirtyDaysAgo)
          .slice(0, 10);
        setRecentSubcategories(recent);
      }
    } catch (error) {
      console.log('Error loading recent subcategories:', error);
    }
  }, []);

  // Save a subcategory to recent history
  const saveRecentSubcategory = useCallback(async (
    categoryId: string,
    categoryName: string,
    categoryIcon: string,
    subcategoryId: string,
    subcategoryName: string
  ) => {
    try {
      const newItem = {
        categoryId,
        categoryName,
        categoryIcon,
        subcategoryId,
        subcategoryName,
        timestamp: Date.now(),
      };
      
      // Remove duplicates and add new item at the start
      const updated = [
        newItem,
        ...recentSubcategories.filter(
          item => !(item.categoryId === categoryId && item.subcategoryId === subcategoryId)
        )
      ].slice(0, 10);
      
      setRecentSubcategories(updated);
      await Storage.setItem(RECENT_SUBCATEGORIES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.log('Error saving recent subcategory:', error);
    }
  }, [recentSubcategories]);

  // Load recent subcategories on mount
  useEffect(() => {
    loadRecentSubcategories();
  }, []);

  // Popular cities list (kept for UI)
  const POPULAR_CITIES = [
    { name: 'All Locations', icon: 'globe-outline' },
    { name: 'Berlin', icon: 'business-outline' },
    { name: 'Munich', icon: 'business-outline' },
    { name: 'Hamburg', icon: 'business-outline' },
    { name: 'Frankfurt', icon: 'business-outline' },
    { name: 'Cologne', icon: 'business-outline' },
    { name: 'Stuttgart', icon: 'business-outline' },
    { name: 'Düsseldorf', icon: 'business-outline' },
    { name: 'Dresden', icon: 'business-outline' },
    { name: 'Leipzig', icon: 'business-outline' },
    { name: 'Hannover', icon: 'business-outline' },
  ];

  const filteredCities = POPULAR_CITIES.filter(city => 
    city.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // Handle suggestion click with navigation (wraps hook function)
  const handleSuggestionClick = (query: string) => {
    hookSuggestionClick(query);
    // Navigate to search
    const searchUrl = `/search?q=${encodeURIComponent(query.trim())}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = searchUrl;
    } else {
      router.push(searchUrl);
    }
  };

  // Handle search submit from homepage
  const handleSearchSubmit = () => {
    console.log('[Homepage] handleSearchSubmit called, query:', homeSearchQuery);
    if (homeSearchQuery.trim()) {
      const searchUrl = `/search?q=${encodeURIComponent(homeSearchQuery.trim())}`;
      console.log('[Homepage] Navigating to:', searchUrl);
      // On web, use full page navigation to ensure search page mounts fresh
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = searchUrl;
      } else {
        router.push(searchUrl);
      }
      setHomeSearchQuery(''); // Clear after navigation
    } else {
      console.log('[Homepage] Navigating to /search');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/search';
      } else {
        router.push('/search');
      }
    }
  };

  const handleCategoryPress = async (categoryId: string) => {
    // On desktop/tablet, navigate directly to category page
    if (isDesktop || isTablet) {
      router.push(`/category/${categoryId}`);
      return;
    }
    
    // On mobile, show subcategory selection modal
    const category = FULL_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    const subcategories = getSubcategories(categoryId);
    
    // Show subcategory selection modal
    setSelectedCategoryForSubcats({
      id: categoryId,
      name: category.name,
      icon: category.icon,
      subcategories: subcategories,
    });
    setShowSubcategoryModal(true);
    
    // Fetch subcategory counts in background
    setLoadingCounts(true);
    try {
      const counts = await categoriesApi.getSubcategoryCounts(categoryId);
      setSubcategoryCounts(counts);
    } catch (error) {
      console.log('Error fetching subcategory counts:', error);
      setSubcategoryCounts({});
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleSubcategorySelect = async (categoryId: string, subcategoryId?: string) => {
    setShowSubcategoryModal(false);
    
    // Save to recent if a specific subcategory is selected
    if (subcategoryId && selectedCategoryForSubcats) {
      const subcategory = selectedCategoryForSubcats.subcategories.find(s => s.id === subcategoryId);
      if (subcategory) {
        await saveRecentSubcategory(
          categoryId,
          selectedCategoryForSubcats.name,
          selectedCategoryForSubcats.icon,
          subcategoryId,
          subcategory.name
        );
      }
    }
    
    if (subcategoryId) {
      // Navigate to category page with subcategory pre-selected
      router.push(`/category/${categoryId}?subcategory=${subcategoryId}`);
    } else {
      // View all in category
      router.push(`/category/${categoryId}`);
    }
  };

  const handleRecentSubcategoryPress = (item: typeof recentSubcategories[0]) => {
    setShowSubcategoryModal(false);
    router.push(`/category/${item.categoryId}?subcategory=${item.subcategoryId}`);
  };

  const handleCategoryLongPress = (categoryId: string) => {
    // Long press to filter in place (quick filter)
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const handleLocationSelect = async (location: LocationData) => {
    setSelectedLocationFilter(location);
    // Use region_name for display since we're now using region-level selection
    const displayName = location.region_name || location.city_name || location.location_text || 'Selected Location';
    setCurrentCity(displayName);
    setShowLocationModal(false);
    setLocationSearch('');
    
    // Save location data - now supports both city-level and region-level selection
    const locationData = {
      country_code: location.country_code || '',
      country_name: '', 
      region_code: location.region_code || '',
      region_name: location.region_name || '',
      district_code: location.district_code,
      district_name: location.district_name,
      city_code: location.city_code,
      city_name: location.region_name || location.city_name || '', // Use region_name as fallback
      lat: location.lat,
      lng: location.lng,
      location_text: location.location_text,
    };
    await saveSelectedCity(locationData);
  };

  // Desktop Location Dropdown Handlers
  const handleOpenLocationDropdown = async () => {
    setShowLocationDropdown(true);
    setLocationDropdownStep('countries');
    setSelectedCountryForDropdown(null);
    
    // Fetch countries if not loaded
    if (locationCountries.length === 0) {
      setLocationDropdownLoading(true);
      try {
        const response = await locationsApi.getCountries();
        setLocationCountries(response || []);
      } catch (error) {
        console.error('Failed to fetch countries:', error);
      } finally {
        setLocationDropdownLoading(false);
      }
    }
  };

  const handleSelectCountry = async (country: { code: string; name: string; flag: string }) => {
    setSelectedCountryForDropdown(country);
    setLocationDropdownStep('regions');
    setLocationDropdownLoading(true);
    
    try {
      const response = await locationsApi.getRegions(country.code);
      setLocationRegions(response || []);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    } finally {
      setLocationDropdownLoading(false);
    }
  };

  const handleSelectRegion = async (region: { country_code: string; region_code: string; name: string }) => {
    // Set the location filter
    setSelectedLocationFilter({
      country_code: region.country_code,
      region_code: region.region_code,
      location_text: `${region.name}, ${selectedCountryForDropdown?.name || ''}`,
    });
    
    // Update display text
    setCurrentCity(region.name);
    
    // Close dropdown
    setShowLocationDropdown(false);
    setLocationDropdownStep('countries');
    setSelectedCountryForDropdown(null);
    
    // Trigger data refresh with new location
    setPage(1);
    setHasMore(true);
  };

  const handleSelectAllInCountry = () => {
    if (!selectedCountryForDropdown) return;
    
    // Set country-level filter
    setSelectedLocationFilter({
      country_code: selectedCountryForDropdown.code,
      location_text: selectedCountryForDropdown.name,
    });
    
    // Update display text
    setCurrentCity(selectedCountryForDropdown.name);
    
    // Close dropdown
    setShowLocationDropdown(false);
    setLocationDropdownStep('countries');
    setSelectedCountryForDropdown(null);
    
    // Trigger data refresh
    setPage(1);
    setHasMore(true);
  };

  const handleBackToCountries = () => {
    setLocationDropdownStep('countries');
    setSelectedCountryForDropdown(null);
    setLocationRegions([]);
  };

  // ============ MOBILE HEADER PROPS ============
  const mobileHeaderProps = {
    notificationCount,
    currentCity,
    onLocationPress: () => setShowLocationModal(true),
    homeSearchQuery,
    showSearchSuggestions,
    searchSuggestions,
    onSearchInputChange: handleSearchInputChange,
    onSearchFocus: () => setShowSearchSuggestions(true),
    onSearchBlur: () => setTimeout(() => setShowSearchSuggestions(false), 200),
    onSearchSubmit: handleSearchSubmit,
    onSuggestionClick: handleSuggestionClick,
    onClearSearch: () => { 
      setHomeSearchQuery(''); 
      // Clear autocomplete when search is cleared
    },
    onClearRecentSearches: clearRecentSearches,
    selectedCategory,
    onCategoryPress: handleCategoryPress,
    onClearCategory: () => setSelectedCategory(null),
    featuredListings,
    featuredSellers,
    loadingFeatured,
    expandedSearch,
  };

  // Calculate dynamic columns based on screen size
  const { isMobile, isTablet, isDesktop, width: screenWidth } = useResponsive();
  
  // Max content width for desktop
  const MAX_WIDTH = 1280;
  const effectiveWidth = isDesktop ? Math.min(screenWidth, MAX_WIDTH) : screenWidth;
  
  // Calculate columns: 2 for mobile, 3 for tablet, 4-5 for desktop
  const getColumns = () => {
    if (isMobile) return 2;
    if (isTablet) return 3;
    return 4;
  };
  
  const columns = getColumns();
  const gridPadding = isDesktop ? 24 : isTablet ? 20 : HORIZONTAL_PADDING;
  const gridGap = isDesktop ? 20 : isTablet ? 16 : COLUMN_GAP;
  const dynamicCardWidth = Math.floor((effectiveWidth - gridPadding * 2 - gridGap * (columns - 1)) / columns);

  // Render listings as grid manually - responsive columns with banner injection
  const renderGrid = () => {
    // Don't show empty state until initial load is complete
    if (!initialLoadDone) {
      return null;
    }
    
    // Determine which listings to display
    const displayedListings = listings;
    
    // Show empty state only when initial load is done and no listings
    if (displayedListings.length === 0) {
      return <EmptyState icon="pricetags-outline" title={expandedSearch ? "Showing nearby listings" : "No listings yet"} description={expandedSearch ? "Try adjusting your location or search settings." : "Be the first to post an ad in your area!"} />;
    }
    
    // Create rows based on column count
    const rows: (Listing[] | { type: 'banner'; position: number })[] = [];
    const BANNER_INTERVAL = 5; // Show banner after every 5 rows (10-20 listings depending on columns)
    
    let rowCount = 0;
    for (let i = 0; i < displayedListings.length; i += columns) {
      rows.push(displayedListings.slice(i, i + columns));
      rowCount++;
      
      // Inject banner after every BANNER_INTERVAL rows
      if (rowCount % BANNER_INTERVAL === 0 && i + columns < displayedListings.length) {
        rows.push({ type: 'banner', position: rowCount * columns });
      }
    }
    
    return (
      <View style={[
        (isDesktop || isTablet) && { paddingHorizontal: gridPadding, maxWidth: MAX_WIDTH, alignSelf: 'center', width: '100%' }
      ]}>
        {rows.map((row, rowIndex) => {
          // Check if this is a banner row
          if ('type' in row && row.type === 'banner') {
            return (
              <FeedBanner 
                key={`banner-${row.position}`}
                position={row.position}
                category={selectedCategory || undefined}
              />
            );
          }
          
          // Regular listing row
          return (
            <View key={rowIndex} style={[styles.gridRow, { gap: gridGap }]}>
              {(row as Listing[]).map((item) => (
                <View key={item.id} style={[styles.cardWrapper, { width: dynamicCardWidth }]}>
                  <ListingCard
                    listing={item}
                    onPress={() => router.push(`/listing/${item.id}`)}
                    onFavorite={() => toggleFavorite(item.id)}
                    isFavorited={favorites.has(item.id)}
                    userLocation={selectedCity?.lat && selectedCity?.lng && !isNaN(selectedCity.lat) && !isNaN(selectedCity.lng) ? { lat: selectedCity.lat, lng: selectedCity.lng } : null}
                  />
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  // ============ HOME DESKTOP HEADER PROPS ============
  const homeDesktopHeaderProps = {
    selectedCategory,
    onCategorySelect: setSelectedCategory,
    onCategoryPress: handleCategoryPress,
    listings,
  };

  const mainContent = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
      onScroll={({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
        if (isCloseToBottom && !loading && hasMore) {
          loadMore();
        }
      }}
      scrollEventThrottle={400}
      style={isDesktop || isTablet ? { flex: 1 } : undefined}
    >
      {/* Content wrapper with light background */}
      <View style={(isDesktop || isTablet) ? { backgroundColor: '#F5F5F5' } : undefined}>
        {isDesktop || isTablet ? (
          <HomeDesktopHeader {...homeDesktopHeaderProps} />
        ) : <MobileHeader {...mobileHeaderProps} />}
        <View style={[styles.listContent, (isDesktop || isTablet) && { paddingHorizontal: 0, alignItems: 'center' }]}>
          {renderGrid()}
        </View>
      </View>
      {/* Footer for Desktop & Tablet */}
      {(isDesktop || isTablet) && <Footer isTablet={isTablet && !isDesktop} />}
    </ScrollView>
  );

  return (
    <ResponsiveLayout showSidebar={false}>
      <SafeAreaView style={styles.container} edges={isMobile ? ['top'] : []}>
        {mainContent}

        {/* Location Picker Modal - Using New Hierarchical Location System */}
        <Modal
          visible={showLocationModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLocationModal(false)}
        >
          <View style={styles.locationPickerModal}>
            <View style={styles.locationPickerHeader}>
              <Text style={styles.locationPickerTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {/* Current selection info */}
            {selectedLocationFilter && (
              <View style={styles.currentLocationBanner}>
                <Ionicons name="location" size={20} color="#2E7D32" />
                <Text style={styles.currentLocationText}>
                  {selectedLocationFilter.location_text || selectedLocationFilter.city_name}
                </Text>
                <TouchableOpacity onPress={handleClearLocationFilter} style={styles.clearFilterBtn}>
                  <Text style={styles.clearFilterBtnText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.locationPickerContent}>
              <Text style={styles.locationPickerHint}>
                Select a location to filter listings. Choose a country, then narrow down to region, district, and city.
              </Text>
              
              <LocationPicker
                value={selectedLocationFilter}
                onChange={(location) => {
                  handleLocationSelect(location);
                  setShowLocationModal(false);
                }}
                placeholder="Browse locations..."
              />
              
              {/* All Locations option */}
              <TouchableOpacity 
                style={[styles.allLocationsBtn, !selectedLocationFilter && styles.allLocationsBtnActive]}
                onPress={() => {
                  handleClearLocationFilter();
                  setShowLocationModal(false);
                }}
              >
                <Ionicons name="globe-outline" size={20} color={!selectedLocationFilter ? "#2E7D32" : "#666"} />
                <Text style={[styles.allLocationsBtnText, !selectedLocationFilter && styles.allLocationsBtnTextActive]}>
                  All Locations
                </Text>
                {!selectedLocationFilter && (
                  <Ionicons name="checkmark" size={20} color="#2E7D32" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      {/* Subcategory Selection Modal */}
      <SubcategoryModal
        visible={showSubcategoryModal}
        onClose={() => setShowSubcategoryModal(false)}
        category={selectedCategoryForSubcats}
        subcategoryCounts={subcategoryCounts}
        loadingCounts={loadingCounts}
        recentSubcategories={recentSubcategories}
        onSelectSubcategory={handleSubcategorySelect}
        onSelectRecentSubcategory={handleRecentSubcategoryPress}
      />
      </SafeAreaView>
    </ResponsiveLayout>
  );
}
