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

// ============ LAYOUT CONSTANTS ============
const COLUMN_GAP = 12;

// ============ MAIN HOME SCREEN ============
export default function HomeScreen() {
  const router = useRouter();
  
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
    
    // Location state
    selectedCity,
    currentCity,
    selectedLocationFilter,
    expandedSearch,
    
    // Search state
    homeSearchQuery,
    showSearchSuggestions,
    searchSuggestions,
    
    // Category state
    selectedCategory,
    
    // Actions
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
  } = useHomeData();
  
  // ============ UI-SPECIFIC STATE (not in hooks) ============
  const [showLocationModal, setShowLocationModal] = useState(false);

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
