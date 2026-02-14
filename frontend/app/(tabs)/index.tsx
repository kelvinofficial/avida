import React, { useEffect, useState } from 'react';
import {
  View,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLocationStore } from '../../src/store/locationStore';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useHomeData } from '../../src/hooks/useHomeData';
import { useSubcategoryModal } from '../../src/hooks/useSubcategoryModal';
import { ResponsiveLayout, Footer } from '../../src/components/layout';
import { LocationData } from '../../src/components/LocationPicker';
import { 
  SubcategoryModal,
  MobileHeader,
  HomeDesktopHeader,
  ListingsGrid,
  LocationModal,
} from '../../src/components/home';
import { 
  styles, 
  HORIZONTAL_PADDING, 
} from '../../src/components/home/homeStyles';

// ============ LAYOUT CONSTANTS - Material 3 ============
const COLUMN_GAP = 12;

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
  
  // Global location store - used by DesktopHeader
  const locationStore = useLocationStore();
  
  // ============ USE SUBCATEGORY MODAL HOOK ============
  const {
    showSubcategoryModal,
    selectedCategoryForSubcats,
    subcategoryCounts,
    loadingCounts,
    recentSubcategories,
    openSubcategoryModal,
    closeSubcategoryModal,
    handleSubcategorySelect: hookSubcategorySelect,
    handleRecentSubcategoryPress: hookRecentSubcategoryPress,
  } = useSubcategoryModal();
  
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
  
  // ============ UI-SPECIFIC STATE (not in hooks) ============
  const [showLocationModal, setShowLocationModal] = useState(false);
  
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
    
    // On mobile, show subcategory selection modal via hook
    await openSubcategoryModal(categoryId);
  };

  const handleSubcategorySelect = async (categoryId: string, subcategoryId?: string) => {
    const path = await hookSubcategorySelect(categoryId, subcategoryId);
    router.push(path);
  };

  const handleRecentSubcategoryPress = (item: any) => {
    const path = hookRecentSubcategoryPress(item);
    router.push(path);
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

  // ============ LISTINGS GRID PROPS ============
  const listingsGridProps = {
    listings,
    initialLoadDone,
    expandedSearch,
    selectedCategory,
    favorites,
    toggleFavorite,
    selectedCity,
    isDesktop,
    isTablet,
    columns,
    gridPadding,
    gridGap,
    cardWidth: dynamicCardWidth,
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
          <ListingsGrid {...listingsGridProps} />
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

        {/* Location Picker Modal */}
        <LocationModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          selectedLocationFilter={selectedLocationFilter}
          onLocationSelect={handleLocationSelect}
          onClearLocationFilter={handleClearLocationFilter}
        />

      {/* Subcategory Selection Modal */}
      <SubcategoryModal
        visible={showSubcategoryModal}
        onClose={closeSubcategoryModal}
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
