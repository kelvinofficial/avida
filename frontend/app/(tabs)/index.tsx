import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../src/utils/theme';
import { listingsApi, categoriesApi, favoritesApi, notificationsApi } from '../../src/utils/api';
import { Listing, Category } from '../../src/types';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');

// ============ LAYOUT CONSTANTS - Material 3 ============
const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 12;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 0.9;
const BORDER_RADIUS = 12;

// Header constants
const ROW_1_HEIGHT = 52;
const ICON_SIZE = 24;
const TOUCH_TARGET = 48;

// Category icon constants - ROUNDED SQUARES
const CATEGORY_ICON_SIZE = 64;
const CATEGORY_ICON_RADIUS = 16;
const CATEGORY_INNER_ICON = 28;
const CATEGORY_GAP = 12;

// Calculate how many categories fit in view (4 visible)
const VISIBLE_CATEGORIES = 4;
const CATEGORY_ITEM_WIDTH = (width - HORIZONTAL_PADDING * 2 - CATEGORY_GAP * (VISIBLE_CATEGORIES - 1)) / VISIBLE_CATEGORIES;

// ============ CATEGORY COLORS ============
const CATEGORY_STYLES: Record<string, { bg: string; icon: string }> = {
  vehicles: { bg: '#E3F2FD', icon: '#1565C0' },
  electronics: { bg: '#F3E5F5', icon: '#7B1FA2' },
  fashion: { bg: '#FCE4EC', icon: '#C2185B' },
  home: { bg: '#E8F5E9', icon: '#2E7D32' },
  sports: { bg: '#FFF3E0', icon: '#EF6C00' },
  jobs: { bg: '#E0F7FA', icon: '#00838F' },
  services: { bg: '#FFF8E1', icon: '#FF8F00' },
  kids: { bg: '#FFEBEE', icon: '#C62828' },
  pets: { bg: '#F1F8E9', icon: '#558B2F' },
  property: { bg: '#E8EAF6', icon: '#3949AB' },
  mobile: { bg: '#EDE7F6', icon: '#5E35B1' },
  bikes: { bg: '#E0F2F1', icon: '#00695C' },
  beauty: { bg: '#FBE9E7', icon: '#D84315' },
  industrial: { bg: '#ECEFF1', icon: '#455A64' },
  default: { bg: '#F5F5F5', icon: '#616161' },
};

// ============ CATEGORIES DATA ============
const FULL_CATEGORIES = [
  { id: 'vehicles', name: 'Auto', icon: 'car-sport' },
  { id: 'mobile', name: 'Mobile', icon: 'phone-portrait' },
  { id: 'property', name: 'Property', icon: 'home' },
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
  { id: 'industrial', name: 'Industry', icon: 'cog' },
];

// ============ CATEGORY ICON COMPONENT - ROUNDED SQUARE ============
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
        categoryStyles.iconContainer,
        { backgroundColor: style.bg },
        selected && categoryStyles.iconContainerSelected
      ]}>
        <Ionicons name={icon as any} size={CATEGORY_INNER_ICON} color={style.icon} />
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
    width: CATEGORY_ITEM_WIDTH,
  },
  iconContainer: {
    width: CATEGORY_ICON_SIZE,
    height: CATEGORY_ICON_SIZE,
    borderRadius: CATEGORY_ICON_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    // Slight shadow for selected state
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontSize: 12,
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
  card: { width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: BORDER_RADIUS, overflow: 'hidden' },
  image: { width: '100%', height: CARD_IMAGE_HEIGHT, backgroundColor: '#F0F0F0' },
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
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(price);

  const getTimeAgo = (date: string) => {
    try { return formatDistanceToNow(new Date(date), { addSuffix: false }); } catch { return ''; }
  };

  const getImageSource = () => {
    const img = listing.images?.[0];
    if (!img) return null;
    if (img.startsWith('http') || img.startsWith('data:')) return { uri: img };
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
          <View style={cardStyles.topBadge}><Text style={cardStyles.topBadgeText}>TOP</Text></View>
        )}
        {onFavorite && (
          <TouchableOpacity style={cardStyles.favoriteButton} onPress={(e) => { e.stopPropagation(); onFavorite(); }}>
            <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={20} color={isFavorited ? '#E91E63' : '#fff'} />
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
  card: { width: '100%', backgroundColor: '#fff', borderRadius: BORDER_RADIUS, overflow: 'hidden' },
  imageContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#F5F5F5' },
  image: { width: '100%', height: '100%' },
  placeholderImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  topBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#FF9800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  topBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  favoriteButton: { position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  imageCountBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  imageCountText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  content: { padding: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  location: { fontSize: 11, color: '#999', flex: 1 },
  title: { fontSize: 13, fontWeight: '500', color: '#333', lineHeight: 17, marginBottom: 6, height: 34 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  negotiable: { fontSize: 10, color: '#2E7D32', fontWeight: '600', backgroundColor: '#E8F5E9', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 10, color: '#999' },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  views: { fontSize: 10, color: '#999' },
});

// ============ MAIN HOME SCREEN ============
export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentCity] = useState('Berlin');

  // Fetch unread notification count
  const fetchNotificationCount = useCallback(async () => {
    if (!isAuthenticated) {
      setNotificationCount(0);
      return;
    }
    try {
      const response = await notificationsApi.getUnreadCount();
      setNotificationCount(response.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
      setNotificationCount(0);
    }
  }, [isAuthenticated]);

  // Refresh notification count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNotificationCount();
    }, [fetchNotificationCount])
  );

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) { setPage(1); setHasMore(true); }
      const [listingsRes, categoriesRes] = await Promise.all([
        listingsApi.getAll({ category: selectedCategory || undefined, page: refresh ? 1 : page, limit: 20 }),
        categoriesApi.getAll(),
      ]);
      if (refresh) { setListings(listingsRes.listings); }
      else { setListings((prev) => [...prev, ...listingsRes.listings]); }
      setHasMore(listingsRes.page < listingsRes.pages);
      setCategories(categoriesRes);
      if (isAuthenticated) {
        try { const favs = await favoritesApi.getAll(); setFavorites(new Set(favs.map((f: Listing) => f.id))); } catch (e) {}
        // Also refresh notification count on data refresh
        fetchNotificationCount();
      }
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedCategory, page, isAuthenticated, fetchNotificationCount]);

  useEffect(() => { fetchData(true); }, [selectedCategory]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, [fetchData]);

  const loadMore = () => { if (!loading && hasMore) { setPage((prev) => prev + 1); fetchData(); } };

  const toggleFavorite = async (listingId: string) => {
    if (!isAuthenticated) { router.push('/login'); return; }
    try {
      if (favorites.has(listingId)) {
        await favoritesApi.remove(listingId);
        setFavorites((prev) => { const newSet = new Set(prev); newSet.delete(listingId); return newSet; });
      } else {
        await favoritesApi.add(listingId);
        setFavorites((prev) => new Set(prev).add(listingId));
      }
    } catch (error) { console.error('Error toggling favorite:', error); }
  };

  const handleCategoryPress = (categoryId: string) => {
    // Navigate to category page with filter
    router.push(`/category/${categoryId}`);
  };

  // ============ HEADER COMPONENT ============
  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      {/* ROW 1: BRAND + NOTIFICATIONS */}
      <View style={styles.row1}>
        <Text style={styles.logo}>avida</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={ICON_SIZE} color="#333" />
          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ROW 2: SEARCH + LOCATION */}
      <View style={styles.row2}>
        <TouchableOpacity style={styles.searchField} onPress={() => router.push('/search')} activeOpacity={0.8}>
          <Ionicons name="search" size={20} color="#666" />
          <Text style={styles.searchPlaceholder}>Search in your area</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.locationChip} activeOpacity={0.7}>
          <Ionicons name="location" size={16} color="#2E7D32" />
          <Text style={styles.locationText} numberOfLines={1}>{currentCity}</Text>
          <Ionicons name="chevron-down" size={14} color="#666" />
        </TouchableOpacity>
      </View>

      {/* FULL-WIDTH DIVIDER */}
      <View style={styles.divider} />

      {/* CATEGORY ICONS - ROUNDED SQUARES */}
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

      {/* SECTION TITLE */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedCategory ? FULL_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Listings' : 'Recent Listings'}
        </Text>
        {selectedCategory && (
          <TouchableOpacity onPress={() => setSelectedCategory(null)}>
            <Text style={styles.clearFilter}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Calculate card width dynamically
  const dynamicCardWidth = Math.floor((windowWidth - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2);

  // Render listings as grid manually - using row pairs for guaranteed 2-column layout
  const renderGrid = () => {
    if (listings.length === 0) {
      return <EmptyState icon="pricetags-outline" title="No listings yet" description="Be the first to post an ad in your area!" />;
    }
    
    // Create pairs of listings for 2-column layout
    const rows = [];
    for (let i = 0; i < listings.length; i += 2) {
      rows.push(listings.slice(i, i + 2));
    }
    
    return (
      <View>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((item) => (
              <View key={item.id} style={[styles.cardWrapper, { width: dynamicCardWidth }]}>
                <ListingCard
                  listing={item}
                  onPress={() => router.push(`/listing/${item.id}`)}
                  onFavorite={() => toggleFavorite(item.id)}
                  isFavorited={favorites.has(item.id)}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (isCloseToBottom && !loading && hasMore) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {renderHeader()}
        <View style={styles.listContent}>
          {renderGrid()}
          {loading && listings.length > 0 && <ActivityIndicator style={styles.footer} color="#2E7D32" />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // ========== HEADER (NO BOX, PLAIN SURFACE) ==========
  headerWrapper: {
    backgroundColor: '#fff',
    // NO border radius, NO margin - spans full width edge to edge
    marginHorizontal: 0,
    borderRadius: 0,
  },

  // ROW 1
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ROW_1_HEIGHT,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  logo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: -0.5,
  },
  notificationButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
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

  // ROW 2
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 12,
    gap: 10,
  },
  searchField: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 12,
    gap: 4,
    minWidth: 96, // Minimum width to prevent aggressive truncation
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  // DIVIDER - Full width
  divider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginHorizontal: 0, // Edge to edge
  },

  // CATEGORIES
  categoriesSection: {
    paddingTop: 16,
  },
  categoriesContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: CATEGORY_GAP,
  },

  // SECTION HEADER
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  clearFilter: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },

  // LISTINGS GRID
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    marginBottom: 12,
  },

  // SKELETON
  skeletonGrid: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  // FOOTER
  footer: {
    paddingVertical: 20,
  },
});
