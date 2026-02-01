import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../src/utils/theme';
import { AutoFilters, AutoListing } from '../../src/types/auto';
import { autoApi } from '../../src/utils/autoApi';
import { CAR_BRANDS, EXPLORE_CARDS, CITIES } from '../../src/data/autoData';

// Components
import { SegmentedTabs } from '../../src/components/auto/SegmentedTabs';
import { SmartSearchBar } from '../../src/components/auto/SmartSearchBar';
import { LocationControls } from '../../src/components/auto/LocationControls';
import { BrandGrid } from '../../src/components/auto/BrandGrid';
import { FilterTabs } from '../../src/components/auto/FilterTabs';
import { ExploreCards } from '../../src/components/auto/ExploreCards';
import { AutoListingCard } from '../../src/components/auto/AutoListingCard';
import { AdvancedFiltersSheet } from '../../src/components/auto/AdvancedFiltersSheet';
import { NativeAdCard } from '../../src/components/auto/NativeAdCard';
import { RecommendationSection } from '../../src/components/auto/RecommendationSection';

const { width } = Dimensions.get('window');

// Mock data for demo
const MOCK_AUTO_LISTINGS: AutoListing[] = [
  {
    id: 'auto_1',
    user_id: 'seller_1',
    title: 'BMW 320i M Sport - Full Service History',
    description: 'Excellent condition BMW 3 Series with full service history',
    price: 28500,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Berlin, Germany',
    city: 'Berlin',
    distance: 5,
    status: 'active',
    featured: true,
    boosted: false,
    views: 237,
    favorites_count: 45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    make: 'BMW',
    model: '320i',
    year: 2021,
    mileage: 35000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_1',
      name: 'AutoHaus Berlin',
      rating: 4.8,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2020-01-15',
    },
  },
  {
    id: 'auto_2',
    user_id: 'seller_2',
    title: 'Mercedes-Benz C200 AMG Line',
    description: 'Stunning C-Class with AMG styling package',
    price: 32900,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Munich, Germany',
    city: 'Munich',
    distance: 12,
    status: 'active',
    featured: false,
    boosted: true,
    views: 189,
    favorites_count: 32,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    make: 'Mercedes',
    model: 'C200',
    year: 2022,
    mileage: 18000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: true,
    financingAvailable: true,
    seller: {
      user_id: 'seller_2',
      name: 'Premium Cars Munich',
      rating: 4.9,
      verified: true,
      sellerType: 'certified',
      memberSince: '2019-05-20',
    },
  },
  {
    id: 'auto_3',
    user_id: 'seller_3',
    title: 'Volkswagen Golf GTI - Low Mileage',
    description: 'Hot hatch with performance upgrades',
    price: 24500,
    negotiable: false,
    category_id: 'vehicles',
    images: [],
    location: 'Hamburg, Germany',
    city: 'Hamburg',
    distance: 8,
    status: 'active',
    featured: false,
    boosted: false,
    views: 156,
    favorites_count: 28,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    make: 'Volkswagen',
    model: 'Golf GTI',
    year: 2020,
    mileage: 28000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    bodyType: 'Hatchback',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: false,
    exchangePossible: false,
    financingAvailable: false,
    seller: {
      user_id: 'seller_3',
      name: 'Max M.',
      rating: 4.5,
      verified: false,
      sellerType: 'individual',
      memberSince: '2022-03-10',
    },
  },
  {
    id: 'auto_4',
    user_id: 'seller_4',
    title: 'Audi Q5 S-Line Quattro - Full Options',
    description: 'Luxury SUV with all-wheel drive',
    price: 45900,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Frankfurt, Germany',
    city: 'Frankfurt',
    distance: 15,
    status: 'active',
    featured: true,
    boosted: false,
    views: 312,
    favorites_count: 67,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
    make: 'Audi',
    model: 'Q5',
    year: 2023,
    mileage: 12000,
    fuelType: 'Diesel',
    transmission: 'Automatic',
    bodyType: 'SUV',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: true,
    financingAvailable: true,
    seller: {
      user_id: 'seller_4',
      name: 'Audi Zentrum Frankfurt',
      rating: 5.0,
      verified: true,
      sellerType: 'certified',
      memberSince: '2018-09-01',
    },
  },
  {
    id: 'auto_5',
    user_id: 'seller_5',
    title: 'Toyota Camry Hybrid - Eco Champion',
    description: 'Fuel-efficient hybrid sedan',
    price: 26800,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Cologne, Germany',
    city: 'Cologne',
    distance: 20,
    status: 'active',
    featured: false,
    boosted: false,
    views: 98,
    favorites_count: 15,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    mileage: 22000,
    fuelType: 'Hybrid',
    transmission: 'CVT',
    bodyType: 'Sedan',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: false,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_5',
      name: 'Sarah K.',
      rating: 4.7,
      verified: true,
      sellerType: 'individual',
      memberSince: '2021-11-05',
    },
  },
  {
    id: 'auto_6',
    user_id: 'seller_6',
    title: 'Tesla Model 3 Long Range - Autopilot',
    description: 'Electric vehicle with full self-driving capability',
    price: 38500,
    negotiable: false,
    category_id: 'vehicles',
    images: [],
    location: 'Stuttgart, Germany',
    city: 'Stuttgart',
    distance: 25,
    status: 'active',
    featured: true,
    boosted: true,
    views: 456,
    favorites_count: 89,
    created_at: new Date(Date.now() - 18000000).toISOString(),
    updated_at: new Date(Date.now() - 18000000).toISOString(),
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    mileage: 8000,
    fuelType: 'Electric',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: true,
    financingAvailable: true,
    seller: {
      user_id: 'seller_6',
      name: 'EV Motors Stuttgart',
      rating: 4.9,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2020-06-15',
    },
  },
  {
    id: 'auto_7',
    user_id: 'seller_7',
    title: 'Ford Mustang GT 5.0 V8 - Muscle Car',
    description: 'American muscle with throaty V8 engine',
    price: 42000,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Düsseldorf, Germany',
    city: 'Düsseldorf',
    distance: 18,
    status: 'active',
    featured: false,
    boosted: false,
    views: 234,
    favorites_count: 56,
    created_at: new Date(Date.now() - 21600000).toISOString(),
    updated_at: new Date(Date.now() - 21600000).toISOString(),
    make: 'Ford',
    model: 'Mustang GT',
    year: 2021,
    mileage: 15000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    bodyType: 'Coupe',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: false,
    exchangePossible: true,
    financingAvailable: false,
    seller: {
      user_id: 'seller_7',
      name: 'Classic Cars NRW',
      rating: 4.6,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2019-02-28',
    },
  },
  {
    id: 'auto_8',
    user_id: 'seller_8',
    title: 'Porsche 911 Carrera - Iconic Sports Car',
    description: 'The legendary 911 in pristine condition',
    price: 89900,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Berlin, Germany',
    city: 'Berlin',
    distance: 3,
    status: 'active',
    featured: true,
    boosted: true,
    views: 678,
    favorites_count: 123,
    created_at: new Date(Date.now() - 25200000).toISOString(),
    updated_at: new Date(Date.now() - 25200000).toISOString(),
    make: 'Porsche',
    model: '911 Carrera',
    year: 2022,
    mileage: 5000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'Coupe',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_8',
      name: 'Porsche Zentrum Berlin',
      rating: 5.0,
      verified: true,
      sellerType: 'certified',
      memberSince: '2017-04-10',
    },
  },
  {
    id: 'auto_9',
    user_id: 'seller_9',
    title: 'Hyundai Tucson N Line - Stylish SUV',
    description: 'Modern crossover with sport styling',
    price: 29500,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Leipzig, Germany',
    city: 'Leipzig',
    distance: 30,
    status: 'active',
    featured: false,
    boosted: false,
    views: 87,
    favorites_count: 12,
    created_at: new Date(Date.now() - 28800000).toISOString(),
    updated_at: new Date(Date.now() - 28800000).toISOString(),
    make: 'Hyundai',
    model: 'Tucson',
    year: 2023,
    mileage: 15000,
    fuelType: 'Hybrid',
    transmission: 'Automatic',
    bodyType: 'SUV',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: false,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_9',
      name: 'Thomas W.',
      rating: 4.3,
      verified: false,
      sellerType: 'individual',
      memberSince: '2023-01-20',
    },
  },
  {
    id: 'auto_10',
    user_id: 'seller_10',
    title: 'Honda Civic Type R - Track Ready',
    description: 'High-performance hot hatch',
    price: 38900,
    negotiable: false,
    category_id: 'vehicles',
    images: [],
    location: 'Nuremberg, Germany',
    city: 'Nuremberg',
    distance: 45,
    status: 'active',
    featured: false,
    boosted: true,
    views: 167,
    favorites_count: 34,
    created_at: new Date(Date.now() - 32400000).toISOString(),
    updated_at: new Date(Date.now() - 32400000).toISOString(),
    make: 'Honda',
    model: 'Civic Type R',
    year: 2023,
    mileage: 3000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    bodyType: 'Hatchback',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: true,
    financingAvailable: false,
    seller: {
      user_id: 'seller_10',
      name: 'Performance Cars Bayern',
      rating: 4.8,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2020-08-15',
    },
  },
];

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

export default function AutoCategoryScreen() {
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState('motors');
  const [listings, setListings] = useState<AutoListing[]>(MOCK_AUTO_LISTINGS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<AutoFilters>({});
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [radius, setRadius] = useState(50);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentSearches] = useState(['BMW 3 Series', 'Mercedes C-Class', 'Audi A4']);
  const [popularSearches] = useState(['Tesla Model 3', 'VW Golf', 'BMW X5', 'Porsche 911']);
  const [page, setPage] = useState(1);

  // Filter listings based on filters
  const filteredListings = listings.filter((listing) => {
    if (selectedBrand && listing.make.toLowerCase() !== selectedBrand.toLowerCase()) {
      return false;
    }
    if (selectedCity && listing.city !== selectedCity) {
      return false;
    }
    if (filters.fuelType && listing.fuelType !== filters.fuelType) {
      return false;
    }
    if (filters.transmission && listing.transmission !== filters.transmission) {
      return false;
    }
    if (filters.bodyType && listing.bodyType !== filters.bodyType) {
      return false;
    }
    if (filters.condition && listing.condition !== filters.condition) {
      return false;
    }
    if (filters.priceMin && listing.price < filters.priceMin) {
      return false;
    }
    if (filters.priceMax && listing.price > filters.priceMax) {
      return false;
    }
    if (filters.verifiedSeller && !listing.seller?.verified) {
      return false;
    }
    if (filters.accidentFree && !listing.accidentFree) {
      return false;
    }
    return true;
  });

  // Featured listings
  const featuredListings = filteredListings.filter((l) => l.featured);
  const recommendedListings = filteredListings.slice(0, 6);
  const verifiedListings = filteredListings.filter((l) => l.seller?.verified);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSearch = (query: string) => {
    console.log('Search:', query);
    // Filter based on search query
    const filtered = MOCK_AUTO_LISTINGS.filter(
      (l) =>
        l.title.toLowerCase().includes(query.toLowerCase()) ||
        l.make.toLowerCase().includes(query.toLowerCase()) ||
        l.model.toLowerCase().includes(query.toLowerCase())
    );
    setListings(filtered.length > 0 ? filtered : MOCK_AUTO_LISTINGS);
  };

  const handleBrandSelect = (brandId: string | null) => {
    setSelectedBrand(brandId);
    setFilters((prev) => ({ ...prev, make: brandId || undefined }));
  };

  const handleFilterTabPress = (tabId: string) => {
    if (tabId === 'make') {
      // Show brand selector - already visible
      Alert.alert('Select Make', 'Scroll horizontally to browse brands');
    } else if (tabId === 'city') {
      // Show city picker
      Alert.alert(
        'Select City',
        'Choose a city',
        CITIES.slice(0, 6).map((city) => ({
          text: city,
          onPress: () => setSelectedCity(city),
        }))
      );
    } else if (tabId === 'price') {
      setShowFiltersSheet(true);
    } else {
      setShowFiltersSheet(true);
    }
  };

  const handleApplyFilters = (newFilters: AutoFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSelectedBrand(null);
    setSelectedCity(null);
  };

  const toggleFavorite = (listingId: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  const handleListingPress = (listing: AutoListing) => {
    router.push(`/listing/${listing.id}`);
  };

  const renderListItem = ({ item, index }: { item: AutoListing; index: number }) => {
    // Insert native ad every 6 items
    const showAd = (index + 1) % 6 === 0;
    
    return (
      <View style={[styles.cardWrapper, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}>
        <AutoListingCard
          listing={item}
          onPress={() => handleListingPress(item)}
          onFavorite={() => toggleFavorite(item.id)}
          onChat={() => console.log('Chat')}
          onCall={() => console.log('Call')}
          isFavorited={favorites.has(item.id)}
        />
        {showAd && index % 2 === 1 && (
          <View style={styles.adContainer}>
            <NativeAdCard type="listing" />
          </View>
        )}
      </View>
    );
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
        onSelectCity={() =>
          Alert.alert(
            'Select City',
            'Choose a city',
            CITIES.slice(0, 6).map((city) => ({
              text: city,
              onPress: () => setSelectedCity(city),
            }))
          )
        }
        onToggleNearMe={() => setNearMeEnabled(!nearMeEnabled)}
        onChangeRadius={setRadius}
      />

      {/* Brand Grid */}
      <BrandGrid
        brands={CAR_BRANDS}
        selectedBrand={selectedBrand}
        onSelectBrand={handleBrandSelect}
        onLongPressBrand={(brandId) => Alert.alert('Follow Brand', `Follow ${brandId} for updates?`)}
      />

      {/* Filter Tabs */}
      <FilterTabs
        tabs={FILTER_TABS.map((tab) => ({
          ...tab,
          value: tab.id === 'make' && selectedBrand ? selectedBrand : undefined,
        }))}
        activeFilters={filters}
        onTabPress={handleFilterTabPress}
        onMoreFilters={() => setShowFiltersSheet(true)}
      />

      {/* Explore Cards */}
      <ExploreCards
        cards={EXPLORE_CARDS}
        onPressCard={(card) => Alert.alert(card.title, card.subtitle)}
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
          onPressSeeAll={() => console.log('See all featured')}
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
          onPressSeeAll={() => console.log('See all verified')}
        />
      )}

      {/* Banner Ad */}
      <NativeAdCard type="banner" />

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          All Listings ({filteredListings.length})
        </Text>
        <TouchableOpacity style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>
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
            onPress={() => Alert.alert('Safety Tips', 'Always meet in public places and verify seller identity')}
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
        numColumns={2}
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
          </View>
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
          ) : null
        }
        onEndReachedThreshold={0.5}
      />

      {/* Advanced Filters Sheet */}
      <AdvancedFiltersSheet
        visible={showFiltersSheet}
        onClose={() => setShowFiltersSheet(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
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
  },
  sortText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
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
  loader: {
    paddingVertical: theme.spacing.lg,
  },
});
