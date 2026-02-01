import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../src/utils/theme';
import { listingsApi, categoriesApi, favoritesApi } from '../../src/utils/api';
import { Listing, Category } from '../../src/types';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');

// Layout constants following Material Design
const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 12;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;
const CARD_IMAGE_HEIGHT = CARD_WIDTH; // 1:1 aspect ratio
const BORDER_RADIUS = 12;
const CHIP_HEIGHT = 40;
const SEARCH_BAR_HEIGHT = 48;

// ============ SKELETON LOADER ============
const SkeletonCard = memo(() => (
  <View style={skeletonStyles.card}>
    <View style={skeletonStyles.image} />
    <View style={skeletonStyles.content}>
      <View style={skeletonStyles.location} />
      <View style={skeletonStyles.title} />
      <View style={skeletonStyles.price} />
      <View style={skeletonStyles.footer}>
        <View style={skeletonStyles.time} />
        <View style={skeletonStyles.views} />
      </View>
    </View>
  </View>
));

const skeletonStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: theme.colors.surfaceVariant,
  },
  content: {
    padding: 12,
  },
  location: {
    width: '60%',
    height: 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
    marginBottom: 8,
  },
  title: {
    width: '90%',
    height: 14,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
    marginBottom: 8,
  },
  price: {
    width: '50%',
    height: 18,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    width: '30%',
    height: 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
  },
  views: {
    width: '20%',
    height: 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
  },
});

// ============ LISTING CARD COMPONENT ============
interface ListingCardProps {
  listing: Listing;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
}

const ListingCard = memo<ListingCardProps>(({ listing, onPress, onFavorite, isFavorited = false }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false });
    } catch {
      return '';
    }
  };

  // Handle image source - check if it's a URL or base64
  const getImageSource = () => {
    const img = listing.images?.[0];
    if (!img) return null;
    if (img.startsWith('http')) return { uri: img };
    if (img.startsWith('data:')) return { uri: img };
    return { uri: `data:image/jpeg;base64,${img}` };
  };

  const imageSource = getImageSource();
  const imageCount = listing.images?.length || 0;

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image Container - 1:1 Aspect Ratio */}
      <View style={cardStyles.imageContainer}>
        {imageSource ? (
          <Image source={imageSource} style={cardStyles.image} resizeMode="cover" />
        ) : (
          <View style={cardStyles.placeholderImage}>
            <Ionicons name="image-outline" size={32} color={theme.colors.outline} />
          </View>
        )}

        {/* TOP Badge - Top Left */}
        {listing.featured && (
          <View style={cardStyles.topBadge}>
            <Text style={cardStyles.topBadgeText}>TOP</Text>
          </View>
        )}

        {/* Favorite Button - Top Right (40dp touch target) */}
        {onFavorite && (
          <TouchableOpacity
            style={cardStyles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorited ? theme.colors.error : '#fff'}
            />
          </TouchableOpacity>
        )}

        {/* Photo Count Badge - Bottom Left */}
        {imageCount > 1 && (
          <View style={cardStyles.imageCountBadge}>
            <Ionicons name="camera" size={12} color="#fff" />
            <Text style={cardStyles.imageCountText}>{imageCount}</Text>
          </View>
        )}
      </View>

      {/* Content Area */}
      <View style={cardStyles.content}>
        {/* Location Row */}
        <View style={cardStyles.locationRow}>
          <Ionicons name="location" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={cardStyles.location} numberOfLines={1}>
            {listing.location}
          </Text>
        </View>

        {/* Title - Max 2 lines with ellipsis */}
        <Text style={cardStyles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        {/* Price Row */}
        <View style={cardStyles.priceRow}>
          <Text style={cardStyles.price}>{formatPrice(listing.price)}</Text>
          {listing.negotiable && (
            <View style={cardStyles.negotiableBadge}>
              <Text style={cardStyles.negotiableText}>VB</Text>
            </View>
          )}
        </View>

        {/* Meta Row - Time left, Views right */}
        <View style={cardStyles.metaRow}>
          <Text style={cardStyles.time}>{getTimeAgo(listing.created_at)}</Text>
          <View style={cardStyles.viewsRow}>
            <Ionicons name="eye-outline" size={12} color={theme.colors.onSurfaceVariant} />
            <Text style={cardStyles.views}>{listing.views || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const cardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: theme.colors.surfaceVariant,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
  },
  topBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  topBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.onSurface,
    lineHeight: 18,
    marginBottom: 6,
    height: 36, // Fixed height for 2 lines
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  negotiableBadge: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  negotiableText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  views: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
});

// ============ CATEGORY CHIP COMPONENT ============
interface CategoryChipProps {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}

const CategoryChip = memo<CategoryChipProps>(({ name, icon, selected, onPress }) => (
  <TouchableOpacity
    style={[chipStyles.chip, selected && chipStyles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons
      name={icon as any}
      size={18}
      color={selected ? '#fff' : theme.colors.primary}
    />
    <Text style={[chipStyles.label, selected && chipStyles.labelSelected]} numberOfLines={1}>
      {name}
    </Text>
  </TouchableOpacity>
));

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: CHIP_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderRadius: CHIP_HEIGHT / 2,
    paddingHorizontal: 16,
    marginRight: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  labelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});

// ============ MAIN HOME SCREEN ============
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

  // ============ HEADER COMPONENT ============
  const renderHeader = () => (
    <View style={styles.header}>
      {/* App Bar - Logo left, Bell right, vertically centered */}
      <View style={styles.appBar}>
        <Text style={styles.appName}>LocalMarket</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => isAuthenticated ? router.push('/messages') : router.push('/login')}
        >
          <Ionicons name="notifications-outline" size={22} color={theme.colors.onSurface} />
          {/* Optional notification badge */}
          {/* <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>3</Text></View> */}
        </TouchableOpacity>
      </View>

      {/* Search Bar - Full width, rounded, 48dp height */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => router.push('/search')}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} />
        <Text style={styles.searchPlaceholder}>Search for anything...</Text>
      </TouchableOpacity>

      {/* Category Chips - Horizontal scrollable */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          data={[{ id: 'all', name: 'All', icon: 'apps' }, ...categories]}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item }) => (
            <CategoryChip
              id={item.id}
              name={item.name.split('&')[0].trim()}
              icon={item.icon || 'apps'}
              selected={item.id === 'all' ? !selectedCategory : selectedCategory === item.id}
              onPress={() => {
                if (item.id === 'vehicles') {
                  router.push('/auto');
                } else {
                  setSelectedCategory(item.id === 'all' ? null : item.id);
                }
              }}
            />
          )}
        />
      </View>
    </View>
  );

  // ============ RENDER ITEM ============
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

  // ============ LOADING STATE ============
  if (loading && listings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.skeletonGrid}>
          <View style={styles.skeletonRow}>
            <SkeletonCard />
            <View style={{ width: COLUMN_GAP }} />
            <SkeletonCard />
          </View>
          <View style={styles.skeletonRow}>
            <SkeletonCard />
            <View style={{ width: COLUMN_GAP }} />
            <SkeletonCard />
          </View>
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
        columnWrapperStyle={styles.columnWrapper}
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
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={6}
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
    backgroundColor: theme.colors.surface,
    paddingBottom: 12,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    height: 56,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: SEARCH_BAR_HEIGHT / 2,
    height: SEARCH_BAR_HEIGHT,
    marginHorizontal: HORIZONTAL_PADDING,
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
  },
  categoriesWrapper: {
    marginTop: 12,
  },
  categoriesContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 100, // Space for bottom nav
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  cardLeft: {
    marginRight: COLUMN_GAP / 2,
  },
  cardRight: {
    marginLeft: COLUMN_GAP / 2,
  },
  skeletonGrid: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  footer: {
    paddingVertical: 20,
  },
});
