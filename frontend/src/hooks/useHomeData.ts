/**
 * useHomeData Hook
 * Centralized data fetching and state management for the Home Screen
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Storage } from '../../utils/storage';
import { listingsApi, categoriesApi, favoritesApi, notificationsApi, locationsApi } from '../../utils/api';
import { sandboxAwareListingsApi, sandboxAwareCategoriesApi, sandboxUtils } from '../../utils/sandboxAwareApi';
import { Listing, Category } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useSandbox } from '../../utils/sandboxContext';
import type { FeaturedSeller, FeaturedListing } from '../home';

// Types
export interface LocationFilter {
  country_code?: string;
  region_code?: string;
  district_code?: string;
  city_code?: string;
  city_name?: string;
  location_text?: string;
}

export interface SelectedCity {
  country_code: string;
  country_name: string;
  region_code: string;
  region_name: string;
  district_code?: string;
  district_name?: string;
  city_code: string;
  city_name: string;
  lat: number;
  lng: number;
}

export interface SearchSuggestions {
  recent: string[];
  trending: { query: string; count: number }[];
  autocomplete: { query: string; count: number }[];
}

export interface UseHomeDataReturn {
  // Listings data
  listings: Listing[];
  categories: Category[];
  loading: boolean;
  initialLoadDone: boolean;
  refreshing: boolean;
  page: number;
  hasMore: boolean;
  
  // Featured data
  featuredSellers: FeaturedSeller[];
  featuredListings: FeaturedListing[];
  loadingFeatured: boolean;
  
  // User data
  favorites: Set<string>;
  notificationCount: number;
  creditBalance: number | null;
  unviewedBadgeCount: number;
  
  // Location state
  selectedCity: SelectedCity | null;
  currentCity: string;
  selectedLocationFilter: LocationFilter | null;
  includeNearbyCities: boolean;
  searchRadius: number;
  expandedSearch: boolean;
  expandedSearchMessage: string | null;
  
  // Search state
  homeSearchQuery: string;
  showSearchSuggestions: boolean;
  searchSuggestions: SearchSuggestions;
  
  // Category state
  selectedCategory: string | null;
  
  // Actions
  fetchData: (refresh?: boolean) => Promise<void>;
  handleRefresh: () => void;
  loadMore: () => void;
  toggleFavorite: (listingId: string) => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  setHomeSearchQuery: (query: string) => void;
  setShowSearchSuggestions: (show: boolean) => void;
  handleSearchInputChange: (text: string) => void;
  handleSuggestionClick: (query: string) => void;
  clearRecentSearches: () => void;
  setSelectedLocationFilter: (filter: LocationFilter | null) => void;
  setCurrentCity: (city: string) => void;
  saveSelectedCity: (city: SelectedCity | null) => Promise<void>;
  handleClearLocationFilter: () => Promise<void>;
}

export function useHomeData(): UseHomeDataReturn {
  const { isAuthenticated, token, user } = useAuthStore();
  const { isSandboxMode } = useSandbox();
  
  // Listings state
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Featured state
  const [featuredSellers, setFeaturedSellers] = useState<FeaturedSeller[]>([]);
  const [featuredListings, setFeaturedListings] = useState<FeaturedListing[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  
  // User state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notificationCount, setNotificationCount] = useState(0);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [unviewedBadgeCount, setUnviewedBadgeCount] = useState(0);
  
  // Location state
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [currentCity, setCurrentCity] = useState('Select Location');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<LocationFilter | null>(null);
  const [includeNearbyCities, setIncludeNearbyCities] = useState(true);
  const [searchRadius, setSearchRadius] = useState(50);
  const [expandedSearch, setExpandedSearch] = useState(false);
  const [expandedSearchMessage, setExpandedSearchMessage] = useState<string | null>(null);
  
  // Search state
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestions>({
    recent: [],
    trending: [],
    autocomplete: [],
  });
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch featured listings from verified sellers
  const fetchFeaturedListings = useCallback(async () => {
    try {
      setLoadingFeatured(true);
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/listings/featured-verified?limit=12`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedListings(data.listings || []);
      } else {
        const sellersResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/business-profiles/featured?limit=8`);
        if (sellersResponse.ok) {
          const data = await sellersResponse.json();
          setFeaturedSellers(data.sellers || []);
        }
      }
    } catch (error) {
      console.error('Error fetching featured listings:', error);
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  // Load search suggestions (recent + trending)
  const loadSearchSuggestions = useCallback(async () => {
    try {
      let recent: string[] = [];
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem('recent_searches');
        if (stored) {
          recent = JSON.parse(stored);
        }
      }

      let trending: { query: string; count: number }[] = [];
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/searches/popular?limit=5`);
        if (res.ok) {
          const data = await res.json();
          trending = data.global_searches || [];
        }
      } catch (e) {
        console.log('Could not fetch trending searches');
      }

      setSearchSuggestions({ recent: recent.slice(0, 5), trending, autocomplete: [] });
    } catch (err) {
      console.error('Failed to load search suggestions:', err);
    }
  }, []);

  // Fetch autocomplete suggestions
  const fetchAutocompleteSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions(prev => ({ ...prev, autocomplete: [] }));
      return;
    }

    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/searches/suggestions?q=${encodeURIComponent(query)}&limit=8`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchSuggestions(prev => ({ 
          ...prev, 
          autocomplete: data.suggestions || [] 
        }));
      }
    } catch (e) {
      console.log('Could not fetch autocomplete suggestions');
    }
  }, []);

  // Handle search input change with debounce
  const handleSearchInputChange = useCallback((text: string) => {
    setHomeSearchQuery(text);
    
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }
    
    if (text.length === 0) {
      setShowSearchSuggestions(true);
      setSearchSuggestions(prev => ({ ...prev, autocomplete: [] }));
    } else {
      setShowSearchSuggestions(true);
      autocompleteTimeoutRef.current = setTimeout(() => {
        fetchAutocompleteSuggestions(text);
      }, 300);
    }
  }, [fetchAutocompleteSuggestions]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((query: string) => {
    setHomeSearchQuery(query);
    setShowSearchSuggestions(false);
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('recent_searches');
    }
    setSearchSuggestions(prev => ({ ...prev, recent: [] }));
  }, []);

  // Load saved location
  const loadSavedLocation = useCallback(async () => {
    try {
      const saved = await Storage.getItem('@selected_city');
      if (saved) {
        const city = JSON.parse(saved);
        setSelectedCity(city);
        setCurrentCity(city.city_name || city.location_text || 'Selected Location');
        setSelectedLocationFilter({
          country_code: city.country_code,
          region_code: city.region_code,
          city_name: city.city_name,
          location_text: city.location_text,
        });
      }
      const savedRadius = await Storage.getItem('@search_radius');
      if (savedRadius) setSearchRadius(parseInt(savedRadius, 10));
      const savedInclude = await Storage.getItem('@include_nearby');
      if (savedInclude !== null) setIncludeNearbyCities(savedInclude === 'true');
    } catch (err) {
      console.error('Failed to load saved location:', err);
    }
  }, []);

  // Save selected city
  const saveSelectedCity = useCallback(async (city: SelectedCity | null) => {
    setSelectedCity(city);
    if (city) {
      setCurrentCity(city.city_name);
      try {
        await Storage.setItem('@selected_city', JSON.stringify(city));
      } catch (err) {
        console.error('Failed to save city:', err);
      }
    }
  }, []);

  // Clear location filter
  const handleClearLocationFilter = useCallback(async () => {
    setSelectedLocationFilter(null);
    setCurrentCity('All Locations');
    setSelectedCity(null);
    setExpandedSearch(false);
    setExpandedSearchMessage(null);
    try {
      await Storage.removeItem('@selected_city');
    } catch (err) {
      console.error('Failed to clear saved city:', err);
    }
  }, []);

  // Fetch main data
  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        setExpandedSearch(false);
        setExpandedSearchMessage(null);
      } else if (!hasMore && !refresh) {
        return;
      }

      const currentPage = refresh ? 1 : page;

      // Build location params
      let locationParams: Record<string, string> = {};
      if (selectedLocationFilter) {
        if (selectedLocationFilter.country_code) {
          locationParams.country_code = selectedLocationFilter.country_code;
        }
        if (selectedLocationFilter.region_code) {
          locationParams.region_code = selectedLocationFilter.region_code;
        }
        if (selectedLocationFilter.district_code) {
          locationParams.district_code = selectedLocationFilter.district_code;
        }
        if (selectedLocationFilter.city_code) {
          locationParams.city_code = selectedLocationFilter.city_code;
        }
      }

      // Fetch listings with sandbox awareness
      const listingsResponse = await (isSandboxMode 
        ? sandboxAwareListingsApi.getListings({
            page: currentPage,
            limit: 20,
            category: selectedCategory || undefined,
            ...locationParams
          })
        : listingsApi.getListings({
            page: currentPage,
            limit: 20,
            category: selectedCategory || undefined,
            ...locationParams
          })
      );

      const newListings = listingsResponse?.listings || [];
      
      if (refresh) {
        setListings(newListings);
      } else {
        setListings(prev => [...prev, ...newListings]);
      }

      setHasMore(newListings.length === 20);
      if (!refresh) {
        setPage(prev => prev + 1);
      }

      // Fetch categories
      const categoriesResponse = await (isSandboxMode
        ? sandboxAwareCategoriesApi.getCategories()
        : categoriesApi.getCategories()
      );
      setCategories(categoriesResponse || []);

      // Fetch user-specific data if authenticated
      if (isAuthenticated && token) {
        try {
          const favoritesResponse = await favoritesApi.getFavorites();
          const favoriteIds = new Set((favoritesResponse || []).map((f: any) => f.listing_id || f.id));
          setFavorites(favoriteIds);
        } catch (err) {
          console.error('Failed to fetch favorites:', err);
        }

        try {
          const notificationsResponse = await notificationsApi.getUnreadCount();
          setNotificationCount(notificationsResponse?.count || 0);
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
        }

        try {
          const profileResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setCreditBalance(profileData.credits || 0);
            setUnviewedBadgeCount(profileData.unviewed_badge_count || 0);
          }
        } catch (err) {
          console.error('Failed to fetch profile:', err);
        }
      }

      setInitialLoadDone(true);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, hasMore, selectedCategory, selectedLocationFilter, isSandboxMode, isAuthenticated, token]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (listingId: string) => {
    if (!isAuthenticated) return;

    const isFavorite = favorites.has(listingId);
    
    // Optimistic update
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (isFavorite) {
        newFavorites.delete(listingId);
      } else {
        newFavorites.add(listingId);
      }
      return newFavorites;
    });

    try {
      if (isFavorite) {
        await favoritesApi.removeFavorite(listingId);
      } else {
        await favoritesApi.addFavorite(listingId);
      }
    } catch (error) {
      // Revert on error
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (isFavorite) {
          newFavorites.add(listingId);
        } else {
          newFavorites.delete(listingId);
        }
        return newFavorites;
      });
      console.error('Failed to toggle favorite:', error);
    }
  }, [isAuthenticated, favorites]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Load more
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchData(false);
    }
  }, [loading, hasMore, fetchData]);

  // Initial load
  useEffect(() => {
    loadSavedLocation();
    fetchFeaturedListings();
    loadSearchSuggestions();
  }, []);

  // Fetch data when category or location changes
  useEffect(() => {
    fetchData(true);
  }, [selectedCategory, selectedLocationFilter]);

  return {
    // Listings data
    listings,
    categories,
    loading,
    initialLoadDone,
    refreshing,
    page,
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
    handleRefresh,
    loadMore,
    toggleFavorite,
    setSelectedCategory,
    setHomeSearchQuery,
    setShowSearchSuggestions,
    handleSearchInputChange,
    handleSuggestionClick,
    clearRecentSearches,
    setSelectedLocationFilter,
    setCurrentCity,
    saveSelectedCity,
    handleClearLocationFilter,
    
    // Additional state setters for desktop location dropdown
    setPage,
    setHasMore,
    setSelectedCity,
    setExpandedSearch,
    setExpandedSearchMessage,
  };
}

export default useHomeData;
