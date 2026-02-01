import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../src/utils/theme';
import { listingsApi, categoriesApi, favoritesApi } from '../../src/utils/api';
import { Listing, Category } from '../../src/types';
import { ListingCard } from '../../src/components/ListingCard';
import { CategoryChip } from '../../src/components/CategoryChip';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
        setHasMore(true);
      }

      const [listingsRes, categoriesRes] = await Promise.all([
        listingsApi.getAll({
          category: selectedCategory || undefined,
          page: refresh ? 1 : page,
          limit: 20,
        }),
        categoriesApi.getAll(),
      ]);

      if (refresh) {
        setListings(listingsRes.listings);
      } else {
        setListings((prev) => [...prev, ...listingsRes.listings]);
      }
      setHasMore(listingsRes.page < listingsRes.pages);
      setCategories(categoriesRes);

      // Fetch favorites if authenticated
      if (isAuthenticated) {
        try {
          const favs = await favoritesApi.getAll();
          setFavorites(new Set(favs.map((f: Listing) => f.id)));
        } catch (e) {
          // Ignore favorites error
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, page, isAuthenticated]);

  useEffect(() => {
    fetchData(true);
  }, [selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
      fetchData();
    }
  };

  const toggleFavorite = async (listingId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      if (favorites.has(listingId)) {
        await favoritesApi.remove(listingId);
        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(listingId);
          return newSet;
        });
      } else {
        await favoritesApi.add(listingId);
        setFavorites((prev) => new Set(prev).add(listingId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.appName}>LocalMarket</Text>
          <Text style={styles.tagline}>Buy & Sell Nearby</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => isAuthenticated ? router.push('/messages') : router.push('/login')}
        >
          <Ionicons name="notifications-outline" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => router.push('/search')}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} />
        <Text style={styles.searchPlaceholder}>Search for anything...</Text>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        <TouchableOpacity
          style={[
            styles.allCategoryChip,
            !selectedCategory && styles.allCategoryChipSelected,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Ionicons
            name="apps"
            size={18}
            color={!selectedCategory ? theme.colors.onPrimary : theme.colors.primary}
          />
          <Text
            style={[
              styles.allCategoryText,
              !selectedCategory && styles.allCategoryTextSelected,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            category={cat}
            selected={selectedCategory === cat.id}
            onPress={() => {
              // Navigate to dedicated Auto page for vehicles category
              if (cat.id === 'vehicles') {
                router.push('/auto');
              } else {
                setSelectedCategory(cat.id === selectedCategory ? null : cat.id);
              }
            }}
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderItem = ({ item, index }: { item: Listing; index: number }) => (
    <View style={[styles.cardWrapper, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}>
      <ListingCard
        listing={item}
        onPress={() => router.push(`/listing/${item.id}`)}
        onFavorite={() => toggleFavorite(item.id)}
        isFavorited={favorites.has(item.id)}
      />
    </View>
  );

  if (loading && listings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={listings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="pricetags-outline"
            title="No listings yet"
            description="Be the first to post an ad in your area!"
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && listings.length > 0 ? (
            <ActivityIndicator style={styles.footer} color={theme.colors.primary} />
          ) : null
        }
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
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...theme.elevation.level1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  tagline: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  categoriesContainer: {
    paddingRight: theme.spacing.md,
  },
  allCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  allCategoryChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  allCategoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  allCategoryTextSelected: {
    color: theme.colors.onPrimary,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: theme.spacing.lg,
  },
});
