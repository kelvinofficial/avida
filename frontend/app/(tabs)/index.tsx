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
  Modal,
  TextInput,
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

// Category icon constants - CIRCULAR DESIGN
const CATEGORY_ICON_SIZE = 48;
const CATEGORY_ICON_RADIUS = 24; // Full circle
const CATEGORY_INNER_ICON = 22;
const CATEGORY_GAP = 4;
const CATEGORY_ITEM_WIDTH = 80;

// ============ CATEGORY COLORS - Match Publishing Page ============
const COLORS_CATEGORY = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  surface: '#FFFFFF',
  text: '#1A1A1A',
};

// ============ CATEGORIES DATA - EXACT same as Publishing page ============
const FULL_CATEGORIES = [
  { id: 'vehicles', name: 'Auto & Vehicles', icon: 'car-outline' },
  { id: 'electronics', name: 'Electronics & Mobile', icon: 'phone-portrait-outline' },
  { id: 'realestate', name: 'Properties', icon: 'business-outline' },
  { id: 'bikes', name: 'Bicycles', icon: 'bicycle-outline' },
  { id: 'services', name: 'Services', icon: 'construct-outline' },
  { id: 'jobs', name: 'Jobs', icon: 'briefcase-outline' },
  { id: 'home', name: 'Home & Furniture', icon: 'home-outline' },
  { id: 'fashion', name: 'Fashion & Accessories', icon: 'shirt-outline' },
  { id: 'beauty', name: 'Beauty & Personal Care', icon: 'sparkles-outline' },
  { id: 'leisure', name: 'Leisure & Activities', icon: 'bicycle-outline' },
  { id: 'family', name: 'Kids & Baby', icon: 'people-outline' },
  { id: 'animals', name: 'Animals & Pets', icon: 'paw-outline' },
  { id: 'industrial', name: 'Industrial Machines', icon: 'cog-outline' },
  { id: 'agriculture', name: 'Agriculture', icon: 'leaf-outline' },
  { id: 'misc', name: 'Miscellaneous', icon: 'ellipsis-horizontal-outline' },
];

// ============ CATEGORY ICON COMPONENT - Match Publishing Page Design ============
interface CategoryIconProps {
  id: string;
  name: string;
  icon: string;
  onPress: () => void;
  selected?: boolean;
}

const CategoryIcon = memo<CategoryIconProps>(({ id, name, icon, onPress, selected }) => {
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
        selected && categoryStyles.iconContainerSelected,
      ]}>
        <Ionicons 
          name={icon as any} 
          size={28} 
          color={selected ? '#fff' : COLORS_CATEGORY.primary} 
        />
      </View>
      <Text style={[
        categoryStyles.label,
        selected && categoryStyles.labelSelected
      ]} numberOfLines={2}>
        {name}
      </Text>
    </TouchableOpacity>
  );
});

const categoryStyles = StyleSheet.create({
  item: {
    alignItems: 'center',
    width: CATEGORY_ITEM_WIDTH,
    marginBottom: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS_CATEGORY.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: COLORS_CATEGORY.primary,
  },
  label: {
    fontSize: 11,
    color: COLORS_CATEGORY.text,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
    height: 28,
  },
  labelSelected: {
    color: COLORS_CATEGORY.primary,
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
  const [currentCity, setCurrentCity] = useState('All Locations');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  // Popular cities list
  const POPULAR_CITIES = [
    { name: 'All Locations', icon: 'globe-outline' },
    { name: 'Berlin', icon: 'business-outline' },
    { name: 'Munich', icon: 'business-outline' },
    { name: 'Hamburg', icon: 'business-outline' },
    { name: 'Frankfurt', icon: 'business-outline' },
    { name: 'Cologne', icon: 'business-outline' },
    { name: 'Stuttgart', icon: 'business-outline' },
    { name: 'Düsseldorf', icon: 'business-outline' },
    { name: 'Dresden', icon: 'business-outline' },
    { name: 'Leipzig', icon: 'business-outline' },
    { name: 'Hannover', icon: 'business-outline' },
  ];

  const filteredCities = POPULAR_CITIES.filter(city => 
    city.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

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
      const locationFilter = currentCity !== 'All Locations' ? currentCity : undefined;
      const [listingsRes, categoriesRes] = await Promise.all([
        listingsApi.getAll({ 
          category: selectedCategory || undefined, 
          location: locationFilter,
          page: refresh ? 1 : page, 
          limit: 20 
        }),
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
  }, [selectedCategory, currentCity, page, isAuthenticated, fetchNotificationCount]);

  useEffect(() => { fetchData(true); }, [selectedCategory, currentCity]);

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
    // Toggle filter - if already selected, deselect to show all
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const handleLocationSelect = (city: string) => {
    setCurrentCity(city);
    setShowLocationModal(false);
    setLocationSearch('');
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
          <Text style={styles.searchPlaceholder}>Search in {currentCity === 'All Locations' ? 'all areas' : currentCity}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.locationChip} activeOpacity={0.7} onPress={() => setShowLocationModal(true)}>
          <Ionicons name="location" size={16} color="#2E7D32" />
          <Text style={styles.locationText} numberOfLines={1}>{currentCity}</Text>
          <Ionicons name="chevron-down" size={14} color="#666" />
        </TouchableOpacity>
      </View>

      {/* FULL-WIDTH DIVIDER */}
      <View style={styles.divider} />

      {/* CATEGORY ICONS - CIRCULAR DESIGN */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
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

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                value={locationSearch}
                onChangeText={setLocationSearch}
                placeholderTextColor="#999"
              />
              {locationSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLocationSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.citiesList} showsVerticalScrollIndicator={false}>
              {filteredCities.map((city) => (
                <TouchableOpacity
                  key={city.name}
                  style={[
                    styles.cityItem,
                    currentCity === city.name && styles.cityItemSelected
                  ]}
                  onPress={() => handleLocationSelect(city.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={city.icon as any} 
                    size={20} 
                    color={currentCity === city.name ? '#2E7D32' : '#666'} 
                  />
                  <Text style={[
                    styles.cityName,
                    currentCity === city.name && styles.cityNameSelected
                  ]}>
                    {city.name}
                  </Text>
                  {currentCity === city.name && (
                    <Ionicons name="checkmark" size={20} color="#2E7D32" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 8,
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 4,
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
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
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

  // LOCATION MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseBtn: {
    padding: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  citiesList: {
    paddingHorizontal: 12,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  cityItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  cityName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  cityNameSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },
});
