import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  RefreshControl,
  FlatList,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLocationStore } from '../../src/store/locationStore';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useHomeData } from '../../src/hooks/useHomeData';
import { useInstantListingsFeed, getFeedFlatListProps, FeedParams } from '../../src/hooks/useInstantListingsFeed';
import { feedItemToListing } from '../../src/utils/feedCache';
import { useSubcategoryModal } from '../../src/hooks/useSubcategoryModal';
import { ResponsiveLayout, Footer } from '../../src/components/layout';
import { LocationData } from '../../src/components/LocationPicker';
import { CategoryDrawer } from '../../src/components/home/CategoryDrawer';
import { 
  MobileHeader,
  HomeDesktopHeader,
  LocationModal,
} from '../../src/components/home';
import { ListingCard } from '../../src/components/shared/ListingCard';
import { EmptyState } from '../../src/components/EmptyState';
import { 
  styles, 
  HORIZONTAL_PADDING, 
} from '../../src/components/home/homeStyles';
import { HomeSEO, OrganizationSchema, WebsiteSearchSchema } from '../../src/components/seo';
import { BannerSlot, FeedBanner, HeaderBanner } from '../../src/components/BannerSlot';

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
  // Centralized data fetching and state management (for non-listings data)
  const {
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
  
  // ============ INSTANT FEED HOOK ============
  // High-performance cache-first feed for listings
  const feedParams: FeedParams = useMemo(() => ({
    country: selectedLocationFilter?.country_code,
    region: selectedLocationFilter?.region_code,
    city: selectedLocationFilter?.city_code,
    category: selectedCategory || undefined,
    sort: 'newest',
  }), [selectedLocationFilter, selectedCategory]);
  
  const {
    items: feedItems,
    isRefreshing,
    isLoadingMore,
    hasMore,
    isInitialLoad,
    refresh: refreshFeed,
    loadMore: loadMoreFeed,
  } = useInstantListingsFeed(feedParams);
  
  // Convert feed items to listing format for compatibility
  const listings = useMemo(() => feedItems.map(feedItemToListing), [feedItems]);
  
  // ============ UI-SPECIFIC STATE (not in hooks) ============
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Sync local state FROM global location store (one-way sync)
  // This ensures local state reflects what's in the global store
  useEffect(() => {
    // Only sync if the global store values are different from local
    const globalFilter = locationStore.selectedLocationFilter;
    const globalCity = locationStore.currentCity;
    
    // Check if values are actually different before updating
    const filterChanged = JSON.stringify(globalFilter) !== JSON.stringify(selectedLocationFilter);
    const cityChanged = globalCity !== currentCity;
    
    if (filterChanged || cityChanged) {
      if (globalFilter) {
        setSelectedLocationFilter(globalFilter);
        setCurrentCity(globalCity);
      } else if (globalCity === 'All Locations' || globalCity === 'Select Location') {
        setSelectedLocationFilter(null);
        setCurrentCity(globalCity);
      }
    }
  }, [locationStore.selectedLocationFilter, locationStore.currentCity]);

  // When local location changes (from this page's location picker), update global store
  // This is called directly from the location picker handlers, not via useEffect

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
    
    // Sync to global store for persistence across pages
    locationStore.setLocation(displayName, location as any);
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
  // For FlatList with numColumns and space-between, use available width minus padding
  const availableWidth = effectiveWidth - gridPadding * 2;
  // Subtract 2px buffer to account for any rounding issues
  const dynamicCardWidth = Math.floor((availableWidth - gridGap * (columns - 1) - 2) / columns);

  // ============ LISTINGS GRID PROPS ============
  const listingsGridProps = {
    listings,
    initialLoadDone: !isInitialLoad,
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

  // ============ PREPARE FEED DATA WITH BANNERS ============
  const BANNER_AFTER_ROWS = 3; // Show banner after every 3 rows of listings
  const feedData = useMemo(() => {
    if (!listings || listings.length === 0) return [];
    
    const result: any[] = [];
    const itemsPerRow = columns;
    let rowCount = 0;
    let listingCount = 0;
    
    for (let i = 0; i < listings.length; i += itemsPerRow) {
      const rowItems = listings.slice(i, i + itemsPerRow);
      result.push({ type: 'row', items: rowItems, key: `row-${i}` });
      rowCount++;
      listingCount += rowItems.length;
      
      // Inject banner after every BANNER_AFTER_ROWS rows (behaves like native ad)
      if (rowCount % BANNER_AFTER_ROWS === 0 && i + itemsPerRow < listings.length) {
        result.push({ type: 'banner', position: listingCount, key: `banner-${rowCount}` });
      }
    }
    return result;
  }, [listings, columns]);

  // ============ RENDER FEED ITEM (ROW OR BANNER) ============
  const renderFeedItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'banner') {
      // Use FeedBanner for native ad style - single item width like a listing
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: gridGap }}>
          <View style={{ width: dynamicCardWidth }}>
            <FeedBanner 
              position={item.position}
              category={selectedCategory || undefined}
            />
          </View>
          {/* Fill remaining space */}
          {columns > 1 && Array.from({ length: columns - 1 }).map((_, i) => (
            <View key={`banner-spacer-${i}`} style={{ width: dynamicCardWidth, marginLeft: gridGap }} />
          ))}
        </View>
      );
    }
    
    // Render a row of listings
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: gridGap }}>
        {item.items.map((listing: any) => (
          <View key={listing.id} style={{ width: dynamicCardWidth }}>
            <ListingCard
              listing={listing}
              onPress={() => router.push(`/listing/${listing.id}`)}
              onFavorite={() => toggleFavorite(listing.id)}
              isFavorited={favorites.has(listing.id)}
              userLocation={selectedCity?.lat && selectedCity?.lng ? { lat: selectedCity.lat, lng: selectedCity.lng } : null}
            />
          </View>
        ))}
        {/* Fill remaining space if row isn't full */}
        {item.items.length < columns && Array.from({ length: columns - item.items.length }).map((_, i) => (
          <View key={`spacer-${i}`} style={{ width: dynamicCardWidth }} />
        ))}
      </View>
    );
  }, [columns, dynamicCardWidth, gridGap, router, toggleFavorite, favorites, selectedCity, selectedCategory]);

  // ============ FLATLIST HEADER COMPONENT ============
  const ListHeaderComponent = useMemo(() => {
    console.log('[index.tsx] Rendering header - isDesktop:', isDesktop, 'isTablet:', isTablet);
    return (
      <View style={(isDesktop || isTablet) ? { backgroundColor: '#F5F5F5' } : undefined}>
        {isDesktop || isTablet ? (
          <HomeDesktopHeader {...homeDesktopHeaderProps} />
        ) : <MobileHeader {...mobileHeaderProps} />}
        <BannerSlot 
          placement="header_below" 
          testId="homepage-header-banner"
        />
      </View>
    );
  }, [isDesktop, isTablet, homeDesktopHeaderProps, mobileHeaderProps]);

  // ============ FLATLIST FOOTER COMPONENT ============
  const ListFooterComponent = useMemo(() => (
    <View>
      {/* Footer Banner */}
      <BannerSlot placement="footer_banner" style={{ marginHorizontal: 8, marginVertical: 8 }} />
      {isLoadingMore && (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#2E7D32" />
        </View>
      )}
      {(isDesktop || isTablet) && <Footer isTablet={isTablet && !isDesktop} />}
      <View style={{ height: 100 }} />
    </View>
  ), [isLoadingMore, isDesktop, isTablet]);

  // ============ EMPTY STATE COMPONENT ============
  const ListEmptyComponent = useMemo(() => {
    // Show a loading indicator during initial load
    if (isInitialLoad) {
      return (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>Loading listings...</Text>
        </View>
      );
    }
    return (
      <EmptyState 
        icon="pricetags-outline" 
        title={expandedSearch ? "Showing nearby listings" : "No listings yet"} 
        description={expandedSearch ? "Try adjusting your location or search settings." : "Be the first to post an ad in your area!"} 
      />
    );
  }, [isInitialLoad, expandedSearch]);

  // FlatList key extractor
  const keyExtractor = useCallback((item: any) => item.key, []);

  // FlatList optimizations
  const flatListProps = useMemo(() => ({
    ...getFeedFlatListProps(240),
  }), []);

  const mainContent = (
    <FlatList
      data={feedData}
      renderItem={renderFeedItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={refreshFeed} 
          colors={['#2E7D32']} 
          tintColor="#2E7D32" 
        />
      }
      onEndReached={loadMoreFeed}
      onEndReachedThreshold={0.7}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        { paddingBottom: 100, paddingHorizontal: gridPadding },
        (isDesktop || isTablet) && { maxWidth: MAX_WIDTH, alignSelf: 'center', width: '100%' },
      ]}
      style={isDesktop || isTablet ? { flex: 1 } : undefined}
      {...flatListProps}
    />
  );

  return (
    <ResponsiveLayout showSidebar={false}>
      {/* SEO Meta Tags (Web Only) */}
      <HomeSEO />
      <OrganizationSchema />
      <WebsiteSearchSchema />
      
      <SafeAreaView style={styles.container} edges={isMobile ? ['top'] : []}>
        {/* Show minimal background immediately to prevent white flash */}
        <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
          {mainContent}
        </View>

        {/* Location Picker Modal */}
        <LocationModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          selectedLocationFilter={selectedLocationFilter}
          onLocationSelect={handleLocationSelect}
          onClearLocationFilter={handleClearLocationFilter}
        />

      {/* Subcategory Selection Drawer - Full Height */}
      <CategoryDrawer
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
