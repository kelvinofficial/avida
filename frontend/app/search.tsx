import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { listingsApi, categoriesApi, favoritesApi } from '../src/utils/api';
import { useAuthStore } from '../src/store/authStore';
import { safeGoBack } from '../src/utils/navigation';
import { useResponsive } from '../src/hooks/useResponsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#2E7D32',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
};

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop } = useResponsive();
  
  const [searchQuery, setSearchQuery] = useState((params.q as string) || '');
  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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

    // Fetch favorites
    if (isAuthenticated) {
      favoritesApi.getAll().then(favs => {
        setFavorites(new Set(favs.map((f: any) => f.id)));
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    
    try {
      const response = await listingsApi.search(searchQuery.trim());
      setListings(response.listings || []);
    } catch (error) {
      console.error('Search error:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

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
    if (catId === 'vehicles') {
      return `/auto/${listing.id}`;
    }
    if (catId === 'realestate') {
      return `/property/${listing.id}`;
    }
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
      >
        <Ionicons
          name={favorites.has(item.id) ? 'heart' : 'heart-outline'}
          size={22}
          color={favorites.has(item.id) ? '#E53935' : COLORS.textSecondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const MAX_CONTENT_WIDTH = 1280;
  
  // Use Platform check for web to avoid hydration issues
  const isWeb = Platform.OS === 'web';
  const shouldApplyDesktopStyles = isDesktop && isWeb;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Wrapper - full width background */}
      <View style={styles.headerWrapper}>
        <View style={[styles.header, shouldApplyDesktopStyles && styles.desktopHeader]}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search listings..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
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

      {/* Content Wrapper - full width background */}
      <View style={styles.contentWrapper}>
        <View style={[styles.contentArea, shouldApplyDesktopStyles && styles.desktopContentArea]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : hasSearched ? (
            // Search Results
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
                  <Text style={styles.emptySubtitle}>
                    Try different keywords or browse categories
                  </Text>
                </View>
              )}
            />
          ) : (
            // Browse Categories
            <View style={styles.browseContainer}>
              <Text style={styles.sectionTitle}>Browse Categories</Text>
              <FlatList
                data={categories}
                renderItem={renderCategory}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.categoriesGrid}
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerWrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  contentArea: {
    flex: 1,
  },
  desktopHeader: {
    maxWidth: 1280,
    width: '100%',
    borderWidth: 2,
    borderColor: 'red',
  },
  desktopContentArea: {
    maxWidth: 1280,
    width: '100%',
    borderWidth: 2,
    borderColor: 'blue',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    width: '100%',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  categoriesGrid: {
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
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  listingContent: {
    flex: 1,
    marginLeft: 12,
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
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listingLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  favoriteBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
});
