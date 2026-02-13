import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Keyboard,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { listingsApi, categoriesApi, favoritesApi } from '../src/utils/api';
import api from '../src/utils/api';
import { useAuthStore } from '../src/store/authStore';
import { safeGoBack } from '../src/utils/navigation';
import { useResponsive } from '../src/hooks/useResponsive';
import { DesktopHeader } from '../src/components/layout/DesktopHeader';
import { DesktopPageLayout } from '../src/components/layout/DesktopPageLayout';
import { Footer } from '../src/components/layout/Footer';

const COLORS = {
  primary: '#2E7D32',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
};

// Image Placeholder Component - displays when listing has no images
const ImagePlaceholder: React.FC<{ 
  size?: 'small' | 'medium' | 'large';
  style?: any;
}> = ({ size = 'medium', style }) => {
  const iconSize = size === 'small' ? 24 : size === 'large' ? 48 : 32;
  
  return (
    <View style={[placeholderStyles.container, style]}>
      <View style={placeholderStyles.iconWrapper}>
        <Ionicons name="image-outline" size={iconSize} color="#B0BEC5" />
      </View>
      <Text style={placeholderStyles.text}>No image</Text>
    </View>
  );
};

const placeholderStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E4E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  text: {
    fontSize: 11,
    color: '#90A4AE',
    fontWeight: '500',
  },
});

const MAX_WIDTH = 1280;

// Search Stats Card Component
interface SearchStats {
  recentSearches: string[];
  popularSearches: { query: string; count: number }[];
  savedSearchesCount: number;
}

const SearchStatsCard: React.FC<{ 
  stats: SearchStats; 
  onSearchClick: (query: string) => void;
  onClearRecent: () => void;
}> = ({ stats, onSearchClick, onClearRecent }) => {
  return (
    <View style={statsStyles.container}>
      <Text style={statsStyles.title}>Search Stats</Text>
      
      {/* Recent Searches */}
      {stats.recentSearches.length > 0 && (
        <View style={statsStyles.section}>
          <View style={statsStyles.sectionHeader}>
            <View style={statsStyles.sectionTitleRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
              <Text style={statsStyles.sectionTitle}>Recent</Text>
            </View>
            <TouchableOpacity onPress={onClearRecent}>
              <Text style={statsStyles.clearBtn}>Clear</Text>
            </TouchableOpacity>
          </View>
          {stats.recentSearches.slice(0, 5).map((query, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={statsStyles.searchItem}
              onPress={() => onSearchClick(query)}
            >
              <Ionicons name="search-outline" size={14} color={COLORS.textSecondary} />
              <Text style={statsStyles.searchText} numberOfLines={1}>{query}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Popular Searches */}
      {stats.popularSearches.length > 0 && (
        <View style={statsStyles.section}>
          <View style={statsStyles.sectionTitleRow}>
            <Ionicons name="trending-up" size={16} color="#F57C00" />
            <Text style={statsStyles.sectionTitle}>Trending</Text>
          </View>
          {stats.popularSearches.slice(0, 5).map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={statsStyles.searchItem}
              onPress={() => onSearchClick(item.query)}
            >
              <Text style={statsStyles.rankBadge}>{idx + 1}</Text>
              <Text style={statsStyles.searchText} numberOfLines={1}>{item.query}</Text>
              <Text style={statsStyles.countText}>{item.count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={statsStyles.quickActions}>
        <TouchableOpacity style={statsStyles.actionBtn}>
          <View style={[statsStyles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="bookmark" size={16} color={COLORS.primary} />
          </View>
          <Text style={statsStyles.actionText}>Saved Searches</Text>
          {stats.savedSearchesCount > 0 && (
            <View style={statsStyles.badge}>
              <Text style={statsStyles.badgeText}>{stats.savedSearchesCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const statsStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearBtn: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  rankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  countText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quickActions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  // Ref to track the last query that was searched (prevents duplicate searches)
  const initialSearchHandled = useRef<string>('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Search stats state
  const [searchStats, setSearchStats] = useState<SearchStats>({
    recentSearches: [],
    popularSearches: [],
    savedSearchesCount: 0,
  });

  // Load recent searches from localStorage
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const stored = localStorage.getItem('recent_searches');
        if (stored) {
          setSearchStats(prev => ({ ...prev, recentSearches: JSON.parse(stored) }));
        }
      } catch (e) {}
    }
  }, []);

  // Fetch popular searches
  useEffect(() => {
    const fetchPopularSearches = async () => {
      try {
        const res = await api.get('/searches/popular?limit=5');
        if (res.data?.global_searches) {
          setSearchStats(prev => ({ 
            ...prev, 
            popularSearches: res.data.global_searches 
          }));
        }
      } catch (e) {
        console.log('Could not fetch popular searches');
      }
    };
    fetchPopularSearches();
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await categoriesApi.getAll();
        setCategories(cats);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();

    if (isAuthenticated) {
      favoritesApi.getAll().then(favs => {
        setFavorites(new Set(favs.map((f: any) => f.id)));
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  // Save to recent searches
  const saveRecentSearch = (query: string) => {
    if (Platform.OS === 'web' && query.trim()) {
      try {
        const stored = localStorage.getItem('recent_searches');
        let recent = stored ? JSON.parse(stored) : [];
        recent = [query, ...recent.filter((q: string) => q !== query)].slice(0, 10);
        localStorage.setItem('recent_searches', JSON.stringify(recent));
        setSearchStats(prev => ({ ...prev, recentSearches: recent }));
      } catch (e) {}
    }
  };

  const clearRecentSearches = () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('recent_searches');
      setSearchStats(prev => ({ ...prev, recentSearches: [] }));
    }
  };

  const handleSearch = useCallback(async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;
    
    if (query) setSearchQuery(query);
    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    
    try {
      // Track the search
      api.post('/searches/track', { query: searchTerm.trim().toLowerCase() }).catch(() => {});
      
      const response = await listingsApi.search(searchTerm.trim());
      setListings(response.listings || []);
      saveRecentSearch(searchTerm.trim());
    } catch (error) {
      console.error('Search error:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Auto-search using useFocusEffect - triggers when screen comes into focus
  // This handles both client-side navigation and direct URL access
  useFocusEffect(
    useCallback(() => {
      // Get query from URL (works reliably on web)
      let queryFromUrl = '';
      
      // On web, always check window.location.search directly
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlQuery = urlParams.get('q');
        if (urlQuery && urlQuery.trim()) {
          queryFromUrl = urlQuery.trim();
        }
      }
      
      // Also try expo-router params as fallback
      if (!queryFromUrl) {
        const paramQuery = params.q as string;
        if (paramQuery && paramQuery.trim()) {
          queryFromUrl = paramQuery.trim();
        }
      }
      
      console.log('[Search Page] useFocusEffect - query:', queryFromUrl, 'lastHandled:', initialSearchHandled.current);
      
      // Execute search if we have a query and it's different from what we already handled
      if (queryFromUrl && initialSearchHandled.current !== queryFromUrl) {
        initialSearchHandled.current = queryFromUrl;
        setSearchQuery(queryFromUrl);
        setHasSearched(true);
        setLoading(true);
        
        console.log('[Search Page] Executing auto-search for:', queryFromUrl);
        
        // Execute search
        const executeSearch = async () => {
          try {
            api.post('/searches/track', { query: queryFromUrl.toLowerCase() }).catch(() => {});
            const response = await listingsApi.search(queryFromUrl);
            console.log('[Search Page] Search results received:', response?.listings?.length || 0);
            setListings(response.listings || []);
            saveRecentSearch(queryFromUrl);
          } catch (error) {
            console.error('[Search Page] Search error:', error);
            setListings([]);
          } finally {
            setLoading(false);
          }
        };
        
        executeSearch();
      }
    }, [params.q])
  );

  // Web-specific: Listen for URL changes using History API
  // This is needed because Expo Router may not properly trigger effects on client-side navigation
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    
    const checkAndExecuteSearch = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const queryFromUrl = urlParams.get('q')?.trim() || '';
      
      console.log('[Search Page] URL check - query:', queryFromUrl, 'lastHandled:', initialSearchHandled.current);
      
      if (queryFromUrl && initialSearchHandled.current !== queryFromUrl) {
        initialSearchHandled.current = queryFromUrl;
        setSearchQuery(queryFromUrl);
        setHasSearched(true);
        setLoading(true);
        
        console.log('[Search Page] URL change detected - executing search for:', queryFromUrl);
        
        const executeSearch = async () => {
          try {
            api.post('/searches/track', { query: queryFromUrl.toLowerCase() }).catch(() => {});
            const response = await listingsApi.search(queryFromUrl);
            console.log('[Search Page] Search results received:', response?.listings?.length || 0);
            setListings(response.listings || []);
            saveRecentSearch(queryFromUrl);
          } catch (error) {
            console.error('[Search Page] Search error:', error);
            setListings([]);
          } finally {
            setLoading(false);
          }
        };
        
        executeSearch();
      }
    };
    
    // Check on mount and also run after a short delay (for SSR hydration)
    checkAndExecuteSearch();
    const timer = setTimeout(checkAndExecuteSearch, 200);
    
    // Listen for popstate (browser back/forward) and custom navigation events
    const handleNavigation = () => {
      setTimeout(checkAndExecuteSearch, 50);
    };
    
    window.addEventListener('popstate', handleNavigation);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/category/${categoryId}`);
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

  const getListingRoute = (listing: any) => {
    const catId = listing.category_id;
    if (catId === 'vehicles' && listing.attributes?.bike_type) {
      return `/listing/${listing.id}`;
    }
    if (catId === 'vehicles') return `/auto/${listing.id}`;
    if (catId === 'realestate') return `/property/${listing.id}`;
    return `/listing/${listing.id}`;
  };

  const formatPrice = (price: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderCategory = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item.id)}
      data-testid={`category-${item.id}`}
    >
      <View style={styles.categoryIcon}>
        <Ionicons name={item.icon as any} size={24} color={COLORS.primary} />
      </View>
      <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderListing = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() => router.push(getListingRoute(item))}
      data-testid={`listing-${item.id}`}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }}
        style={styles.listingImage}
      />
      <View style={styles.listingContent}>
        <Text style={styles.listingPrice}>{formatPrice(item.price, item.currency)}</Text>
        <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.listingLocation} numberOfLines={1}>{item.location}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.favoriteBtn}
        onPress={() => handleFavorite(item.id)}
        data-testid={`favorite-${item.id}`}
      >
        <Ionicons
          name={favorites.has(item.id) ? 'heart' : 'heart-outline'}
          size={22}
          color={favorites.has(item.id) ? '#E53935' : COLORS.textSecondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Desktop Layout
  if (isLargeScreen) {
    return (
      <View style={styles.desktopContainer}>
        <DesktopHeader showNavLinks showSearch={false} showLocationSelector={true} />
        
        <ScrollView 
          style={styles.desktopScrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.desktopScrollContent}
        >
          <View style={styles.desktopContent}>
            <View style={styles.desktopInner}>
              {/* Sidebar */}
              <View style={styles.sidebar}>
                <SearchStatsCard 
                  stats={searchStats} 
                  onSearchClick={(q) => handleSearch(q)}
                  onClearRecent={clearRecentSearches}
                />
                
                {/* Categories Quick Access */}
                <View style={styles.sidebarCard}>
                  <Text style={styles.sidebarCardTitle}>Categories</Text>
                  <View style={styles.categoryList}>
                    {categories.slice(0, 8).map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.categoryListItem}
                        onPress={() => handleCategoryPress(cat.id)}
                      >
                        <View style={styles.categoryListIcon}>
                          <Ionicons name={cat.icon as any} size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.categoryListText}>{cat.name}</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Main Content */}
              <View style={styles.mainContent}>
                {/* Search Header */}
                <View style={styles.searchHeader}>
                  <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={22} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search for anything..."
                      placeholderTextColor={COLORS.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onSubmitEditing={() => handleSearch()}
                      returnKeyType="search"
                      autoFocus={!params.q}
                      data-testid="search-input"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.searchBtn}
                      onPress={() => handleSearch()}
                      data-testid="search-button"
                    >
                      <Text style={styles.searchBtnText}>Search</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Results/Browse Area */}
                <View style={styles.resultsArea}>
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={COLORS.primary} />
                      <Text style={styles.loadingText}>Searching...</Text>
                    </View>
                  ) : hasSearched ? (
                    <View style={styles.resultsContainer}>
                      <Text style={styles.resultsText}>
                        {listings.length} {listings.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                      </Text>
                      {listings.length === 0 ? (
                        <View style={styles.emptyState}>
                          <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
                          <Text style={styles.emptyTitle}>No results found</Text>
                          <Text style={styles.emptySubtitle}>Try different keywords or browse categories</Text>
                        </View>
                      ) : (
                        <View style={styles.listingsContainer}>
                          {listings.map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              style={styles.horizontalCard}
                              onPress={() => router.push(getListingRoute(item))}
                              data-testid={`listing-${item.id}`}
                            >
                              {/* Image on Left */}
                              <View style={styles.cardImageWrapper}>
                                <Image
                                  source={{ uri: item.images?.[0] || 'https://via.placeholder.com/180' }}
                                  style={styles.cardImage}
                                />
                              </View>
                              
                              {/* Content on Right */}
                              <View style={styles.cardContentWrapper}>
                                <View style={styles.cardPriceRow}>
                                  <Text style={styles.cardPrice}>{formatPrice(item.price, item.currency)}</Text>
                                  {item.negotiable && (
                                    <View style={styles.negotiableBadge}>
                                      <Text style={styles.negotiableText}>Negotiable</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                                <Text style={styles.cardDescription} numberOfLines={2}>
                                  {item.description || 'No description provided'}
                                </Text>
                                <View style={styles.cardMeta}>
                                  <View style={styles.metaItem}>
                                    <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                                    <Text style={styles.metaText}>{item.location || 'Unknown'}</Text>
                                  </View>
                                  <View style={styles.metaItem}>
                                    <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                                    <Text style={styles.metaText}>
                                      {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                  </View>
                                  {item.condition && (
                                    <View style={styles.conditionBadge}>
                                      <Text style={styles.conditionText}>{item.condition}</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              
                              {/* Favorite Button */}
                              <TouchableOpacity
                                style={styles.horizontalFavoriteBtn}
                                onPress={() => handleFavorite(item.id)}
                                data-testid={`favorite-${item.id}`}
                              >
                                <Ionicons
                                  name={favorites.has(item.id) ? 'heart' : 'heart-outline'}
                                  size={22}
                                  color={favorites.has(item.id) ? '#E53935' : COLORS.textSecondary}
                                />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.browseTitle}>Browse Categories</Text>
                      <View style={styles.categoriesGrid}>
                        {categories.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={styles.categoryCardLarge}
                            onPress={() => handleCategoryPress(cat.id)}
                          >
                            <View style={styles.categoryIconLarge}>
                              <Ionicons name={cat.icon as any} size={32} color={COLORS.primary} />
                            </View>
                            <Text style={styles.categoryNameLarge}>{cat.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Footer inside scroll view */}
          <Footer isTablet={isTablet && !isDesktop} />
        </ScrollView>
      </View>
    );
  }

  // Mobile Layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.mobileSearchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.mobileSearchInput}
              placeholder="Search listings..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              autoFocus={!params.q}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.contentWrapper}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : hasSearched ? (
          <FlatList
            data={listings}
            renderItem={renderListing}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={() => (
              <Text style={styles.resultsText}>
                {listings.length} {listings.length === 1 ? 'result' : 'results'} for "{searchQuery}"
              </Text>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>Try different keywords or browse categories</Text>
              </View>
            )}
          />
        ) : (
          <View style={styles.browseContainer}>
            <Text style={styles.sectionTitle}>Browse Categories</Text>
            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.categoriesGridMobile}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Desktop styles
  desktopContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopScrollContent: {
    flexGrow: 1,
  },
  desktopContent: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: 600,
  },
  desktopInner: {
    flexDirection: 'row',
    maxWidth: MAX_WIDTH,
    width: '100%',
    paddingHorizontal: 24,
    gap: 24,
  },
  sidebar: {
    width: 280,
  },
  sidebarCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sidebarCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  categoryList: {},
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryListIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryListText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  mainContent: {
    flex: 1,
  },
  searchHeader: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    outlineStyle: 'none',
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  resultsArea: {
    minHeight: 400,
  },
  resultsContainer: {
    paddingBottom: 24,
  },
  resultsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  browseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  categoryCardLarge: {
    width: 140,
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryNameLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: 'calc(50% - 8px)',
  },
  // Horizontal card layout styles
  listingsContainer: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    padding: 16,
    gap: 16,
    width: '100%',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cardImageWrapper: {
    width: 180,
    height: 140,
    flexShrink: 0,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  cardContentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  negotiableBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  negotiableText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  conditionBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  conditionText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  horizontalFavoriteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  
  // Mobile styles
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerWrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  mobileSearchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  browseContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  categoriesGridMobile: {
    paddingBottom: 20,
  },
  categoryCard: {
    flex: 1,
    minWidth: 100,
    maxWidth: 150,
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryName: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listingImage: {
    width: 120,
    height: 100,
    backgroundColor: COLORS.background,
  },
  listingContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listingLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
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
    textAlign: 'center',
    marginTop: 8,
  },
});
