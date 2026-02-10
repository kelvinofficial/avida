import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Image,
  ScrollView,
  useWindowDimensions,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../src/utils/theme';
import { listingsApi, categoriesApi, favoritesApi, notificationsApi, locationsApi } from '../../src/utils/api';
import { sandboxAwareListingsApi, sandboxAwareCategoriesApi, sandboxUtils } from '../../src/utils/sandboxAwareApi';
import { Listing, Category } from '../../src/types';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';
import { useSandbox } from '../../src/utils/sandboxContext';
import { formatDistanceToNow } from 'date-fns';
import { getSubcategories, SubcategoryConfig, getMainCategory } from '../../src/config/subcategories';
import { useResponsive } from '../../src/hooks/useResponsive';
import { ResponsiveLayout, Footer } from '../../src/components/layout';
import { FeedBanner, HeaderBanner } from '../../src/components/BannerSlot';
import { useUserLocation } from '../../src/context/LocationContext';

const { width } = Dimensions.get('window');

// Storage key for recently viewed subcategories
const RECENT_SUBCATEGORIES_KEY = '@avida_recent_subcategories';

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

// ============ CATEGORIES DATA - Match backend DEFAULT_CATEGORIES ============
const FULL_CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles', icon: 'car-outline' },
  { id: 'properties', name: 'Properties', icon: 'business-outline' },
  { id: 'electronics', name: 'Electronics', icon: 'laptop-outline' },
  { id: 'phones_tablets', name: 'Phones & Tablets', icon: 'phone-portrait-outline' },
  { id: 'home_furniture', name: 'Home & Furniture', icon: 'home-outline' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty', icon: 'shirt-outline' },
  { id: 'jobs_services', name: 'Jobs & Services', icon: 'briefcase-outline' },
  { id: 'pets', name: 'Pets', icon: 'paw-outline' },
  { id: 'sports_hobbies', name: 'Sports & Hobbies', icon: 'football-outline' },
  { id: 'kids_baby', name: 'Kids & Baby', icon: 'people-outline' },
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
  userLocation?: { lat: number; lng: number } | null;
}

const ListingCard = memo<ListingCardProps>(({ listing, onPress, onFavorite, isFavorited = false, userLocation = null }) => {
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(price);

  const getTimeAgo = (date: string) => {
    try { return formatDistanceToNow(new Date(date), { addSuffix: false }); } catch { return ''; }
  };

  const isJustListed = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours < 24;
  };

  // Haversine distance calculation
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get distance from user if location data available
  const getDistance = (): string | null => {
    if (!userLocation) return null;
    const listingLat = listing.location_data?.lat;
    const listingLng = listing.location_data?.lng;
    if (!listingLat || !listingLng) return null;
    const distance = calculateDistance(userLocation.lat, userLocation.lng, listingLat, listingLng);
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${Math.round(distance)}km`;
  };

  // Get display location (city name or text location)
  const getDisplayLocation = (): string => {
    if (listing.location_data?.city_name) return listing.location_data.city_name;
    return listing.location || 'Unknown';
  };

  const distance = getDistance();

  const getImageSource = () => {
    const img = listing.images?.[0];
    if (!img) return null;
    if (img.startsWith('http') || img.startsWith('data:')) return { uri: img };
    return { uri: `data:image/jpeg;base64,${img}` };
  };

  const imageSource = getImageSource();
  const imageCount = listing.images?.length || 0;

  return (
    <TouchableOpacity style={[cardStyles.card, listing.featured && cardStyles.cardFeatured]} onPress={onPress} activeOpacity={0.95}>
      <View style={cardStyles.imageContainer}>
        {imageSource ? (
          <Image source={imageSource} style={cardStyles.image} resizeMode="cover" />
        ) : (
          <View style={cardStyles.placeholderImage}>
            <Ionicons name="image-outline" size={32} color="#CCC" />
          </View>
        )}
        {/* Badges - Just Listed, Featured & TOP */}
        <View style={cardStyles.badgesContainer}>
          {isJustListed(listing.created_at) && (
            <View style={cardStyles.justListedBadge}>
              <Ionicons name="time" size={9} color="#fff" />
              <Text style={cardStyles.badgeText}>Just Listed</Text>
            </View>
          )}
          {listing.is_featured && (
            <View style={cardStyles.featuredBadge}>
              <Ionicons name="star" size={9} color="#fff" />
              <Text style={cardStyles.badgeText}>Featured</Text>
            </View>
          )}
          {(listing.is_top || listing.featured) && (
            <View style={cardStyles.topBadge}>
              <Ionicons name="arrow-up" size={9} color="#fff" />
              <Text style={cardStyles.badgeText}>TOP</Text>
            </View>
          )}
        </View>
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
        {/* Views Counter - Bottom Right */}
        <View style={cardStyles.viewsOverlay}>
          <Ionicons name="eye-outline" size={11} color="#fff" />
          <Text style={cardStyles.viewsOverlayText}>{listing.views || 0}</Text>
        </View>
      </View>
      <View style={cardStyles.content}>
        <View style={cardStyles.locationRow}>
          <Ionicons name="location" size={11} color="#999" />
          <Text style={cardStyles.location} numberOfLines={1}>{getDisplayLocation()}</Text>
          {distance && (
            <View style={cardStyles.distanceBadge}>
              <Text style={cardStyles.distanceText}>{distance} away</Text>
            </View>
          )}
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
  cardFeatured: { borderWidth: 2, borderColor: '#2E7D32' },
  imageContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#F5F5F5' },
  image: { width: '100%', height: '100%' },
  placeholderImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  badgesContainer: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: '70%' },
  justListedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#8B5CF6', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  topBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  favoriteButton: { position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  imageCountBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  imageCountText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  viewsOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewsOverlayText: { color: '#fff', fontSize: 10, fontWeight: '600' },
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
  distanceBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  distanceText: { fontSize: 9, color: '#1976D2', fontWeight: '500' },
});

// ============ MAIN HOME SCREEN ============
export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isSandboxMode } = useSandbox();
  const { width: windowWidth } = useWindowDimensions();
  const { userLocation, nearMeEnabled, setNearMeEnabled, isLoading: locationLoading, requestLocation } = useUserLocation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [nearbyListings, setNearbyListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentCity, setCurrentCity] = useState('All Locations');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  
  // Subcategory Modal State
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [selectedCategoryForSubcats, setSelectedCategoryForSubcats] = useState<{
    id: string;
    name: string;
    icon: string;
    subcategories: SubcategoryConfig[];
  } | null>(null);
  const [subcategoryCounts, setSubcategoryCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [recentSubcategories, setRecentSubcategories] = useState<Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    subcategoryId: string;
    subcategoryName: string;
    timestamp: number;
  }>>([]);

  // Load recent subcategories from storage
  const loadRecentSubcategories = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SUBCATEGORIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Keep only last 10 and those from last 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recent = parsed
          .filter((item: any) => item.timestamp > thirtyDaysAgo)
          .slice(0, 10);
        setRecentSubcategories(recent);
      }
    } catch (error) {
      console.log('Error loading recent subcategories:', error);
    }
  }, []);

  // Save a subcategory to recent history
  const saveRecentSubcategory = useCallback(async (
    categoryId: string,
    categoryName: string,
    categoryIcon: string,
    subcategoryId: string,
    subcategoryName: string
  ) => {
    try {
      const newItem = {
        categoryId,
        categoryName,
        categoryIcon,
        subcategoryId,
        subcategoryName,
        timestamp: Date.now(),
      };
      
      // Remove duplicates and add new item at the start
      const updated = [
        newItem,
        ...recentSubcategories.filter(
          item => !(item.categoryId === categoryId && item.subcategoryId === subcategoryId)
        )
      ].slice(0, 10);
      
      setRecentSubcategories(updated);
      await AsyncStorage.setItem(RECENT_SUBCATEGORIES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.log('Error saving recent subcategory:', error);
    }
  }, [recentSubcategories]);

  // Load recent subcategories on mount
  useEffect(() => {
    loadRecentSubcategories();
  }, []);

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
      
      // Check if sandbox mode is active and use sandbox-aware API
      const sandboxActive = await sandboxUtils.isActive();
      
      let listingsRes;
      let categoriesRes;
      
      if (sandboxActive) {
        // Use sandbox proxy APIs
        [listingsRes, categoriesRes] = await Promise.all([
          sandboxAwareListingsApi.getAll({ 
            category: selectedCategory || undefined, 
            location: locationFilter,
            page: refresh ? 1 : page, 
            limit: 20 
          }),
          sandboxAwareCategoriesApi.getAll(),
        ]);
      } else {
        // Use normal production APIs
        [listingsRes, categoriesRes] = await Promise.all([
          listingsApi.getAll({ 
            category: selectedCategory || undefined, 
            location: locationFilter,
            page: refresh ? 1 : page, 
            limit: 20 
          }),
          categoriesApi.getAll(),
        ]);
      }
      
      if (refresh) { setListings(listingsRes.listings || listingsRes); }
      else { setListings((prev) => [...prev, ...(listingsRes.listings || listingsRes)]); }
      setHasMore(listingsRes.page < listingsRes.pages);
      setCategories(categoriesRes);
      if (isAuthenticated && !sandboxActive) {
        try { const favs = await favoritesApi.getAll(); setFavorites(new Set(favs.map((f: Listing) => f.id))); } catch (e) {}
        // Also refresh notification count on data refresh
        fetchNotificationCount();
      }
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); setRefreshing(false); setInitialLoadDone(true); }
  }, [selectedCategory, currentCity, page, isAuthenticated, fetchNotificationCount]);

  useEffect(() => { fetchData(true); }, [selectedCategory, currentCity]);

  // Fetch nearby listings when Near Me is enabled and user has location
  useEffect(() => {
    const fetchNearbyListings = async () => {
      if (!nearMeEnabled || !userLocation) return;
      
      try {
        const nearby = await locationsApi.getNearby(
          userLocation.lat,
          userLocation.lng,
          50, // radius in km
          20, // limit
          1,  // page
          selectedCategory || undefined
        );
        setNearbyListings(nearby.listings || []);
      } catch (error) {
        console.error('Error fetching nearby listings:', error);
        setNearbyListings([]);
      }
    };

    fetchNearbyListings();
  }, [nearMeEnabled, userLocation, selectedCategory]);

  // Handle Near Me toggle
  const handleNearMeToggle = async () => {
    if (!nearMeEnabled) {
      // Request location when enabling
      const location = await requestLocation();
      if (location) {
        setNearMeEnabled(true);
      }
    } else {
      setNearMeEnabled(false);
    }
  };

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

  const handleCategoryPress = async (categoryId: string) => {
    // On desktop/tablet, navigate directly to category page
    if (isDesktop || isTablet) {
      router.push(`/category/${categoryId}`);
      return;
    }
    
    // On mobile, show subcategory selection modal
    const category = FULL_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    const subcategories = getSubcategories(categoryId);
    
    // Show subcategory selection modal
    setSelectedCategoryForSubcats({
      id: categoryId,
      name: category.name,
      icon: category.icon,
      subcategories: subcategories,
    });
    setShowSubcategoryModal(true);
    
    // Fetch subcategory counts in background
    setLoadingCounts(true);
    try {
      const counts = await categoriesApi.getSubcategoryCounts(categoryId);
      setSubcategoryCounts(counts);
    } catch (error) {
      console.log('Error fetching subcategory counts:', error);
      setSubcategoryCounts({});
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleSubcategorySelect = async (categoryId: string, subcategoryId?: string) => {
    setShowSubcategoryModal(false);
    
    // Save to recent if a specific subcategory is selected
    if (subcategoryId && selectedCategoryForSubcats) {
      const subcategory = selectedCategoryForSubcats.subcategories.find(s => s.id === subcategoryId);
      if (subcategory) {
        await saveRecentSubcategory(
          categoryId,
          selectedCategoryForSubcats.name,
          selectedCategoryForSubcats.icon,
          subcategoryId,
          subcategory.name
        );
      }
    }
    
    if (subcategoryId) {
      // Navigate to category page with subcategory pre-selected
      router.push(`/category/${categoryId}?subcategory=${subcategoryId}`);
    } else {
      // View all in category
      router.push(`/category/${categoryId}`);
    }
  };

  const handleRecentSubcategoryPress = (item: typeof recentSubcategories[0]) => {
    setShowSubcategoryModal(false);
    router.push(`/category/${item.categoryId}?subcategory=${item.subcategoryId}`);
  };

  const handleCategoryLongPress = (categoryId: string) => {
    // Long press to filter in place (quick filter)
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
        {/* Near Me Toggle Button */}
        <TouchableOpacity 
          style={[styles.nearMeChip, nearMeEnabled && styles.nearMeChipActive]}
          activeOpacity={0.7}
          onPress={handleNearMeToggle}
          data-testid="near-me-toggle"
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={nearMeEnabled ? "#fff" : "#1976D2"} />
          ) : (
            <>
              <Ionicons name="navigate" size={14} color={nearMeEnabled ? "#fff" : "#1976D2"} />
              <Text style={[styles.nearMeText, nearMeEnabled && styles.nearMeTextActive]}>
                Near Me
              </Text>
            </>
          )}
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
          {nearMeEnabled ? 'Near Me' : (selectedCategory ? FULL_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Listings' : 'Recent Listings')}
        </Text>
        {(selectedCategory || nearMeEnabled) && (
          <TouchableOpacity onPress={() => { setSelectedCategory(null); setNearMeEnabled(false); }}>
            <Text style={styles.clearFilter}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Calculate dynamic columns based on screen size
  const { isMobile, isTablet, isDesktop, width: screenWidth } = useResponsive();
  
  // Max content width for desktop
  const MAX_WIDTH = 1280;
  const effectiveWidth = isDesktop ? Math.min(screenWidth, MAX_WIDTH) : screenWidth;
  
  // Calculate columns: 2 for mobile, 3 for tablet, 4-5 for desktop
  const getColumns = () => {
    if (isMobile) return 2;
    if (isTablet) return 3;
    return 4;
  };
  
  const columns = getColumns();
  const gridPadding = isDesktop ? 24 : isTablet ? 20 : HORIZONTAL_PADDING;
  const gridGap = isDesktop ? 20 : isTablet ? 16 : COLUMN_GAP;
  const dynamicCardWidth = Math.floor((effectiveWidth - gridPadding * 2 - gridGap * (columns - 1)) / columns);

  // Render listings as grid manually - responsive columns with banner injection
  const renderGrid = () => {
    // Don't show empty state until initial load is complete
    if (!initialLoadDone) {
      return null;
    }
    
    // Determine which listings to display
    const displayedListings = nearMeEnabled && nearbyListings.length > 0 ? nearbyListings : listings;
    
    // Show empty state only when initial load is done and no listings
    if (displayedListings.length === 0) {
      return <EmptyState icon="pricetags-outline" title={nearMeEnabled ? "No listings nearby" : "No listings yet"} description={nearMeEnabled ? "Try increasing the search radius or check back later!" : "Be the first to post an ad in your area!"} />;
    }
    
    // Create rows based on column count
    const rows: (Listing[] | { type: 'banner'; position: number })[] = [];
    const BANNER_INTERVAL = 5; // Show banner after every 5 rows (10-20 listings depending on columns)
    
    let rowCount = 0;
    for (let i = 0; i < displayedListings.length; i += columns) {
      rows.push(displayedListings.slice(i, i + columns));
      rowCount++;
      
      // Inject banner after every BANNER_INTERVAL rows
      if (rowCount % BANNER_INTERVAL === 0 && i + columns < displayedListings.length) {
        rows.push({ type: 'banner', position: rowCount * columns });
      }
    }
    
    return (
      <View style={[
        (isDesktop || isTablet) && { paddingHorizontal: gridPadding, maxWidth: MAX_WIDTH, alignSelf: 'center', width: '100%' }
      ]}>
        {rows.map((row, rowIndex) => {
          // Check if this is a banner row
          if ('type' in row && row.type === 'banner') {
            return (
              <FeedBanner 
                key={`banner-${row.position}`}
                position={row.position}
                category={selectedCategory || undefined}
              />
            );
          }
          
          // Regular listing row
          return (
            <View key={rowIndex} style={[styles.gridRow, { gap: gridGap }]}>
              {(row as Listing[]).map((item) => (
                <View key={item.id} style={[styles.cardWrapper, { width: dynamicCardWidth }]}>
                  <ListingCard
                    listing={item}
                    onPress={() => router.push(`/listing/${item.id}`)}
                    onFavorite={() => toggleFavorite(item.id)}
                    isFavorited={favorites.has(item.id)}
                    userLocation={userLocation}
                  />
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  // Desktop header with different layout
  const renderDesktopHeader = () => (
    <View style={desktopStyles.headerWrapper}>
      {/* Row 1: Logo + Auth + Post Listing */}
      <View style={desktopStyles.headerRow1}>
        <View style={desktopStyles.headerRow1Inner}>
          <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
            <View style={desktopStyles.logoIcon}>
              <Ionicons name="storefront" size={22} color="#fff" />
            </View>
            <Text style={desktopStyles.logoText}>avida</Text>
          </TouchableOpacity>
          
          <View style={desktopStyles.headerActions}>
            {isAuthenticated ? (
              <>
                <TouchableOpacity style={desktopStyles.notifBtn} onPress={() => router.push('/notifications')}>
                  <Ionicons name="notifications-outline" size={22} color="#333" />
                  {notificationCount > 0 && (
                    <View style={desktopStyles.notifBadge}>
                      <Text style={desktopStyles.notifBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={desktopStyles.profileBtn} onPress={() => router.push('/profile')}>
                  <Ionicons name="person-circle-outline" size={28} color="#333" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={desktopStyles.signInBtn} onPress={() => router.push('/login')}>
                  <Text style={desktopStyles.signInBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={desktopStyles.signUpBtn} onPress={() => router.push('/login')}>
                  <Text style={desktopStyles.signUpBtnText}>Sign Up</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={desktopStyles.postListingBtn} onPress={() => {
              if (!isAuthenticated) {
                router.push('/login?redirect=/post');
              } else {
                router.push('/post');
              }
            }}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={desktopStyles.postListingBtnText}>Post Listing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Row 2: Search + Location */}
      <View style={desktopStyles.headerRow2}>
        <View style={desktopStyles.headerRow2Inner}>
          <TouchableOpacity style={desktopStyles.searchField} onPress={() => router.push('/search')} activeOpacity={0.8}>
            <Ionicons name="search" size={20} color="#666" />
            <Text style={desktopStyles.searchPlaceholder}>Search for anything...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={desktopStyles.locationChip} activeOpacity={0.7} onPress={() => setShowLocationModal(true)}>
            <Ionicons name="location" size={18} color="#2E7D32" />
            <Text style={desktopStyles.locationText} numberOfLines={1}>{currentCity}</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 3: Category Icons */}
      <View style={desktopStyles.categoryRowWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={desktopStyles.categoryScroll}
          contentContainerStyle={desktopStyles.categoryContent}
        >
          <TouchableOpacity
            style={[desktopStyles.categoryPill, !selectedCategory && desktopStyles.categoryPillActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons name="apps" size={16} color={!selectedCategory ? '#fff' : '#666'} />
            <Text style={[desktopStyles.categoryPillText, !selectedCategory && desktopStyles.categoryPillTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {FULL_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[desktopStyles.categoryPill, selectedCategory === cat.id && desktopStyles.categoryPillActive]}
              onPress={() => handleCategoryPress(cat.id)}
            >
              <Ionicons 
                name={cat.icon as any} 
                size={16} 
                color={selectedCategory === cat.id ? '#fff' : '#666'} 
              />
              <Text style={[desktopStyles.categoryPillText, selectedCategory === cat.id && desktopStyles.categoryPillTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Section Title */}
      <View style={desktopStyles.sectionHeaderWrapper}>
        <View style={desktopStyles.sectionHeader}>
          <Text style={desktopStyles.sectionTitle}>
            {selectedCategory ? FULL_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Listings' : 'Recent Listings'}
          </Text>
          <Text style={desktopStyles.listingCount}>{(nearMeEnabled && nearbyListings.length > 0 ? nearbyListings : listings).length} items</Text>
        </View>
      </View>
    </View>
  );

  const mainContent = (
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
      style={isDesktop || isTablet ? { flex: 1 } : undefined}
    >
      {/* Content wrapper with light background */}
      <View style={(isDesktop || isTablet) ? { backgroundColor: '#F5F5F5' } : undefined}>
        {isDesktop || isTablet ? renderDesktopHeader() : renderHeader()}
        <View style={[styles.listContent, (isDesktop || isTablet) && { paddingHorizontal: 0, alignItems: 'center' }]}>
          {renderGrid()}
        </View>
      </View>
      {/* Footer for Desktop & Tablet */}
      {(isDesktop || isTablet) && <Footer isTablet={isTablet && !isDesktop} />}
    </ScrollView>
  );

  return (
    <ResponsiveLayout showSidebar={false}>
      <SafeAreaView style={styles.container} edges={isMobile ? ['top'] : []}>
        {mainContent}

        {/* Location Picker Modal */}
        <Modal
          visible={showLocationModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowLocationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, (isDesktop || isTablet) && { maxWidth: 500, alignSelf: 'center' }]}>
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

      {/* Subcategory Selection Modal */}
      <Modal
        visible={showSubcategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubcategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subcategoryModalContent}>
            {/* Modal Header */}
            <View style={styles.subcategoryModalHeader}>
              <View style={styles.subcategoryHeaderLeft}>
                {selectedCategoryForSubcats?.icon && (
                  <View style={styles.subcategoryHeaderIcon}>
                    <Ionicons 
                      name={selectedCategoryForSubcats.icon as any} 
                      size={24} 
                      color="#2E7D32" 
                    />
                  </View>
                )}
                <Text style={styles.subcategoryModalTitle}>
                  {selectedCategoryForSubcats?.name}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowSubcategoryModal(false)} 
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* View All Option */}
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => handleSubcategorySelect(selectedCategoryForSubcats?.id || '', undefined)}
              activeOpacity={0.7}
            >
              <View style={styles.viewAllContent}>
                <Ionicons name="grid-outline" size={20} color="#2E7D32" />
                <Text style={styles.viewAllText}>View All {selectedCategoryForSubcats?.name}</Text>
              </View>
              <View style={styles.viewAllRight}>
                {loadingCounts ? (
                  <ActivityIndicator size="small" color="#2E7D32" />
                ) : (
                  <Text style={styles.viewAllCount}>{subcategoryCounts._total || 0}</Text>
                )}
                <Ionicons name="chevron-forward" size={20} color="#2E7D32" />
              </View>
            </TouchableOpacity>

            {/* Recently Viewed Section - Only show for current category */}
            {(() => {
              const recentForThisCategory = recentSubcategories.filter(
                item => item.categoryId === selectedCategoryForSubcats?.id
              );
              if (recentForThisCategory.length === 0) return null;
              return (
                <>
                  <View style={styles.subcategoryDivider}>
                    <Ionicons name="time-outline" size={14} color="#999" style={{ marginRight: 6 }} />
                    <Text style={styles.subcategoryDividerText}>Recently viewed</Text>
                  </View>
                  <View style={styles.recentSubcategoriesRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScrollContent}>
                      {recentForThisCategory.slice(0, 5).map((item, index) => (
                        <TouchableOpacity
                          key={`${item.categoryId}-${item.subcategoryId}-${index}`}
                          style={styles.recentChip}
                          onPress={() => handleRecentSubcategoryPress(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.recentChipText} numberOfLines={1}>{item.subcategoryName}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              );
            })()}

            {/* Divider */}
            <View style={styles.subcategoryDivider}>
              <Text style={styles.subcategoryDividerText}>All subcategories</Text>
            </View>

            {/* Subcategories List */}
            <ScrollView 
              style={styles.subcategoriesList} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.subcategoriesListContent}
            >
              {selectedCategoryForSubcats?.subcategories.map((subcat, index) => (
                <TouchableOpacity
                  key={subcat.id}
                  style={[
                    styles.subcategoryItem,
                    index === (selectedCategoryForSubcats?.subcategories.length || 0) - 1 && styles.subcategoryItemLast
                  ]}
                  onPress={() => handleSubcategorySelect(selectedCategoryForSubcats?.id || '', subcat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.subcategoryItemText}>{subcat.name}</Text>
                  <View style={styles.subcategoryItemRight}>
                    {loadingCounts ? (
                      <View style={styles.countPlaceholder} />
                    ) : subcategoryCounts[subcat.id] !== undefined && subcategoryCounts[subcat.id] > 0 ? (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{subcategoryCounts[subcat.id]}</Text>
                      </View>
                    ) : null}
                    <Ionicons name="chevron-forward" size={18} color="#999" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </ResponsiveLayout>
  );
}

// Desktop/Tablet specific styles
const MAX_CONTENT_WIDTH = 1280;

const desktopStyles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  // Row 1: Logo + Auth + Post Listing
  headerRow1: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  headerRow1Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  signInBtnText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  signUpBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  signUpBtnText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileBtn: {
    padding: 4,
  },
  postListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  postListingBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  // Row 2: Search + Location
  headerRow2: {
    alignItems: 'center',
  },
  headerRow2Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  nearMeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginLeft: 8,
  },
  nearMeChipActive: {
    backgroundColor: '#1976D2',
  },
  nearMeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  nearMeTextActive: {
    color: '#fff',
  },
  // Row 3: Category Icons
  categoryRowWrapper: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryScroll: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  categoryContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryPillActive: {
    backgroundColor: '#2E7D32',
  },
  categoryPillText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  sectionHeaderWrapper: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  listingCount: {
    fontSize: 14,
    color: '#666',
  },
});

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

  // SUBCATEGORY MODAL
  subcategoryModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 40,
  },
  subcategoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  subcategoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subcategoryHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subcategoryModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  subcategoryDivider: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  subcategoryDividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subcategoriesList: {
    flex: 1,
  },
  subcategoriesListContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 16,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  subcategoryItemLast: {
    borderBottomWidth: 0,
  },
  subcategoryItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  subcategoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 26,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  countPlaceholder: {
    width: 26,
    height: 18,
  },
  viewAllRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewAllCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },

  // Recently viewed section
  recentSubcategoriesRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentScrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0E8D0',
    gap: 4,
    marginRight: 6,
  },
  recentChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2E7D32',
    maxWidth: 100,
  },
});
