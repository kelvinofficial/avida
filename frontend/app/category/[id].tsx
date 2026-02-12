import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { useResponsive } from '../../src/hooks/useResponsive';
import { Footer } from '../../src/components/layout';

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

// All categories for sidebar
const ALL_CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles', icon: 'car-sport-outline' },
  { id: 'properties', name: 'Properties', icon: 'home-outline' },
  { id: 'electronics', name: 'Electronics', icon: 'laptop-outline' },
  { id: 'phones_tablets', name: 'Phones & Tablets', icon: 'phone-portrait-outline' },
  { id: 'home_furniture', name: 'Home & Furniture', icon: 'bed-outline' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty', icon: 'shirt-outline' },
  { id: 'jobs_services', name: 'Jobs & Services', icon: 'briefcase-outline' },
  { id: 'kids_babies', name: 'Kids & Babies', icon: 'happy-outline' },
  { id: 'sports_leisure', name: 'Sports & Leisure', icon: 'football-outline' },
  { id: 'pets', name: 'Pets', icon: 'paw-outline' },
];

// Category-specific quick filters (enhanced with more options)
const CATEGORY_FILTERS: Record<string, Array<{ key: string; label: string; options: string[] }>> = {
  auto_vehicles: [
    { key: 'fuel_type', label: 'Fuel', options: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'] },
    { key: 'transmission', label: 'Transmission', options: ['Automatic', 'Manual'] },
    { key: 'year_range', label: 'Year', options: ['2024+', '2020-2023', '2015-2019', '2010-2014', 'Before 2010'] },
    { key: 'body_type', label: 'Body', options: ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Coupe'] },
    { key: 'mileage', label: 'Mileage', options: ['< 20K', '20-50K', '50-100K', '100K+'] },
  ],
  properties: [
    { key: 'property_type', label: 'Type', options: ['Apartment', 'House', 'Villa', 'Land', 'Commercial'] },
    { key: 'bedrooms', label: 'Beds', options: ['Studio', '1', '2', '3', '4+'] },
    { key: 'bathrooms', label: 'Baths', options: ['1', '2', '3+'] },
    { key: 'furnished', label: 'Furnished', options: ['Furnished', 'Semi-furnished', 'Unfurnished'] },
    { key: 'listing_type', label: 'For', options: ['Sale', 'Rent'] },
  ],
  electronics: [
    { key: 'brand', label: 'Brand', options: ['Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Other'] },
    { key: 'warranty', label: 'Warranty', options: ['Under Warranty', 'No Warranty'] },
    { key: 'condition', label: 'Condition', options: ['New', 'Like New', 'Used'] },
  ],
  phones_tablets: [
    { key: 'brand', label: 'Brand', options: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Other'] },
    { key: 'storage', label: 'Storage', options: ['64GB', '128GB', '256GB', '512GB+'] },
    { key: 'condition', label: 'Condition', options: ['New', 'Like New', 'Used'] },
  ],
  home_furniture: [
    { key: 'room', label: 'Room', options: ['Living', 'Bedroom', 'Kitchen', 'Dining', 'Office', 'Outdoor'] },
    { key: 'material', label: 'Material', options: ['Wood', 'Metal', 'Fabric', 'Leather', 'Glass'] },
    { key: 'condition', label: 'Condition', options: ['New', 'Like New', 'Used'] },
  ],
  fashion_beauty: [
    { key: 'gender', label: 'For', options: ['Men', 'Women', 'Unisex', 'Kids'] },
    { key: 'size', label: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { key: 'category', label: 'Category', options: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Beauty'] },
    { key: 'condition', label: 'Condition', options: ['New', 'Like New', 'Used'] },
  ],
  jobs_services: [
    { key: 'job_type', label: 'Type', options: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Remote'] },
    { key: 'experience', label: 'Experience', options: ['Entry', '1-3 Years', '3-5 Years', '5+ Years'] },
    { key: 'industry', label: 'Industry', options: ['Tech', 'Healthcare', 'Finance', 'Education', 'Other'] },
  ],
  kids_baby: [
    { key: 'age_group', label: 'Age', options: ['Newborn', '0-1 Year', '1-3 Years', '3-5 Years', '5+'] },
    { key: 'item_type', label: 'Type', options: ['Clothing', 'Toys', 'Furniture', 'Strollers', 'Feeding'] },
    { key: 'condition', label: 'Condition', options: ['New', 'Like New', 'Used'] },
  ],
  sports_hobbies: [
    { key: 'sport_type', label: 'Sport', options: ['Fitness', 'Cycling', 'Football', 'Tennis', 'Swimming', 'Other'] },
    { key: 'skill_level', label: 'Level', options: ['Beginner', 'Intermediate', 'Advanced'] },
    { key: 'condition', label: 'Condition', options: ['New', 'Like New', 'Used'] },
  ],
  pets: [
    { key: 'pet_type', label: 'Pet', options: ['Dogs', 'Cats', 'Birds', 'Fish', 'Reptiles', 'Other'] },
    { key: 'listing_type', label: 'Listing', options: ['For Sale', 'For Adoption', 'Accessories', 'Services'] },
    { key: 'age', label: 'Age', options: ['Puppy/Kitten', 'Young', 'Adult', 'Senior'] },
  ],
  agriculture: [
    { key: 'item_type', label: 'Type', options: ['Machinery', 'Seeds', 'Fertilizers', 'Livestock', 'Land'] },
    { key: 'condition', label: 'Condition', options: ['New', 'Used'] },
  ],
  commercial_equipment: [
    { key: 'equipment_type', label: 'Type', options: ['Office', 'Restaurant', 'Medical', 'Industrial', 'Retail'] },
    { key: 'condition', label: 'Condition', options: ['New', 'Used', 'Refurbished'] },
  ],
  repair_construction: [
    { key: 'service_type', label: 'Service', options: ['Plumbing', 'Electrical', 'Painting', 'Carpentry', 'General'] },
    { key: 'availability', label: 'Available', options: ['Immediate', 'Scheduled', 'Emergency'] },
  ],
  friendship_dating: [
    { key: 'looking_for', label: 'Looking For', options: ['Friendship', 'Dating', 'Activity Partner', 'Networking'] },
    { key: 'age_range', label: 'Age', options: ['18-25', '25-35', '35-45', '45+'] },
  ],
  // Default filters for categories without specific filters
  default: [
    { key: 'condition', label: 'Condition', options: ['New', 'Like New', 'Used'] },
    { key: 'seller_type', label: 'Seller', options: ['Individual', 'Business'] },
  ],
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
  const { isMobile, isTablet, isDesktop, width: screenWidth } = useResponsive();
  
  const [listings, setListings] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Recently searched state
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  // Popular searches state
  const [popularSearches, setPopularSearches] = useState<{global: string[], category: string[]}>({ global: [], category: [] });
  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState<{query: string, count: number}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Saved filters state
  const [savedFilters, setSavedFilters] = useState<Array<{id: string, name: string, filters: any, is_default: boolean}>>([]);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [showSavedFiltersMenu, setShowSavedFiltersMenu] = useState(false);

  const categoryId = id as string;
  
  // API Base URL
  const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  
  // Storage key for recent searches (per category)
  const RECENT_SEARCHES_KEY = `recent_searches_${categoryId}`;
  const MAX_RECENT_SEARCHES = 5;
  
  // Load recent searches from storage
  const loadRecentSearches = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading recent searches:', error);
    }
  }, [RECENT_SEARCHES_KEY]);
  
  // Load popular searches from API
  const loadPopularSearches = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/searches/popular?category_id=${categoryId}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setPopularSearches({
          global: (data.global_searches || []).map((s: any) => s.query),
          category: (data.category_searches || []).map((s: any) => s.query)
        });
      }
    } catch (error) {
      console.log('Error loading popular searches:', error);
    }
  }, [API_URL, categoryId]);
  
  // Track search on backend
  const trackSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) return;
    
    try {
      await fetch(`${API_URL}/api/searches/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim().toLowerCase(), category_id: categoryId })
      });
    } catch (error) {
      console.log('Error tracking search:', error);
    }
  }, [API_URL, categoryId]);
  
  // Save a search query to recent searches
  const saveRecentSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) return;
    
    try {
      const trimmedQuery = query.trim();
      // Remove duplicate if exists and add to front
      const updated = [trimmedQuery, ...recentSearches.filter(s => s.toLowerCase() !== trimmedQuery.toLowerCase())]
        .slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      // Also track on backend for popular searches
      trackSearch(query);
    } catch (error) {
      console.log('Error saving recent search:', error);
    }
  }, [recentSearches, RECENT_SEARCHES_KEY, trackSearch]);
  
  // Remove a specific recent search
  const removeRecentSearch = useCallback(async (query: string) => {
    try {
      const updated = recentSearches.filter(s => s !== query);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.log('Error removing recent search:', error);
    }
  }, [recentSearches, RECENT_SEARCHES_KEY]);
  
  // Clear all recent searches
  const clearAllRecentSearches = useCallback(async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.log('Error clearing recent searches:', error);
    }
  }, [RECENT_SEARCHES_KEY]);
  
  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/searches/suggestions?q=${encodeURIComponent(query)}&category_id=${categoryId}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        const suggestionsList = data.suggestions || [];
        console.log('[Autocomplete] Got suggestions:', suggestionsList);
        setSuggestions(suggestionsList);
        if (suggestionsList.length > 0) {
          setShowSuggestions(true);
        }
      }
    } catch (error) {
      console.log('Error fetching suggestions:', error);
    }
  }, [API_URL, categoryId]);
  
  // Load saved filters from API
  const loadSavedFilters = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch(`${API_URL}/api/saved-filters?category_id=${categoryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedFilters(data);
        
        // Apply default filter if exists and no filters currently active
        const defaultFilter = data.find((f: any) => f.is_default);
        if (defaultFilter && activeFilterCount === 0) {
          applyFilterPreset(defaultFilter.filters);
        }
      }
    } catch (error) {
      console.log('Error loading saved filters:', error);
    }
  }, [API_URL, categoryId, isAuthenticated]);
  
  // Save current filters as a preset
  const saveCurrentFilters = useCallback(async () => {
    if (!isAuthenticated || !newFilterName.trim()) return;
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      
      const filterConfig = {
        selectedSubcategory,
        priceRange,
        selectedCondition,
        sortBy,
        activeFilters,
      };
      
      const response = await fetch(`${API_URL}/api/saved-filters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFilterName.trim(),
          category_id: categoryId,
          filters: filterConfig
        })
      });
      
      if (response.ok) {
        setShowSaveFilterModal(false);
        setNewFilterName('');
        loadSavedFilters();
      }
    } catch (error) {
      console.log('Error saving filter:', error);
    }
  }, [API_URL, categoryId, isAuthenticated, newFilterName, selectedSubcategory, priceRange, selectedCondition, sortBy, activeFilters, loadSavedFilters]);
  
  // Apply a saved filter preset
  const applyFilterPreset = useCallback((filters: any) => {
    if (filters.selectedSubcategory !== undefined) setSelectedSubcategory(filters.selectedSubcategory);
    if (filters.priceRange) setPriceRange(filters.priceRange);
    if (filters.selectedCondition !== undefined) setSelectedCondition(filters.selectedCondition);
    if (filters.sortBy) setSortBy(filters.sortBy);
    if (filters.activeFilters) setActiveFilters(filters.activeFilters);
    setShowSavedFiltersMenu(false);
  }, []);
  
  // Delete a saved filter
  const deleteSavedFilter = useCallback(async (filterId: string) => {
    if (!isAuthenticated) return;
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch(`${API_URL}/api/saved-filters/${filterId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadSavedFilters();
      }
    } catch (error) {
      console.log('Error deleting filter:', error);
    }
  }, [API_URL, isAuthenticated, loadSavedFilters]);
  
  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
    loadPopularSearches();
    loadSavedFilters();
  }, [categoryId, isAuthenticated]);

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
          search: searchQuery.trim() || undefined,
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
        } catch {
          console.log('Could not fetch favorites');
        }
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoadDone(true);
    }
  }, [categoryId, page, isAuthenticated, selectedSubcategory, priceRange, selectedCondition, sortBy, activeFilters, searchQuery]);

  useEffect(() => {
    fetchData(true);
  }, [categoryId, selectedSubcategory, selectedCondition, sortBy]);
  
  // Handle search with debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Show suggestions dropdown when typing
    if (query.trim().length >= 2) {
      setShowSuggestions(true);
      setShowRecentSearches(false);
    } else {
      setShowSuggestions(false);
    }
  }, []);

  // Debounced search effect - for fetching listings
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== undefined) {
        fetchData(true);
        // Save to recent searches when user actually searches (not empty)
        if (searchQuery.trim().length >= 2) {
          saveRecentSearch(searchQuery);
        }
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
  
  // Faster debounce for autocomplete suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        fetchSuggestions(searchQuery);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchSuggestions]);
  
  // Apply a suggestion
  const applySuggestion = useCallback((query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    setSuggestions([]);
  }, []);
  
  // Apply a recent search
  const applyRecentSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setShowRecentSearches(false);
    setShowSuggestions(false);
  }, []);

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

  // Calculate mobile card width for 2-column grid
  const mobileCardWidth = (screenWidth - 32 - 8) / 2; // 16px padding on each side + 8px gap

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
    // Wrap ListingCard in a container with specific width for mobile grid
    return (
      <View style={{ width: mobileCardWidth, marginBottom: 12 }}>
        <ListingCard
          listing={item}
          onPress={() => router.push(getListingRoute(item))}
          onFavorite={() => handleFavorite(item.id)}
          isFavorited={favorites.has(item.id)}
        />
      </View>
    );
  };

  // Only show empty state when initial load is complete and no listings found
  const renderEmpty = () => {
    // Don't show empty state until initial load is done
    if (!initialLoadDone) {
      return null;
    }
    
    return (
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
  };

  const renderFooter = () => {
    // No loading indicator - data loads silently
    return null;
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

          {/* Category-Specific Filters */}
          {(CATEGORY_FILTERS[categoryId] || CATEGORY_FILTERS.default).map((filter) => (
            <View key={filter.key} style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>{filter.label}</Text>
              <View style={styles.filterChipsWrap}>
                {filter.options.map((opt) => (
                  <FilterChip
                    key={opt}
                    label={opt}
                    selected={activeFilters[filter.key] === opt}
                    onPress={() => {
                      setActiveFilters(prev => ({
                        ...prev,
                        [filter.key]: prev[filter.key] === opt ? undefined : opt
                      }));
                    }}
                  />
                ))}
              </View>
            </View>
          ))}

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

  // Save Filter Modal
  const renderSaveFilterModal = () => (
    <Modal
      visible={showSaveFilterModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowSaveFilterModal(false)}
    >
      <View style={styles.saveModalOverlay}>
        <View style={styles.saveModalContent}>
          <Text style={styles.saveModalTitle}>Save Filter Preset</Text>
          <Text style={styles.saveModalSubtitle}>
            Save your current filter combination for quick access later.
          </Text>
          
          <TextInput
            style={styles.saveModalInput}
            placeholder="Enter filter name (e.g., 'Budget Electronics')"
            value={newFilterName}
            onChangeText={setNewFilterName}
            maxLength={50}
            placeholderTextColor={COLORS.textLight}
          />
          
          <View style={styles.saveModalButtons}>
            <TouchableOpacity 
              style={styles.saveModalCancelBtn}
              onPress={() => { setShowSaveFilterModal(false); setNewFilterName(''); }}
            >
              <Text style={styles.saveModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.saveModalSaveBtn, 
                !newFilterName.trim() && styles.saveModalSaveBtnDisabled
              ]}
              onPress={saveCurrentFilters}
              disabled={!newFilterName.trim()}
            >
              <Text style={styles.saveModalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Remove initial loading state - render immediately with empty content
  const mainCategory = getMainCategory(categoryId);

  // Desktop Sidebar Component - Only subcategories and filters
  const renderDesktopSidebar = () => (
    <View style={desktopStyles.sidebar}>
      {/* Subcategories Section */}
      {subcategories.length > 0 && (
        <View style={desktopStyles.sidebarSection}>
          <Text style={desktopStyles.sidebarSectionTitle}>SUBCATEGORIES</Text>
          <TouchableOpacity
            style={[desktopStyles.subcategoryItem, !selectedSubcategory && desktopStyles.subcategoryItemActive]}
            onPress={() => setSelectedSubcategory('')}
          >
            <Text style={[desktopStyles.subcategoryItemText, !selectedSubcategory && desktopStyles.subcategoryItemTextActive]}>
              All {mainCategory?.name}
            </Text>
          </TouchableOpacity>
          {subcategories.map((sub) => (
            <TouchableOpacity
              key={sub.id}
              style={[desktopStyles.subcategoryItem, selectedSubcategory === sub.id && desktopStyles.subcategoryItemActive]}
              onPress={() => handleSubcategorySelect(sub.id)}
            >
              <Text style={[desktopStyles.subcategoryItemText, selectedSubcategory === sub.id && desktopStyles.subcategoryItemTextActive]}>
                {sub.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filters Section */}
      <View style={desktopStyles.sidebarSection}>
        <Text style={desktopStyles.sidebarSectionTitle}>FILTERS</Text>
        
        {/* Condition Filter */}
        {conditionOptions.length > 0 && (
          <View style={desktopStyles.filterGroup}>
            <Text style={desktopStyles.filterLabel}>Condition</Text>
            {conditionOptions.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={[desktopStyles.filterOption, selectedCondition === condition && desktopStyles.filterOptionActive]}
                onPress={() => {
                  setSelectedCondition(selectedCondition === condition ? '' : condition);
                }}
              >
                <Ionicons 
                  name={selectedCondition === condition ? 'checkbox' : 'square-outline'} 
                  size={18} 
                  color={selectedCondition === condition ? COLORS.primary : COLORS.textSecondary} 
                />
                <Text style={desktopStyles.filterOptionText}>{condition}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Price Range Filter */}
        <View style={desktopStyles.filterGroup}>
          <Text style={desktopStyles.filterLabel}>Price Range</Text>
          <View style={desktopStyles.priceInputRow}>
            <TextInput
              style={desktopStyles.priceInput}
              placeholder="Min"
              keyboardType="numeric"
              value={priceRange.min}
              onChangeText={(v) => setPriceRange(prev => ({ ...prev, min: v }))}
              placeholderTextColor="#999"
            />
            <Text style={desktopStyles.priceSeparator}>-</Text>
            <TextInput
              style={desktopStyles.priceInput}
              placeholder="Max"
              keyboardType="numeric"
              value={priceRange.max}
              onChangeText={(v) => setPriceRange(prev => ({ ...prev, max: v }))}
              placeholderTextColor="#999"
            />
          </View>
          <TouchableOpacity style={desktopStyles.applyPriceBtn} onPress={() => fetchData(true)}>
            <Text style={desktopStyles.applyPriceBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Sort By */}
        <View style={desktopStyles.filterGroup}>
          <Text style={desktopStyles.filterLabel}>Sort By</Text>
          {[
            { id: 'newest', label: 'Newest First' },
            { id: 'price_low', label: 'Price: Low to High' },
            { id: 'price_high', label: 'Price: High to Low' },
          ].map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[desktopStyles.filterOption, sortBy === option.id && desktopStyles.filterOptionActive]}
              onPress={() => setSortBy(option.id)}
            >
              <Ionicons 
                name={sortBy === option.id ? 'radio-button-on' : 'radio-button-off'} 
                size={18} 
                color={sortBy === option.id ? COLORS.primary : COLORS.textSecondary} 
              />
              <Text style={desktopStyles.filterOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Saved Filters Section (for authenticated users) */}
      {isAuthenticated ? (
        <View style={desktopStyles.sidebarSection}>
          <Text style={desktopStyles.sidebarSectionTitle}>SAVED FILTERS</Text>
          
          {/* Save Current Filters Button */}
          {activeFilterCount > 0 && (
            <TouchableOpacity 
              style={desktopStyles.saveFilterBtn}
              onPress={() => setShowSaveFilterModal(true)}
            >
              <Ionicons name="bookmark-outline" size={16} color={COLORS.primary} />
              <Text style={desktopStyles.saveFilterBtnText}>Save Current Filters</Text>
            </TouchableOpacity>
          )}
          
          {/* List of saved filters */}
          {savedFilters.length > 0 ? (
            savedFilters.map((filter) => (
              <View key={filter.id} style={desktopStyles.savedFilterItem}>
                <TouchableOpacity 
                  style={desktopStyles.savedFilterMain}
                  onPress={() => applyFilterPreset(filter.filters)}
                >
                  <Ionicons 
                    name={filter.is_default ? "bookmark" : "bookmark-outline"} 
                    size={16} 
                    color={filter.is_default ? COLORS.primary : COLORS.textSecondary} 
                  />
                  <Text style={desktopStyles.savedFilterName}>{filter.name}</Text>
                  {filter.is_default && (
                    <View style={desktopStyles.defaultBadge}>
                      <Text style={desktopStyles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => deleteSavedFilter(filter.id)}
                  style={desktopStyles.deleteFilterBtn}
                >
                  <Ionicons name="trash-outline" size={14} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={desktopStyles.noSavedFilters}>
              No saved filters yet. Apply filters and save them for quick access.
            </Text>
          )}
        </View>
      ) : (
        <View style={desktopStyles.sidebarSection}>
          <Text style={desktopStyles.sidebarSectionTitle}>SAVED FILTERS</Text>
          <TouchableOpacity 
            style={[desktopStyles.saveFilterBtn, { backgroundColor: COLORS.background }]}
            onPress={() => router.push('/login')}
          >
            <Ionicons name="log-in-outline" size={16} color={COLORS.textSecondary} />
            <Text style={[desktopStyles.saveFilterBtnText, { color: COLORS.textSecondary }]}>Sign in to save filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <TouchableOpacity style={desktopStyles.clearFiltersBtn} onPress={handleClearFilters}>
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
          <Text style={desktopStyles.clearFiltersBtnText}>Clear All Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Desktop view - use screen width to force desktop layout on web for any width > 768
  const isDesktopLayout = isDesktop || isTablet || (Platform.OS === 'web' && screenWidth > 768);
  
  if (isDesktopLayout) {
    // Calculate card width dynamically
    const sidebarWidth = 260;
    const sidebarMargin = 24;
    const containerPadding = 48; // 24px on each side
    const cardGap = 24; // gap between cards
    
    // Always 3 columns for desktop/tablet view
    const numColumns = 3;
    
    // Use max content width of 1280px
    const contentWidth = Math.min(screenWidth, MAX_CONTENT_WIDTH);
    const availableForCards = contentWidth - sidebarWidth - sidebarMargin - containerPadding;
    // Card width = (available - gaps between cards) / number of columns
    const cardWidth = Math.floor((availableForCards - (cardGap * (numColumns - 1))) / numColumns);

    return (
      <View style={desktopStyles.pageWrapper}>
        {/* Row 1: Logo + Auth + Post Listing */}
        <View style={desktopStyles.headerRow1}>
          <View style={desktopStyles.headerRow1Inner}>
            <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
              <View style={desktopStyles.logoIcon}>
                <Ionicons name="storefront" size={22} color="#fff" />
              </View>
              <Text style={desktopStyles.logoText}>avida</Text>
            </TouchableOpacity>
            
            <View style={desktopStyles.headerActions}>
              {isAuthenticated ? (
                <>
                  <TouchableOpacity style={desktopStyles.notifBtn} onPress={() => router.push('/notifications')}>
                    <Ionicons name="notifications-outline" size={22} color="#333" />
                  </TouchableOpacity>
                  <TouchableOpacity style={desktopStyles.profileBtn} onPress={() => router.push('/profile')}>
                    <Ionicons name="person-circle-outline" size={28} color="#333" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={desktopStyles.signInBtn} onPress={() => router.push('/login')}>
                    <Text style={desktopStyles.signInBtnText}>Sign In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={desktopStyles.signUpBtn} onPress={() => router.push('/login')}>
                    <Text style={desktopStyles.signUpBtnText}>Sign Up</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={desktopStyles.postListingBtn} onPress={() => {
                if (!isAuthenticated) {
                  router.push('/login?redirect=/post');
                } else {
                  router.push('/post');
                }
              }}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={desktopStyles.postListingBtnText}>Post Listing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Row 2: Search + Location */}
        <View style={desktopStyles.headerRow2}>
          <View style={desktopStyles.headerRow2Inner}>
            <View style={desktopStyles.searchFieldContainer}>
              <View style={desktopStyles.searchField}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  style={desktopStyles.searchInput}
                  placeholder={`Search in ${mainCategory?.name}...`}
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  onFocus={() => setShowRecentSearches(true)}
                  onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
                  data-testid="category-search-input"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearch('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              {/* Recent & Popular Searches Dropdown - Desktop */}
              {showRecentSearches && !searchQuery && (recentSearches.length > 0 || popularSearches.category.length > 0 || popularSearches.global.length > 0) && (
                <View style={desktopStyles.recentSearchesDropdown}>
                  {/* Recent Searches Section */}
                  {recentSearches.length > 0 && (
                    <>
                      <View style={desktopStyles.recentSearchesHeader}>
                        <View style={desktopStyles.recentSearchesTitleRow}>
                          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                          <Text style={desktopStyles.recentSearchesTitle}>Recent Searches</Text>
                        </View>
                        <TouchableOpacity onPress={clearAllRecentSearches}>
                          <Text style={desktopStyles.clearAllBtn}>Clear</Text>
                        </TouchableOpacity>
                      </View>
                      {recentSearches.map((query, index) => (
                        <TouchableOpacity 
                          key={`recent-${query}-${index}`}
                          style={desktopStyles.recentSearchItem}
                          onPress={() => applyRecentSearch(query)}
                        >
                          <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
                          <Text style={desktopStyles.recentSearchItemText}>{query}</Text>
                          <TouchableOpacity 
                            onPress={(e) => { e.stopPropagation(); removeRecentSearch(query); }}
                            style={desktopStyles.removeSearchBtn}
                          >
                            <Ionicons name="close" size={14} color={COLORS.textLight} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  
                  {/* Popular in Category Section */}
                  {popularSearches.category.length > 0 && (
                    <>
                      <View style={[desktopStyles.recentSearchesHeader, recentSearches.length > 0 && { marginTop: 4 }]}>
                        <View style={desktopStyles.recentSearchesTitleRow}>
                          <Ionicons name="flame-outline" size={16} color="#FF6B35" />
                          <Text style={desktopStyles.recentSearchesTitle}>Popular in {mainCategory?.name}</Text>
                        </View>
                      </View>
                      {popularSearches.category.slice(0, 4).map((query, index) => (
                        <TouchableOpacity 
                          key={`cat-popular-${query}-${index}`}
                          style={desktopStyles.recentSearchItem}
                          onPress={() => applyRecentSearch(query)}
                        >
                          <Ionicons name="trending-up" size={16} color="#FF6B35" />
                          <Text style={desktopStyles.recentSearchItemText}>{query}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  
                  {/* Trending Overall Section */}
                  {popularSearches.global.length > 0 && popularSearches.category.length === 0 && (
                    <>
                      <View style={[desktopStyles.recentSearchesHeader, recentSearches.length > 0 && { marginTop: 4 }]}>
                        <View style={desktopStyles.recentSearchesTitleRow}>
                          <Ionicons name="trending-up" size={16} color="#2E7D32" />
                          <Text style={desktopStyles.recentSearchesTitle}>Trending Searches</Text>
                        </View>
                      </View>
                      {popularSearches.global.slice(0, 4).map((query, index) => (
                        <TouchableOpacity 
                          key={`global-popular-${query}-${index}`}
                          style={desktopStyles.recentSearchItem}
                          onPress={() => applyRecentSearch(query)}
                        >
                          <Ionicons name="trending-up" size={16} color="#2E7D32" />
                          <Text style={desktopStyles.recentSearchItemText}>{query}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>
              )}
              {/* Autocomplete Suggestions Dropdown - Desktop */}
              {searchQuery.length >= 2 && suggestions.length > 0 && (
                <View style={desktopStyles.recentSearchesDropdown}>
                  <View style={desktopStyles.recentSearchesHeader}>
                    <View style={desktopStyles.recentSearchesTitleRow}>
                      <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
                      <Text style={desktopStyles.recentSearchesTitle}>Suggestions</Text>
                    </View>
                  </View>
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity 
                      key={`suggestion-${suggestion.query}-${index}`}
                      style={desktopStyles.recentSearchItem}
                      onPress={() => applySuggestion(suggestion.query)}
                    >
                      <Ionicons name="search-outline" size={16} color={COLORS.primary} />
                      <Text style={desktopStyles.recentSearchItemText}>{suggestion.query}</Text>
                      {suggestion.count > 1 && (
                        <Text style={{ fontSize: 12, color: COLORS.textLight, marginLeft: 'auto' }}>
                          {suggestion.count} searches
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity style={desktopStyles.locationChip} activeOpacity={0.7}>
              <Ionicons name="location" size={18} color="#2E7D32" />
              <Text style={desktopStyles.locationText}>All Locations</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content: Sidebar + Listings - Scrollable */}
        <ScrollView 
          style={desktopStyles.scrollContainer}
          contentContainerStyle={desktopStyles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Content wrapper with light background */}
          <View style={desktopStyles.contentWrapper}>
            {/* Row 3: Breadcrumb - Now inside ScrollView */}
            <View style={desktopStyles.breadcrumbRow}>
              <View style={desktopStyles.breadcrumbInner}>
                <TouchableOpacity onPress={() => router.push('/')} style={desktopStyles.breadcrumbLink}>
                  <Ionicons name="home-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={desktopStyles.breadcrumbText}>Home</Text>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
                <Text style={desktopStyles.breadcrumbCurrent}>{mainCategory?.name}</Text>
                {selectedSubcategory && (
                  <>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
                    <Text style={desktopStyles.breadcrumbCurrent}>
                      {subcategories.find(s => s.id === selectedSubcategory)?.name}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Row 4: Category Heading + Results Count - Now inside ScrollView */}
            <View style={desktopStyles.categoryHeadingRow}>
              <View style={desktopStyles.categoryHeadingInner}>
                <View style={desktopStyles.categoryTitleContainer}>
                  {mainCategory?.icon && (
                    <Ionicons name={mainCategory.icon as any} size={28} color={COLORS.primary} />
                  )}
                  <Text style={desktopStyles.categoryTitle}>{mainCategory?.name}</Text>
                </View>
                <Text style={desktopStyles.resultsCount}>{total} listings found</Text>
              </View>
            </View>

            {/* Quick Category Filters */}
            {(CATEGORY_FILTERS[categoryId] || CATEGORY_FILTERS.default) && (
              <View style={desktopStyles.quickFiltersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={desktopStyles.quickFiltersScroll}>
                  {(CATEGORY_FILTERS[categoryId] || CATEGORY_FILTERS.default).map((filter) => (
                    filter.options.slice(0, 4).map((opt) => (
                      <TouchableOpacity
                        key={`${filter.key}-${opt}`}
                        style={[
                          desktopStyles.quickFilterChip,
                          activeFilters[filter.key] === opt && desktopStyles.quickFilterChipActive
                        ]}
                        onPress={() => {
                          setActiveFilters(prev => ({
                            ...prev,
                            [filter.key]: prev[filter.key] === opt ? undefined : opt
                          }));
                        }}
                      >
                        <Text style={[
                          desktopStyles.quickFilterChipText,
                          activeFilters[filter.key] === opt && desktopStyles.quickFilterChipTextActive
                        ]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={desktopStyles.mainContainerInner}>
            {/* Sidebar */}
            {renderDesktopSidebar()}

            {/* Listings Grid - 3 columns */}
            <View style={desktopStyles.listingsContainer}>
              {listings.length === 0 ? (
                renderEmpty()
              ) : (
                <>
                  <View style={desktopStyles.listingsGrid}>
                    {listings.map((item) => (
                      <View key={item.id} style={[desktopStyles.cardWrapper, { width: cardWidth }]}>
                        <ListingCard
                          listing={item}
                          onPress={() => router.push(getListingRoute(item))}
                          onFavorite={() => handleFavorite(item.id)}
                          isFavorited={favorites.has(item.id)}
                          imageHeight={118}
                        />
                      </View>
                    ))}
                  </View>
                  {renderFooter()}
                </>
              )}
            </View>
          </View>
          </View>
          {/* End content wrapper */}
          {/* Footer */}
          <Footer isTablet={isTablet && !isDesktop} />
        </ScrollView>

        {renderFiltersModal()}
        {renderSaveFilterModal()}
      </View>
    );
  }

  // Mobile view (original)
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Navigation Header - Stays sticky */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        {/* Mobile Search Input */}
        <View style={styles.mobileSearchWrapper}>
          <View style={styles.mobileSearchContainer}>
            <Ionicons name="search" size={18} color="#999" />
            <TextInput
              style={styles.mobileSearchInput}
              placeholder={`Search in ${mainCategory?.name || 'category'}...`}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setShowRecentSearches(true)}
              onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
              data-testid="mobile-category-search-input"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      
      {/* Mobile Recent & Popular Searches */}
      {showRecentSearches && !searchQuery && (recentSearches.length > 0 || popularSearches.category.length > 0 || popularSearches.global.length > 0) && (
        <View style={styles.mobileRecentSearches}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <>
              <View style={styles.recentSearchesHeaderMobile}>
                <View style={styles.recentSearchesTitleRowMobile}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.recentSearchesTitleMobile}>Recent</Text>
                </View>
                <TouchableOpacity onPress={clearAllRecentSearches}>
                  <Text style={styles.clearAllBtnMobile}>Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentSearchChipsContainer}>
                {recentSearches.map((query, index) => (
                  <TouchableOpacity 
                    key={`mobile-recent-${query}-${index}`}
                    style={styles.recentSearchChip}
                    onPress={() => applyRecentSearch(query)}
                  >
                    <Ionicons name="search-outline" size={12} color={COLORS.primary} />
                    <Text style={styles.recentSearchChipText}>{query}</Text>
                    <TouchableOpacity 
                      onPress={() => removeRecentSearch(query)}
                      style={styles.removeSearchChipBtn}
                    >
                      <Ionicons name="close" size={12} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
          
          {/* Popular Searches */}
          {(popularSearches.category.length > 0 || popularSearches.global.length > 0) && (
            <>
              <View style={[styles.recentSearchesHeaderMobile, recentSearches.length > 0 && { marginTop: 8 }]}>
                <View style={styles.recentSearchesTitleRowMobile}>
                  <Ionicons name="flame-outline" size={14} color="#FF6B35" />
                  <Text style={styles.recentSearchesTitleMobile}>
                    {popularSearches.category.length > 0 ? 'Popular' : 'Trending'}
                  </Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentSearchChipsContainer}>
                {(popularSearches.category.length > 0 ? popularSearches.category : popularSearches.global).slice(0, 5).map((query, index) => (
                  <TouchableOpacity 
                    key={`mobile-popular-${query}-${index}`}
                    style={styles.popularSearchChip}
                    onPress={() => applyRecentSearch(query)}
                  >
                    <Ionicons name="trending-up" size={12} color="#FF6B35" />
                    <Text style={styles.popularSearchChipText}>{query}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      )}

      {/* Listings Grid with Header */}
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
          ListHeaderComponent={
            <>
              {/* Category Title - Scrolls with content */}
              <View style={styles.categoryTitleSection}>
                {mainCategory?.icon && (
                  <Ionicons name={mainCategory.icon as any} size={24} color={COLORS.primary} />
                )}
                <Text style={styles.headerTitle}>{mainCategory?.name || categoryId}</Text>
              </View>

              {/* Subcategory Chips - Now scrolls with content */}
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
            </>
          }
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
          ListHeaderComponent={
            <>
              {/* Subcategory Chips - Now scrolls with content */}
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
            </>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filters Modal */}
      {renderFiltersModal()}
      {renderSaveFilterModal()}
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
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
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
  // Mobile search container styles
  mobileSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
    height: 36,
    gap: 8,
  },
  mobileSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    paddingVertical: 0,
  },
  mobileSearchWrapper: {
    flex: 1,
  },
  // Mobile Recent Searches
  mobileRecentSearches: {
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentSearchesHeaderMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentSearchesTitleRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentSearchesTitleMobile: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  clearAllBtnMobile: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  recentSearchChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  recentSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recentSearchChipText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  removeSearchChipBtn: {
    marginLeft: 2,
    padding: 2,
  },
  popularSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD4C4',
  },
  popularSearchChipText: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '500',
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
  // Save Filter Modal Styles
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  saveModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  saveModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  saveModalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  saveModalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  saveModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  saveModalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveModalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  saveModalSaveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveModalSaveBtnDisabled: {
    opacity: 0.5,
  },
  saveModalSaveText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

// Desktop Styles
const MAX_CONTENT_WIDTH = 1280;

const desktopStyles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Dark footer background for full-width effect
  },
  // Row 1: Logo + Auth
  headerRow1: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerRow1Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  signInBtnText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  signUpBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  signUpBtnText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBtn: {
    padding: 4,
  },
  postListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  postListingBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  // Row 2: Search + Location
  headerRow2: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  headerRow2Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 16,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  // Search Field Container for dropdown positioning
  searchFieldContainer: {
    flex: 1,
    position: 'relative',
  },
  // Recent Searches Dropdown - Desktop
  recentSearchesDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentSearchesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentSearchesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  clearAllBtn: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentSearchItemText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  removeSearchBtn: {
    padding: 4,
  },
  // Row 3: Breadcrumb
  breadcrumbRow: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  breadcrumbInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    gap: 8,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  breadcrumbLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breadcrumbText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  // Row 4: Category Heading
  categoryHeadingRow: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  categoryHeadingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // Quick Filters Container
  quickFiltersContainer: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  quickFiltersScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFilterChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  quickFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickFilterChipText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  quickFilterChipTextActive: {
    color: '#fff',
  },
  // Scrollable Container
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    // Empty - no padding at bottom to allow full-width footer
  },
  contentWrapper: {
    backgroundColor: COLORS.background,
    paddingBottom: 40,
  },
  // Main Container with Sidebar + Listings
  mainContainerInner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    paddingHorizontal: 24,
    paddingTop: 8,
    alignSelf: 'center',
  },
  sidebar: {
    width: 260,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginRight: 24,
    alignSelf: 'flex-start',
  },
  sidebarSection: {
    marginBottom: 20,
  },
  sidebarSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  subcategoryItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
  },
  subcategoryItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  subcategoryItemText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  subcategoryItemTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  filterGroup: {
    marginBottom: 14,
    width: '100%',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  filterOptionActive: {},
  filterOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  priceInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
  },
  priceSeparator: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  applyPriceBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  applyPriceBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  clearFiltersBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Listings
  listingsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  // Saved Filters desktop styles
  saveFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    marginBottom: 12,
  },
  saveFilterBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  savedFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  savedFilterMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  savedFilterName: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  deleteFilterBtn: {
    padding: 4,
  },
  noSavedFilters: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
