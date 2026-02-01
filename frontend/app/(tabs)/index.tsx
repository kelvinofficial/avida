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
  ScrollView,
  Platform,
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

// Layout constants - Material 3 compliant
const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 12;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 0.9;
const BORDER_RADIUS = 12;
const ROW_1_HEIGHT = 56; // Material TopAppBar small
const ROW_2_HEIGHT = 48;
const ICON_SIZE = 24;
const TOUCH_TARGET = 48;

// Category colors - soft pastel palette (Material 3)
const CATEGORY_STYLES: Record<string, { bg: string; icon: string }> = {
  vehicles: { bg: '#E3F2FD', icon: '#1976D2' },
  electronics: { bg: '#F3E5F5', icon: '#7B1FA2' },
  fashion: { bg: '#FCE4EC', icon: '#C2185B' },
  home: { bg: '#E8F5E9', icon: '#388E3C' },
  sports: { bg: '#FFF3E0', icon: '#F57C00' },
  jobs: { bg: '#E0F7FA', icon: '#0097A7' },
  services: { bg: '#FFF8E1', icon: '#FFA000' },
  kids: { bg: '#FFEBEE', icon: '#D32F2F' },
  pets: { bg: '#F1F8E9', icon: '#689F38' },
  property: { bg: '#E8EAF6', icon: '#3F51B5' },
  mobile: { bg: '#EDE7F6', icon: '#512DA8' },
  bikes: { bg: '#E0F2F1', icon: '#00796B' },
  beauty: { bg: '#FBE9E7', icon: '#E64A19' },
  industrial: { bg: '#ECEFF1', icon: '#546E7A' },
  default: { bg: '#F5F5F5', icon: '#757575' },
};

// Extended categories
const FULL_CATEGORIES = [
  { id: 'vehicles', name: 'Auto', icon: 'car-sport' },
  { id: 'mobile', name: 'Mobile', icon: 'phone-portrait' },
  { id: 'property', name: 'Properties', icon: 'home' },
  { id: 'electronics', name: 'Electronics', icon: 'laptop' },
  { id: 'bikes', name: 'Bikes', icon: 'bicycle' },
  { id: 'services', name: 'Services', icon: 'construct' },
  { id: 'jobs', name: 'Jobs', icon: 'briefcase' },
  { id: 'home', name: 'Furniture', icon: 'bed' },
  { id: 'fashion', name: 'Fashion', icon: 'shirt' },
  { id: 'beauty', name: 'Beauty', icon: 'sparkles' },
  { id: 'sports', name: 'Leisure', icon: 'football' },
  { id: 'kids', name: 'Kids', icon: 'happy' },
  { id: 'pets', name: 'Animals', icon: 'paw' },
  { id: 'industrial', name: 'Industrial', icon: 'cog' },
];

// ============ CATEGORY ICON COMPONENT ============
interface CategoryIconProps {
  id: string;
  name: string;
  icon: string;
  onPress: () => void;
  selected?: boolean;
}

const CategoryIcon = memo<CategoryIconProps>(({ id, name, icon, onPress, selected }) => {
  const style = CATEGORY_STYLES[id] || CATEGORY_STYLES.default;
  
  return (
    <TouchableOpacity 
      style={categoryStyles.item} 
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${name} category`}
      accessibilityRole="button"
    >
      <View style={[
        categoryStyles.iconCircle, 
        { backgroundColor: style.bg },
        selected && categoryStyles.iconCircleSelected
      ]}>
        <Ionicons name={icon as any} size={22} color={style.icon} />
      </View>
      <Text style={[
        categoryStyles.label,
        selected && categoryStyles.labelSelected
      ]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
});

const categoryStyles = StyleSheet.create({
  item: {
    alignItems: 'center',
    width: 68,
    marginRight: 8,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconCircleSelected: {
    transform: [{ scale: 1.08 }],
  },
  label: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  labelSelected: {
    color: '#333',
    fontWeight: '600',
  },
});

// ============ SKELETON LOADER ============
const SkeletonCard = memo(() => (
  <View style={skeletonStyles.card}>
    <View style={skeletonStyles.image} />
    <View style={skeletonStyles.content}>
      <View style={skeletonStyles.location} />
      <View style={skeletonStyles.title} />
      <View style={skeletonStyles.price} />
    </View>
  </View>
));

const skeletonStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: '#F0F0F0',
  },
  content: { padding: 12 },
  location: { width: '50%', height: 10, backgroundColor: '#F0F0F0', borderRadius: 4, marginBottom: 8 },
  title: { width: '80%', height: 14, backgroundColor: '#F0F0F0', borderRadius: 4, marginBottom: 8 },
  price: { width: '40%', height: 16, backgroundColor: '#F0F0F0', borderRadius: 4 },
});

// ============ LISTING CARD ============
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
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={cardStyles.imageContainer}>
        {imageSource ? (
          <Image source={imageSource} style={cardStyles.image} resizeMode="cover" />
        ) : (
          <View style={cardStyles.placeholderImage}>
            <Ionicons name="image-outline" size={32} color="#CCC" />
          </View>
        )}

        {listing.featured && (
          <View style={cardStyles.topBadge}>
            <Text style={cardStyles.topBadgeText}>TOP</Text>
          </View>
        )}

        {onFavorite && (
          <TouchableOpacity
            style={cardStyles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            accessibilityLabel={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorited ? '#E91E63' : '#fff'}
            />
          </TouchableOpacity>
        )}

        {imageCount > 1 && (
          <View style={cardStyles.imageCountBadge}>
            <Ionicons name="camera" size={11} color="#fff" />
            <Text style={cardStyles.imageCountText}>{imageCount}</Text>
          </View>
        )}
      </View>

      <View style={cardStyles.content}>
        <View style={cardStyles.locationRow}>
          <Ionicons name="location" size={11} color="#999" />
          <Text style={cardStyles.location} numberOfLines={1}>{listing.location}</Text>
        </View>
        <Text style={cardStyles.title} numberOfLines={2}>{listing.title}</Text>
        <View style={cardStyles.priceRow}>
          <Text style={cardStyles.price}>{formatPrice(listing.price)}</Text>
          {listing.negotiable && <Text style={cardStyles.negotiable}>VB</Text>}
        </View>
        <View style={cardStyles.metaRow}>
          <Text style={cardStyles.time}>{getTimeAgo(listing.created_at)}</Text>
          <View style={cardStyles.viewsRow}>
            <Ionicons name="eye-outline" size={11} color="#999" />
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
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: '#F5F5F5',
  },
  image: { width: '100%', height: '100%' },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  topBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  topBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  imageCountText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  content: { padding: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  location: { fontSize: 11, color: '#999', flex: 1 },
  title: { fontSize: 13, fontWeight: '500', color: '#333', lineHeight: 17, marginBottom: 6, height: 34 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  negotiable: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '600',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 10, color: '#999' },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  views: { fontSize: 10, color: '#999' },
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
  const [notificationCount] = useState(3);
  const [currentCity] = useState('Berlin');

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

  const handleCategoryPress = (categoryId: string) => {
    if (categoryId === 'vehicles') {
      router.push('/auto');
    } else {
      setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    }
  };

  // Get truncated city name for small screens
  const getTruncatedCity = (city: string) => {
    return width < 375 ? city.substring(0, 3) : city;
  };

  // ========== HEADER COMPONENT (2 ROWS) ============
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* ========== ROW 1: BRAND + NOTIFICATIONS ========== */}
      <View style={styles.row1}>
        {/* Logo - Left aligned */}
        <Text style={styles.logo}>avida</Text>
        
        {/* Spacer */}
        <View style={{ flex: 1 }} />
        
        {/* Notification Bell - Right aligned */}
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => isAuthenticated ? router.push('/messages') : router.push('/login')}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          accessibilityHint={`You have ${notificationCount} notifications`}
        >
          <Ionicons name="notifications-outline" size={ICON_SIZE} color="#333" />
          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ========== ROW 2: SEARCH + LOCATION ========== */}
      <View style={styles.row2}>
        {/* Search Field - Takes most space */}
        <TouchableOpacity
          style={styles.searchField}
          onPress={() => router.push('/search')}
          activeOpacity={0.8}
          accessibilityLabel="Search for items"
          accessibilityRole="search"
        >
          <Ionicons name="search" size={20} color="#666" />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Search in your area
          </Text>
        </TouchableOpacity>

        {/* Location Chip */}
        <TouchableOpacity
          style={styles.locationChip}
          activeOpacity={0.7}
          accessibilityLabel="Change location"
          accessibilityRole="button"
        >
          <Ionicons name="location" size={16} color="#2E7D32" />
          <Text style={styles.locationText} numberOfLines={1}>
            {getTruncatedCity(currentCity)}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Soft divider */}
      <View style={styles.headerDivider} />

      {/* ========== CATEGORY ICONS ROW ========== */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {FULL_CATEGORIES.map((cat) => (
            <CategoryIcon
              key={cat.id}
              id={cat.id}
              name={cat.name}
              icon={cat.icon}
              selected={selectedCategory === cat.id}
              onPress={() => handleCategoryPress(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ========== SECTION HEADER ========== */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedCategory 
            ? FULL_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Listings'
            : 'Recent Listings'}
        </Text>
        {selectedCategory && (
          <TouchableOpacity 
            onPress={() => setSelectedCategory(null)}
            accessibilityLabel="Clear category filter"
          >
            <Text style={styles.clearFilter}>Clear</Text>
          </TouchableOpacity>
        )}
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
        key="grid-two-columns"
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
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#2E7D32']}
            tintColor="#2E7D32"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && listings.length > 0 ? (
            <ActivityIndicator style={styles.footer} color="#2E7D32" />
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
    backgroundColor: '#F5F5F5',
  },
  
  // ========== HEADER CONTAINER ==========
  headerContainer: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },

  // ========== ROW 1: BRAND + NOTIFICATIONS ==========
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_1_HEIGHT,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: -0.5,
  },
  row1Spacer: {
    flex: 1,
  },
  notificationButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // ========== ROW 2: SEARCH + LOCATION ==========
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_2_HEIGHT,
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 10,
  },
  searchField: {
    flex: 0.68, // 68% width
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#888',
  },
  locationChip: {
    flex: 0.32, // 32% width
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 10,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    maxWidth: 60,
  },

  // ========== HEADER DIVIDER ==========
  headerDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 12,
  },

  // ========== CATEGORIES ==========
  categoriesSection: {
    marginTop: 12,
  },
  categoriesContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 8,
  },

  // ========== SECTION HEADER ==========
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  clearFilter: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },

  // ========== LISTING GRID ==========
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 100,
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

  // ========== SKELETON ==========
  skeletonGrid: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  // ========== FOOTER ==========
  footer: {
    paddingVertical: 20,
  },
});
