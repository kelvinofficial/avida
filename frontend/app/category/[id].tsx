import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { listingsApi, categoriesApi, favoritesApi } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { safeGoBack } from '../../src/utils/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#2E7D32',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#D32F2F',
};

// ============ LISTING CARD ============
interface ListingCardProps {
  listing: any;
  onPress: () => void;
  onFavorite: () => void;
  isFavorited?: boolean;
}

const ListingCard = memo<ListingCardProps>(({ listing, onPress, onFavorite, isFavorited = false }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: listing.currency || 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: listing.images?.[0] || 'https://via.placeholder.com/300x200' }}
          style={styles.image}
          resizeMode="cover"
        />
        {listing.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>TOP</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => { e.stopPropagation(); onFavorite(); }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorited ? '#E53935' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.price}>{formatPrice(listing.price)}</Text>
        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.location} numberOfLines={1}>{listing.location}</Text>
        </View>
        {listing.seller_verified && (
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-shield" size={14} color={COLORS.primary} />
            <Text style={styles.verifiedText}>Verified Seller</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ============ MAIN SCREEN ============
export default function CategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isAuthenticated } = useAuthStore();
  
  const [listings, setListings] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const categoryId = id as string;

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
        setHasMore(true);
      }

      const currentPage = refresh ? 1 : page;
      
      // Fetch category info and listings in parallel
      const [listingsRes, categoriesRes] = await Promise.all([
        listingsApi.getAll({ category: categoryId, page: currentPage, limit: 20 }),
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
        } catch (e) {
          console.log('Could not fetch favorites');
        }
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, page, isAuthenticated]);

  useEffect(() => {
    fetchData(true);
  }, [categoryId]);

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

  const renderListingCard = ({ item }: { item: any }) => (
    <ListingCard
      listing={item}
      onPress={() => router.push(getListingRoute(item))}
      onFavorite={() => handleFavorite(item.id)}
      isFavorited={favorites.has(item.id)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No listings found</Text>
      <Text style={styles.emptySubtitle}>
        There are no listings in this category yet.
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {category?.icon && (
            <Ionicons name={category.icon as any} size={20} color={COLORS.primary} />
          )}
          <Text style={styles.headerTitle}>{category?.name || categoryId}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/search')} style={styles.searchButton}>
          <Ionicons name="search" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>{total} listings found</Text>
      </View>

      {/* Listings Grid */}
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
        showsVerticalScrollIndicator={false}
      />
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
  resultsBar: {
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
  card: {
    width: (SCREEN_WIDTH - 32) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  verifiedText: {
    fontSize: 11,
    color: COLORS.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
