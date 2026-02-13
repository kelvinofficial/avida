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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Storage } from '../../src/utils/storage';
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
import { ResponsiveLayout, Footer, DesktopHeader } from '../../src/components/layout';
import { FeedBanner, HeaderBanner } from '../../src/components/BannerSlot';
import { LocationPicker, LocationData } from '../../src/components/LocationPicker';

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
  { id: 'kids_baby', name: 'Kids & Baby', icon: 'people-outline' },
  { id: 'sports_hobbies', name: 'Sports & Hobbies', icon: 'football-outline' },
  { id: 'pets', name: 'Pets', icon: 'paw-outline' },
  { id: 'agriculture', name: 'Agriculture & Food', icon: 'leaf-outline' },
  { id: 'commercial_equipment', name: 'Commercial Equipment', icon: 'construct-outline' },
  { id: 'repair_construction', name: 'Repair & Construction', icon: 'hammer-outline' },
  { id: 'friendship_dating', name: 'Friendship & Dating', icon: 'heart-outline' },
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
  // Determine if this is an auto or property category
  const isAutoOrProperty = listing.category_id === 'auto_vehicles' || listing.category_id === 'properties';
  
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
      <View style={[cardStyles.imageContainer, !isAutoOrProperty && cardStyles.compactImageContainer]}>
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
        {/* Negotiable Badge - Bottom Right of Image */}
        {listing.negotiable && (
          <View style={cardStyles.negotiableBadge}>
            <Text style={cardStyles.negotiableText}>Negotiable</Text>
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
        </View>
        <View style={cardStyles.metaRow}>
          <Text style={cardStyles.time}>{getTimeAgo(listing.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const cardStyles = StyleSheet.create({
  card: { width: '100%', backgroundColor: '#fff', borderRadius: BORDER_RADIUS, overflow: 'hidden' },
  cardFeatured: { borderWidth: 2, borderColor: '#2E7D32' },
  imageContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#F5F5F5' },
  compactImageContainer: { aspectRatio: 1.25 },
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
  negotiableBadge: { position: 'absolute', bottom: 30, right: 8, backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  negotiableText: { fontSize: 10, color: '#2E7D32', fontWeight: '600' },
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
  listingId: { fontSize: 9, color: '#999', fontFamily: 'monospace' },
});

// ============ MAIN HOME SCREEN ============
export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isSandboxMode } = useSandbox();
  const { width: windowWidth } = useWindowDimensions();
  
  // Location state - MANDATORY SELECTION, NO GPS
  const [selectedCity, setSelectedCity] = useState<{
    country_code: string;
    country_name: string;
    region_code: string;
    region_name: string;
    district_code?: string;
    district_name?: string;
    city_code: string;
    city_name: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [includeNearbyCities, setIncludeNearbyCities] = useState(true);
  const [searchRadius, setSearchRadius] = useState(50);
  const [expandedSearch, setExpandedSearch] = useState(false);
  const [expandedSearchMessage, setExpandedSearchMessage] = useState<string | null>(null);
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [unviewedBadgeCount, setUnviewedBadgeCount] = useState(0);
  const [currentCity, setCurrentCity] = useState('Select Location');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<{
    recent: string[];
    trending: { query: string; count: number }[];
  }>({ recent: [], trending: [] });
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<{
    country_code?: string;
    region_code?: string;
    district_code?: string;
    city_code?: string;
    city_name?: string;
    location_text?: string;
  } | null>(null);
  
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

  // Featured Sellers State
  interface FeaturedSeller {
    id: string;
    business_name: string;
    identifier: string;
    logo_url: string | null;
    city: string | null;
    country: string | null;
    is_verified: boolean;
    is_premium: boolean;
    verification_tier: string;
    total_listings: number;
    total_views: number;
    primary_categories: string[];
    user?: {
      name: string;
      picture: string | null;
      rating?: number;
      total_ratings?: number;
    };
  }
  
  // Desktop Location Dropdown State
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationDropdownStep, setLocationDropdownStep] = useState<'countries' | 'regions'>('countries');
  const [locationCountries, setLocationCountries] = useState<Array<{ code: string; name: string; flag: string }>>([]);
  const [locationRegions, setLocationRegions] = useState<Array<{ country_code: string; region_code: string; name: string; lat?: number; lng?: number }>>([]);
  const [selectedCountryForDropdown, setSelectedCountryForDropdown] = useState<{ code: string; name: string; flag: string } | null>(null);
  const [locationDropdownLoading, setLocationDropdownLoading] = useState(false);
  
  interface FeaturedListing {
    id: string;
    title: string;
    price: number;
    currency: string;
    images: string[];
    location: any;
    created_at: string;
    views: number;
    featured: boolean;
    seller?: {
      business_name: string;
      is_verified: boolean;
      is_premium: boolean;
    };
  }
  
  const [featuredSellers, setFeaturedSellers] = useState<FeaturedSeller[]>([]);
  const [featuredListings, setFeaturedListings] = useState<FeaturedListing[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  // Load saved location on mount
  useEffect(() => {
    loadSavedLocation();
  }, []);

  // Fetch featured listings from verified sellers
  const fetchFeaturedListings = useCallback(async () => {
    try {
      setLoadingFeatured(true);
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/listings/featured-verified?limit=12`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedListings(data.listings || []);
      } else {
        // Fallback to featured sellers endpoint
        const sellersResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/business-profiles/featured?limit=8`);
        if (sellersResponse.ok) {
          const data = await sellersResponse.json();
          setFeaturedSellers(data.sellers || []);
        }
      }
    } catch (error) {
      console.error('Error fetching featured listings:', error);
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  // Load featured listings on mount
  useEffect(() => {
    fetchFeaturedListings();
  }, [fetchFeaturedListings]);

  // Load search suggestions (recent + trending)
  const loadSearchSuggestions = useCallback(async () => {
    try {
      // Load recent searches from localStorage
      let recent: string[] = [];
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem('recent_searches');
        if (stored) {
          recent = JSON.parse(stored);
        }
      }

      // Fetch trending searches from API
      let trending: { query: string; count: number }[] = [];
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/searches/popular?limit=5`);
        if (res.ok) {
          const data = await res.json();
          trending = data.global_searches || [];
        }
      } catch (e) {
        console.log('Could not fetch trending searches');
      }

      setSearchSuggestions({ recent: recent.slice(0, 5), trending });
    } catch (err) {
      console.error('Failed to load search suggestions:', err);
    }
  }, []);

  // Load search suggestions on mount
  useEffect(() => {
    loadSearchSuggestions();
  }, [loadSearchSuggestions]);

  // Handle search suggestion click
  const handleSuggestionClick = (query: string) => {
    setHomeSearchQuery(query);
    setShowSearchSuggestions(false);
    // Navigate to search
    const searchUrl = `/search?q=${encodeURIComponent(query.trim())}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = searchUrl;
    } else {
      router.push(searchUrl);
    }
  };

  const loadSavedLocation = async () => {
    try {
      const saved = await Storage.getItem('@selected_city');
      if (saved) {
        const city = JSON.parse(saved);
        setSelectedCity(city);
        // Use city_name or location_text for display
        setCurrentCity(city.city_name || city.location_text || 'Selected Location');
        // Also set the location filter for proper display
        setSelectedLocationFilter({
          country_code: city.country_code,
          region_code: city.region_code,
          region_name: city.region_name,
          city_name: city.city_name,
          location_text: city.location_text,
        } as LocationData);
      }
      const savedRadius = await Storage.getItem('@search_radius');
      if (savedRadius) setSearchRadius(parseInt(savedRadius, 10));
      const savedInclude = await Storage.getItem('@include_nearby');
      if (savedInclude !== null) setIncludeNearbyCities(savedInclude === 'true');
    } catch (err) {
      console.error('Failed to load saved location:', err);
    }
  };

  const saveSelectedCity = async (city: typeof selectedCity) => {
    setSelectedCity(city);
    if (city) {
      setCurrentCity(city.city_name);
      try {
        await Storage.setItem('@selected_city', JSON.stringify(city));
      } catch (err) {
        console.error('Failed to save city:', err);
      }
    }
  };

  // Load recent subcategories from storage
  const loadRecentSubcategories = useCallback(async () => {
    try {
      const stored = await Storage.getItem(RECENT_SUBCATEGORIES_KEY);
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
      await Storage.setItem(RECENT_SUBCATEGORIES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.log('Error saving recent subcategory:', error);
    }
  }, [recentSubcategories]);

  // Load recent subcategories on mount
  useEffect(() => {
    loadRecentSubcategories();
  }, []);

  // Fetch credit balance when authenticated
  const fetchCreditBalance = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/boost/credits/balance`, {
        headers: {
          'Authorization': `Bearer ${await Storage.getItem('authToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCreditBalance(data?.balance ?? 0);
      }
    } catch (err) {
      console.error('Failed to fetch credit balance:', err);
      setCreditBalance(0);
    }
  }, []);

  // Fetch unviewed badge count when authenticated
  const fetchUnviewedBadgeCount = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/badges/unviewed-count`, {
        headers: {
          'Authorization': `Bearer ${await Storage.getItem('authToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUnviewedBadgeCount(data?.unviewed_count ?? 0);
      }
    } catch (err) {
      console.error('Failed to fetch unviewed badge count:', err);
      setUnviewedBadgeCount(0);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCreditBalance();
      fetchUnviewedBadgeCount();
    }
  }, [isAuthenticated, fetchCreditBalance, fetchUnviewedBadgeCount]);

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
      
      // Build location filter params - prefer hierarchical codes over text search
      const locationParams: {
        location?: string;
        country_code?: string;
        region_code?: string;
        district_code?: string;
        city_code?: string;
      } = {};
      
      if (selectedLocationFilter) {
        // Use hierarchical codes for precise filtering
        if (selectedLocationFilter.country_code) locationParams.country_code = selectedLocationFilter.country_code;
        if (selectedLocationFilter.region_code) locationParams.region_code = selectedLocationFilter.region_code;
        if (selectedLocationFilter.district_code) locationParams.district_code = selectedLocationFilter.district_code;
        if (selectedLocationFilter.city_code) locationParams.city_code = selectedLocationFilter.city_code;
      } else if (currentCity !== 'Select Location' && currentCity !== 'All Locations') {
        // Fallback to text search for legacy compatibility
        locationParams.location = currentCity;
      }
      
      // Check if sandbox mode is active and use sandbox-aware API
      const sandboxActive = await sandboxUtils.isActive();
      
      let listingsRes;
      let categoriesRes;
      
      // Use smart location-based search if city is selected
      if (selectedCity && !sandboxActive) {
        try {
          listingsRes = await listingsApi.getByLocation({
            city_code: selectedCity.city_code,
            city_lat: selectedCity.lat,
            city_lng: selectedCity.lng,
            include_nearby: false,
            radius: searchRadius,
            category: selectedCategory || undefined,
            page: refresh ? 1 : page,
            limit: 20,
            only_my_city: true,
          });
          
          // Handle expanded search message (disabled)
          setExpandedSearch(false);
          setExpandedSearchMessage(null);
          
          categoriesRes = await categoriesApi.getAll();
        } catch (error) {
          console.error('Error with location-based fetch:', error);
          // Fallback to regular fetch
          listingsRes = await listingsApi.getAll({ 
            category: selectedCategory || undefined, 
            ...locationParams,
            page: refresh ? 1 : page, 
            limit: 20 
          });
          categoriesRes = await categoriesApi.getAll();
        }
      } else if (sandboxActive) {
        // Use sandbox proxy APIs
        [listingsRes, categoriesRes] = await Promise.all([
          sandboxAwareListingsApi.getAll({ 
            category: selectedCategory || undefined, 
            ...locationParams,
            page: refresh ? 1 : page, 
            limit: 20 
          }),
          sandboxAwareCategoriesApi.getAll(),
        ]);
        setExpandedSearch(false);
        setExpandedSearchMessage(null);
      } else {
        // Use normal production APIs
        [listingsRes, categoriesRes] = await Promise.all([
          listingsApi.getAll({ 
            category: selectedCategory || undefined, 
            ...locationParams,
            page: refresh ? 1 : page, 
            limit: 20 
          }),
          categoriesApi.getAll(),
        ]);
        setExpandedSearch(false);
        setExpandedSearchMessage(null);
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
  }, [selectedCategory, currentCity, selectedLocationFilter, selectedCity, includeNearbyCities, searchRadius, page, isAuthenticated, fetchNotificationCount]);

  useEffect(() => { fetchData(true); }, [selectedCategory, currentCity, selectedLocationFilter, selectedCity, includeNearbyCities, searchRadius]);

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

  // Handle search submit from homepage
  const handleSearchSubmit = () => {
    console.log('[Homepage] handleSearchSubmit called, query:', homeSearchQuery);
    if (homeSearchQuery.trim()) {
      const searchUrl = `/search?q=${encodeURIComponent(homeSearchQuery.trim())}`;
      console.log('[Homepage] Navigating to:', searchUrl);
      // On web, use full page navigation to ensure search page mounts fresh
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = searchUrl;
      } else {
        router.push(searchUrl);
      }
      setHomeSearchQuery(''); // Clear after navigation
    } else {
      console.log('[Homepage] Navigating to /search');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/search';
      } else {
        router.push('/search');
      }
    }
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

  const handleLocationSelect = async (location: LocationData) => {
    setSelectedLocationFilter(location);
    // Use region_name for display since we're now using region-level selection
    const displayName = location.region_name || location.city_name || location.location_text || 'Selected Location';
    setCurrentCity(displayName);
    setShowLocationModal(false);
    setLocationSearch('');
    
    // Save location data - now supports both city-level and region-level selection
    const locationData = {
      country_code: location.country_code || '',
      country_name: '', 
      region_code: location.region_code || '',
      region_name: location.region_name || '',
      district_code: location.district_code,
      district_name: location.district_name,
      city_code: location.city_code,
      city_name: location.region_name || location.city_name || '', // Use region_name as fallback
      lat: location.lat,
      lng: location.lng,
      location_text: location.location_text,
    };
    await saveSelectedCity(locationData);
  };

  const handleClearLocationFilter = async () => {
    setSelectedLocationFilter(null);
    setCurrentCity('All Locations');
    setSelectedCity(null);
    setExpandedSearch(false);
    setExpandedSearchMessage(null);
    try {
      await Storage.removeItem('@selected_city');
    } catch (err) {
      console.error('Failed to clear saved city:', err);
    }
  };

  // Desktop Location Dropdown Handlers
  const handleOpenLocationDropdown = async () => {
    setShowLocationDropdown(true);
    setLocationDropdownStep('countries');
    setSelectedCountryForDropdown(null);
    
    // Fetch countries if not loaded
    if (locationCountries.length === 0) {
      setLocationDropdownLoading(true);
      try {
        const response = await locationsApi.getCountries();
        setLocationCountries(response || []);
      } catch (error) {
        console.error('Failed to fetch countries:', error);
      } finally {
        setLocationDropdownLoading(false);
      }
    }
  };

  const handleSelectCountry = async (country: { code: string; name: string; flag: string }) => {
    setSelectedCountryForDropdown(country);
    setLocationDropdownStep('regions');
    setLocationDropdownLoading(true);
    
    try {
      const response = await locationsApi.getRegions(country.code);
      setLocationRegions(response || []);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    } finally {
      setLocationDropdownLoading(false);
    }
  };

  const handleSelectRegion = async (region: { country_code: string; region_code: string; name: string }) => {
    // Set the location filter
    setSelectedLocationFilter({
      country_code: region.country_code,
      region_code: region.region_code,
      location_text: `${region.name}, ${selectedCountryForDropdown?.name || ''}`,
    });
    
    // Update display text
    setCurrentCity(region.name);
    
    // Close dropdown
    setShowLocationDropdown(false);
    setLocationDropdownStep('countries');
    setSelectedCountryForDropdown(null);
    
    // Trigger data refresh with new location
    setPage(1);
    setHasMore(true);
  };

  const handleSelectAllInCountry = () => {
    if (!selectedCountryForDropdown) return;
    
    // Set country-level filter
    setSelectedLocationFilter({
      country_code: selectedCountryForDropdown.code,
      location_text: selectedCountryForDropdown.name,
    });
    
    // Update display text
    setCurrentCity(selectedCountryForDropdown.name);
    
    // Close dropdown
    setShowLocationDropdown(false);
    setLocationDropdownStep('countries');
    setSelectedCountryForDropdown(null);
    
    // Trigger data refresh
    setPage(1);
    setHasMore(true);
  };

  const handleBackToCountries = () => {
    setLocationDropdownStep('countries');
    setSelectedCountryForDropdown(null);
    setLocationRegions([]);
  };

  // ============ FEATURED SELLERS SECTION ============
  const FeaturedSellersSection = () => {
    if (loadingFeatured) {
      return null; // Don't show loading state to avoid layout shift
    }
    
    // Show featured listings by verified sellers
    if (featuredListings.length > 0) {
      return (
        <View style={featuredStyles.container}>
          <View style={featuredStyles.header}>
            <View style={featuredStyles.titleRow}>
              <Ionicons name="shield-checkmark" size={20} color="#2E7D32" />
              <Text style={featuredStyles.title}>From Verified Sellers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/business-directory')}>
              <Text style={featuredStyles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={featuredStyles.scrollContent}
          >
            {featuredListings.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={featuredStyles.listingCard}
                onPress={() => router.push(`/listing/${listing.id}`)}
                data-testid={`featured-listing-${listing.id}`}
              >
                {/* Image */}
                <View style={featuredStyles.listingImageContainer}>
                  <Image 
                    source={{ uri: listing.images?.[0] || 'https://via.placeholder.com/150' }} 
                    style={featuredStyles.listingImage} 
                  />
                  {/* Verified Badge */}
                  <View style={featuredStyles.verifiedOverlay}>
                    <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  </View>
                </View>
                
                {/* Details */}
                <View style={featuredStyles.listingDetails}>
                  <Text style={featuredStyles.listingPrice}>
                    {listing.currency || '$'}{listing.price?.toLocaleString()}
                  </Text>
                  <Text style={featuredStyles.listingTitle} numberOfLines={2}>
                    {listing.title}
                  </Text>
                  
                  {/* Seller Info */}
                  {listing.seller && (
                    <View style={featuredStyles.sellerInfo}>
                      <Ionicons name="storefront-outline" size={12} color="#6B7280" />
                      <Text style={featuredStyles.sellerName} numberOfLines={1}>
                        {listing.seller.business_name}
                      </Text>
                      {listing.seller.is_premium && (
                        <Ionicons name="diamond" size={10} color="#9C27B0" />
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }
    
    // Fallback to showing seller profiles if no featured listings
    if (featuredSellers.length === 0) {
      return null; // Don't show section if no verified sellers
    }
    
    return (
      <View style={featuredStyles.container}>
        <View style={featuredStyles.header}>
          <View style={featuredStyles.titleRow}>
            <Ionicons name="shield-checkmark" size={20} color="#2E7D32" />
            <Text style={featuredStyles.title}>Verified Sellers</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/business-directory')}>
            <Text style={featuredStyles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={featuredStyles.scrollContent}
        >
          {featuredSellers.map((seller) => (
            <TouchableOpacity
              key={seller.id}
              style={featuredStyles.sellerCard}
              onPress={() => router.push(`/business/${seller.identifier}`)}
              data-testid={`featured-seller-${seller.id}`}
            >
              {/* Logo */}
              <View style={featuredStyles.logoContainer}>
                {seller.logo_url ? (
                  <Image source={{ uri: seller.logo_url }} style={featuredStyles.logo} />
                ) : (
                  <View style={featuredStyles.logoPlaceholder}>
                    <Ionicons name="storefront" size={24} color="#2E7D32" />
                  </View>
                )}
                {/* Verification Badge */}
                <View style={[
                  featuredStyles.badge,
                  seller.is_premium ? featuredStyles.premiumBadge : featuredStyles.verifiedBadge
                ]}>
                  <Ionicons 
                    name={seller.is_premium ? "diamond" : "checkmark-circle"} 
                    size={12} 
                    color="#fff" 
                  />
                </View>
              </View>
              
              {/* Business Name */}
              <Text style={featuredStyles.businessName} numberOfLines={1}>
                {seller.business_name}
              </Text>
              
              {/* Location */}
              {seller.city && (
                <Text style={featuredStyles.location} numberOfLines={1}>
                  {seller.city}
                </Text>
              )}
              
              {/* Stats */}
              <View style={featuredStyles.statsRow}>
                <Text style={featuredStyles.stat}>{seller.total_listings} items</Text>
              </View>
              
              {/* Tier Label */}
              <View style={[
                featuredStyles.tierLabel,
                seller.is_premium ? featuredStyles.premiumLabel : featuredStyles.verifiedLabel
              ]}>
                <Text style={[
                  featuredStyles.tierText,
                  seller.is_premium ? featuredStyles.premiumText : featuredStyles.verifiedText
                ]}>
                  {seller.is_premium ? 'Premium' : 'Verified'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
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
        <View style={styles.searchFieldWrapper}>
          <View style={styles.searchField}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${currentCity === 'Select Location' ? 'all areas' : currentCity}`}
              placeholderTextColor="#999"
              value={homeSearchQuery}
              onChangeText={(text) => {
                setHomeSearchQuery(text);
                if (text.length === 0) {
                  setShowSearchSuggestions(true);
                }
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              onBlur={() => {
                // Delay hiding to allow click events on suggestions
                setTimeout(() => setShowSearchSuggestions(false), 200);
              }}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              data-testid="home-search-input"
            />
            {homeSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setHomeSearchQuery('')} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Autocomplete Dropdown */}
          {showSearchSuggestions && (searchSuggestions.recent.length > 0 || searchSuggestions.trending.length > 0) && (
            <View style={styles.suggestionsDropdown}>
              {/* Recent Searches */}
              {searchSuggestions.recent.length > 0 && (
                <View style={styles.suggestionSection}>
                  <View style={styles.suggestionHeader}>
                    <Ionicons name="time-outline" size={14} color="#666" />
                    <Text style={styles.suggestionHeaderText}>Recent Searches</Text>
                  </View>
                  {searchSuggestions.recent.slice(0, 3).map((query, idx) => (
                    <TouchableOpacity
                      key={`recent-${idx}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionClick(query)}
                    >
                      <Ionicons name="search-outline" size={16} color="#999" />
                      <Text style={styles.suggestionText}>{query}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* Trending Searches */}
              {searchSuggestions.trending.length > 0 && (
                <View style={styles.suggestionSection}>
                  <View style={styles.suggestionHeader}>
                    <Ionicons name="trending-up" size={14} color="#F57C00" />
                    <Text style={[styles.suggestionHeaderText, { color: '#F57C00' }]}>Trending</Text>
                  </View>
                  {searchSuggestions.trending.slice(0, 4).map((item, idx) => (
                    <TouchableOpacity
                      key={`trending-${idx}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionClick(item.query)}
                    >
                      <View style={styles.trendingRank}>
                        <Text style={styles.trendingRankText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.suggestionText}>{item.query}</Text>
                      <Text style={styles.trendingCount}>{item.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
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

      {/* FEATURED SELLERS SECTION */}
      <FeaturedSellersSection />

      {/* SECTION TITLE */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedCategory ? FULL_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Listings' : (expandedSearch ? 'Nearby Listings' : 'Recent Listings')}
        </Text>
        {selectedCategory && (
          <TouchableOpacity onPress={() => { setSelectedCategory(null); }}>
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
    const displayedListings = listings;
    
    // Show empty state only when initial load is done and no listings
    if (displayedListings.length === 0) {
      return <EmptyState icon="pricetags-outline" title={expandedSearch ? "Showing nearby listings" : "No listings yet"} description={expandedSearch ? "Try adjusting your location or search settings." : "Be the first to post an ad in your area!"} />;
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
                    userLocation={selectedCity?.lat && selectedCity?.lng && !isNaN(selectedCity.lat) && !isNaN(selectedCity.lng) ? { lat: selectedCity.lat, lng: selectedCity.lng } : null}
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
      {/* Row 1: Logo + Nav Links + Auth + Post Listing */}
      <View style={desktopStyles.headerRow1}>
        <View style={desktopStyles.headerRow1Inner}>
          <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
            <View style={desktopStyles.logoIcon}>
              <Ionicons name="storefront" size={22} color="#fff" />
            </View>
            <Text style={desktopStyles.logoText}>avida</Text>
          </TouchableOpacity>
          
          {/* Spacer to push everything to the right */}
          <View style={{ flex: 1 }} />
          
          <View style={desktopStyles.headerActions}>
            {isAuthenticated ? (
              <>
                {/* Navigation Links - Now on the right */}
                <View style={desktopStyles.navLinks}>
                  <TouchableOpacity style={desktopStyles.navLink} onPress={() => router.push('/profile/my-listings')}>
                    <Ionicons name="pricetags-outline" size={18} color="#6B7280" />
                    <Text style={desktopStyles.navLinkText}>My Listings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={desktopStyles.navLink} onPress={() => router.push('/messages')}>
                    <Ionicons name="chatbubbles-outline" size={18} color="#6B7280" />
                    <Text style={desktopStyles.navLinkText}>Messages</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={desktopStyles.navLink} onPress={() => router.push('/profile/saved')}>
                    <Ionicons name="heart-outline" size={18} color="#6B7280" />
                    <Text style={desktopStyles.navLinkText}>Saved</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={desktopStyles.navLink} onPress={() => router.push('/offers')}>
                    <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
                    <Text style={desktopStyles.navLinkText}>Offers</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Divider */}
                <View style={desktopStyles.headerDivider} />
                
                {/* Credit Balance */}
                <TouchableOpacity style={desktopStyles.creditBalanceBtn} onPress={() => router.push('/credits')}>
                  <Ionicons name="wallet-outline" size={18} color="#F59E0B" />
                  <Text style={desktopStyles.creditBalanceText}>
                    {creditBalance !== null ? `${creditBalance} Credits` : '...'}
                  </Text>
                </TouchableOpacity>
                
                {/* Badge Notification */}
                <TouchableOpacity style={desktopStyles.notifBtn} onPress={() => router.push('/profile/badges')}>
                  <Ionicons name="medal-outline" size={22} color="#333" />
                  {unviewedBadgeCount > 0 && (
                    <View style={[desktopStyles.notifBadge, { backgroundColor: '#9333EA' }]}>
                      <Text style={desktopStyles.notifBadgeText}>{unviewedBadgeCount > 99 ? '99+' : unviewedBadgeCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* General Notifications */}
                <TouchableOpacity style={desktopStyles.notifBtn} onPress={() => router.push('/notifications')}>
                  <Ionicons name="notifications-outline" size={22} color="#333" />
                  {notificationCount > 0 && (
                    <View style={desktopStyles.notifBadge}>
                      <Text style={desktopStyles.notifBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* Profile */}
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
          <View style={desktopStyles.searchFieldWrapper}>
            <View style={desktopStyles.searchField}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={desktopStyles.searchInput}
                placeholder="Search for anything..."
                placeholderTextColor="#999"
                value={homeSearchQuery}
                onChangeText={(text) => {
                  setHomeSearchQuery(text);
                  setShowSearchSuggestions(true);
                }}
                onFocus={() => {
                  console.log('Search input focused, showing suggestions');
                  setShowSearchSuggestions(true);
                }}
                onBlur={() => {
                  // Delay hiding to allow click events on suggestions
                  setTimeout(() => setShowSearchSuggestions(false), 250);
                }}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                data-testid="desktop-home-search-input"
              />
              {homeSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setHomeSearchQuery('')} style={desktopStyles.clearSearchBtn}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={desktopStyles.searchButton} 
                onPress={handleSearchSubmit}
                data-testid="desktop-home-search-button"
              >
                <Text style={desktopStyles.searchButtonText}>Search</Text>
              </TouchableOpacity>
            </View>
            
            {/* Desktop Autocomplete Dropdown */}
            {showSearchSuggestions && (
              <View style={desktopStyles.suggestionsDropdown}>
                {/* Recent Searches */}
                {searchSuggestions.recent.length > 0 && (
                  <View style={desktopStyles.suggestionSection}>
                    <View style={desktopStyles.suggestionHeader}>
                      <Ionicons name="time-outline" size={14} color="#666" />
                      <Text style={desktopStyles.suggestionHeaderText}>Recent Searches</Text>
                    </View>
                    {searchSuggestions.recent.slice(0, 3).map((query, idx) => (
                      <TouchableOpacity
                        key={`desktop-recent-${idx}`}
                        style={desktopStyles.suggestionItem}
                        onPress={() => handleSuggestionClick(query)}
                      >
                        <Ionicons name="search-outline" size={16} color="#999" />
                        <Text style={desktopStyles.suggestionText}>{query}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* Trending Searches */}
                {searchSuggestions.trending.length > 0 && (
                  <View style={desktopStyles.suggestionSection}>
                    <View style={desktopStyles.suggestionHeader}>
                      <Ionicons name="trending-up" size={14} color="#F57C00" />
                      <Text style={[desktopStyles.suggestionHeaderText, { color: '#F57C00' }]}>Trending</Text>
                    </View>
                    {searchSuggestions.trending.slice(0, 5).map((item, idx) => (
                      <TouchableOpacity
                        key={`desktop-trending-${idx}`}
                        style={desktopStyles.suggestionItem}
                        onPress={() => handleSuggestionClick(item.query)}
                      >
                        <View style={desktopStyles.trendingRank}>
                          <Text style={desktopStyles.trendingRankText}>{idx + 1}</Text>
                        </View>
                        <Text style={desktopStyles.suggestionText}>{item.query}</Text>
                        <Text style={desktopStyles.trendingCount}>{item.count} searches</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* Empty state - show only when no data is available */}
                {searchSuggestions.recent.length === 0 && searchSuggestions.trending.length === 0 && (
                  <View style={desktopStyles.suggestionSection}>
                    <Text style={[desktopStyles.suggestionHeaderText, { paddingHorizontal: 16, paddingVertical: 12 }]}>
                      Start typing to search...
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {/* Location Selector with Dropdown */}
          <View style={desktopStyles.locationWrapper}>
            <TouchableOpacity 
              style={desktopStyles.locationChip} 
              activeOpacity={0.7} 
              onPress={handleOpenLocationDropdown}
              data-testid="desktop-location-selector"
            >
              <Ionicons name="location" size={18} color="#2E7D32" />
              <Text style={desktopStyles.locationText} numberOfLines={1}>{currentCity}</Text>
              <Ionicons name={showLocationDropdown ? "chevron-up" : "chevron-down"} size={16} color="#666" />
            </TouchableOpacity>
            
            {/* Location Dropdown */}
            {showLocationDropdown && (
              <View style={desktopStyles.locationDropdown}>
                {/* Header */}
                <View style={desktopStyles.locationDropdownHeader}>
                  {locationDropdownStep === 'regions' && (
                    <TouchableOpacity onPress={handleBackToCountries} style={desktopStyles.backButton}>
                      <Ionicons name="arrow-back" size={18} color="#666" />
                    </TouchableOpacity>
                  )}
                  <Text style={desktopStyles.locationDropdownTitle}>
                    {locationDropdownStep === 'countries' ? 'Select Country' : selectedCountryForDropdown?.name}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setShowLocationDropdown(false)} 
                    style={desktopStyles.closeDropdownBtn}
                  >
                    <Ionicons name="close" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
                
                {/* Clear Filter Option */}
                {selectedLocationFilter && locationDropdownStep === 'countries' && (
                  <TouchableOpacity 
                    style={desktopStyles.clearLocationOption}
                    onPress={() => {
                      handleClearLocationFilter();
                      setShowLocationDropdown(false);
                    }}
                  >
                    <Ionicons name="globe-outline" size={18} color="#2E7D32" />
                    <Text style={desktopStyles.clearLocationText}>All Locations</Text>
                  </TouchableOpacity>
                )}
                
                {/* Loading State */}
                {locationDropdownLoading && (
                  <View style={desktopStyles.locationDropdownLoading}>
                    <ActivityIndicator size="small" color="#2E7D32" />
                    <Text style={desktopStyles.loadingText}>Loading...</Text>
                  </View>
                )}
                
                {/* Countries List */}
                {locationDropdownStep === 'countries' && !locationDropdownLoading && (
                  <View style={{ maxHeight: 300, overflow: 'scroll' }}>
                    {locationCountries.map((country, index) => (
                      <TouchableOpacity
                        key={country.code}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}
                        onPress={() => handleSelectCountry(country)}
                      >
                        <Text style={{ fontSize: 20, width: 28, marginRight: 12 }}>{country.flag}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, color: '#333' }}>{country.name}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#999" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* Regions List */}
                {locationDropdownStep === 'regions' && !locationDropdownLoading && (
                  <ScrollView style={desktopStyles.locationList} showsVerticalScrollIndicator={false}>
                    {/* All in Country Option */}
                    <TouchableOpacity
                      style={[desktopStyles.locationItem, desktopStyles.allInCountryOption]}
                      onPress={handleSelectAllInCountry}
                    >
                      <Ionicons name="globe-outline" size={18} color="#2E7D32" />
                      <Text style={[desktopStyles.locationItemText, { color: '#2E7D32', fontWeight: '600' }]}>
                        All of {selectedCountryForDropdown?.name}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Region Items */}
                    {locationRegions.map((region) => (
                      <TouchableOpacity
                        key={region.region_code}
                        style={desktopStyles.locationItem}
                        onPress={() => handleSelectRegion(region)}
                      >
                        <Ionicons name="location-outline" size={18} color="#666" />
                        <Text style={[desktopStyles.locationItemText, { color: '#333', fontWeight: '400' }]}>{region.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
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
          <Text style={desktopStyles.listingCount}>{listings.length} items</Text>
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
        {isDesktop || isTablet ? (
          renderDesktopHeader()
        ) : renderHeader()}
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

        {/* Location Picker Modal - Using New Hierarchical Location System */}
        <Modal
          visible={showLocationModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLocationModal(false)}
        >
          <View style={styles.locationPickerModal}>
            <View style={styles.locationPickerHeader}>
              <Text style={styles.locationPickerTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {/* Current selection info */}
            {selectedLocationFilter && (
              <View style={styles.currentLocationBanner}>
                <Ionicons name="location" size={20} color="#2E7D32" />
                <Text style={styles.currentLocationText}>
                  {selectedLocationFilter.location_text || selectedLocationFilter.city_name}
                </Text>
                <TouchableOpacity onPress={handleClearLocationFilter} style={styles.clearFilterBtn}>
                  <Text style={styles.clearFilterBtnText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.locationPickerContent}>
              <Text style={styles.locationPickerHint}>
                Select a location to filter listings. Choose a country, then narrow down to region, district, and city.
              </Text>
              
              <LocationPicker
                value={selectedLocationFilter}
                onChange={(location) => {
                  handleLocationSelect(location);
                  setShowLocationModal(false);
                }}
                placeholder="Browse locations..."
              />
              
              {/* All Locations option */}
              <TouchableOpacity 
                style={[styles.allLocationsBtn, !selectedLocationFilter && styles.allLocationsBtnActive]}
                onPress={() => {
                  handleClearLocationFilter();
                  setShowLocationModal(false);
                }}
              >
                <Ionicons name="globe-outline" size={20} color={!selectedLocationFilter ? "#2E7D32" : "#666"} />
                <Text style={[styles.allLocationsBtnText, !selectedLocationFilter && styles.allLocationsBtnTextActive]}>
                  All Locations
                </Text>
                {!selectedLocationFilter && (
                  <Ionicons name="checkmark" size={20} color="#2E7D32" />
                )}
              </TouchableOpacity>
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
  // Row 1: Logo + Nav Links + Auth + Post Listing
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
  // Navigation Links
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  headerDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creditBalanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
  },
  creditBalanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
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
    zIndex: 200,
    ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
  },
  headerRow2Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
  },
  searchFieldWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 100,
    ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  clearSearchBtn: {
    padding: 4,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    }),
    zIndex: 1000,
  },
  suggestionSection: {
    paddingVertical: 4,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  trendingRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
  },
  trendingCount: {
    fontSize: 12,
    color: '#999',
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
  locationWrapper: {
    position: 'relative',
  },
  locationDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 320,
    maxHeight: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 1000,
  },
  locationDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  locationDropdownTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  closeDropdownBtn: {
    padding: 4,
    marginLeft: 8,
  },
  clearLocationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#F8FFF8',
  },
  clearLocationText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  locationDropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#999',
  },
  locationList: {
    maxHeight: 300,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    width: '100%',
  },
  countryFlag: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
    flexShrink: 0,
  },
  locationItemText: {
    fontSize: 14,
    color: '#333',
    flexShrink: 1,
    flexGrow: 1,
    width: 'auto',
  },
  allInCountryOption: {
    backgroundColor: '#F0FFF0',
    borderBottomWidth: 2,
    borderBottomColor: '#E8E8E8',
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

// Featured Sellers Styles
const featuredStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 12,
  },
  sellerCard: {
    width: 140,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  verifiedBadge: {
    backgroundColor: '#2E7D32',
  },
  premiumBadge: {
    backgroundColor: '#FFB300',
  },
  businessName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stat: {
    fontSize: 11,
    color: '#888',
  },
  tierLabel: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedLabel: {
    backgroundColor: '#E8F5E9',
  },
  premiumLabel: {
    backgroundColor: '#FFF8E1',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '600',
  },
  verifiedText: {
    color: '#2E7D32',
  },
  premiumText: {
    color: '#FF8F00',
  },
  
  // Listing Cards (for "From Verified Sellers" section)
  listingCard: {
    width: 180,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  listingImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  listingImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  verifiedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2E7D32',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingDetails: {
    padding: 10,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    lineHeight: 18,
    marginBottom: 6,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  listingId: {
    fontSize: 9,
    color: '#9CA3AF',
    fontFamily: 'monospace',
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
    paddingLeft: 14,
    paddingRight: 4,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  clearSearchBtn: {
    padding: 4,
    marginRight: 4,
  },
  searchButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  nearMeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 14,
    gap: 6,
    marginLeft: 8,
  },
  nearMeChipActive: {
    backgroundColor: '#1976D2',
  },
  nearMeText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  nearMeTextActive: {
    color: '#fff',
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

  // NEW LOCATION PICKER MODAL
  locationPickerModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  locationPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  locationPickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  currentLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  currentLocationText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  clearFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  clearFilterBtnText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  locationPickerContent: {
    flex: 1,
    padding: 20,
  },
  locationPickerHint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  allLocationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  allLocationsBtnActive: {
    backgroundColor: '#E8F5E9',
  },
  allLocationsBtnText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  allLocationsBtnTextActive: {
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
