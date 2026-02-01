import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to tabs layout which has the bottom navigation
  return <Redirect href="/(tabs)" />;
}


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
  const [location, setLocation] = useState('Berlin');

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

      if (isAuthenticated) {
        try {
          const favs = await favoritesApi.getAll();
          setFavorites(new Set(favs.map((f: Listing) => f.id)));
        } catch (e) {}
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
    <View>
      {/* Search Section */}
      <View style={styles.searchSection}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.searchPlaceholder}>Search in your area</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.locationButton}>
          <Ionicons name="location" size={16} color={theme.colors.primary} />
          <Text style={styles.locationText}>{location}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              category={cat}
              selected={selectedCategory === cat.id}
              onPress={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Gallery Header */}
      <View style={styles.galleryHeader}>
        <View style={styles.galleryTitleRow}>
          <Text style={styles.galleryTitle}>Gallery</Text>
          <Text style={styles.listingCount}>{listings.length} listings</Text>
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Ionicons name="options-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </View>
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
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => isAuthenticated ? router.push('/post/category') : router.push('/login')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={theme.colors.onPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchSection: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  categoriesSection: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  categoriesContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  galleryTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  listingCount: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation.level3,
  },
});
