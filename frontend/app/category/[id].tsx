import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
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
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { listingsApi, categoriesApi, favoritesApi } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { safeGoBack } from '../../src/utils/navigation';
import {
  getMainCategory,
  getSubcategories,
  getSubcategoryConfig,
  getSubcategoryAttributes,
  getConditionOptions,
  SubcategoryAttribute,
  SubcategoryConfig,
} from '../../src/config/subcategories';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
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
        {listing.subcategory && (
          <View style={styles.subcategoryTag}>
            <Text style={styles.subcategoryTagText}>{listing.subcategory.replace(/_/g, ' ')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ============ PROPERTY LISTING CARD (Single Column - Image on Top) ============
const PropertyListingCard = memo<ListingCardProps>(({ listing, onPress, onFavorite, isFavorited = false }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: listing.currency || 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const attributes = listing.attributes || {};
  const bedrooms = attributes.bedrooms || attributes.rooms;
  const bathrooms = attributes.bathrooms;
  const size = attributes.size || attributes.area;
  const propertyType = attributes.property_type || listing.subcategory?.replace(/_/g, ' ');

  return (
    <TouchableOpacity style={styles.propertyCard} onPress={onPress} activeOpacity={0.97}>
      {/* Image on Top */}
      <View style={styles.propertyImageContainer}>
        <Image
          source={{ uri: listing.images?.[0] || 'https://via.placeholder.com/400x200' }}
          style={styles.propertyImage}
          resizeMode="cover"
        />
        {listing.featured && (
          <View style={styles.propertyFeaturedBadge}>
            <Text style={styles.propertyFeaturedText}>FEATURED</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.propertyFavoriteButton}
          onPress={(e) => { e.stopPropagation(); onFavorite(); }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorited ? '#E53935' : '#FFFFFF'}
          />
        </TouchableOpacity>
        {listing.images?.length > 1 && (
          <View style={styles.imageCountBadge}>
            <Ionicons name="camera-outline" size={11} color="#fff" />
            <Text style={styles.imageCountText}>{listing.images.length}</Text>
          </View>
        )}
        {propertyType && (
          <View style={styles.propertyTypeBadge}>
            <Text style={styles.propertyTypeBadgeText}>{propertyType}</Text>
          </View>
        )}
      </View>

      {/* Content Below */}
      <View style={styles.propertyCardContent}>
        {/* Price Row */}
        <View style={styles.propertyPriceRow}>
          <Text style={styles.propertyPrice}>{formatPrice(listing.price)}</Text>
          {listing.negotiable && (
            <Text style={styles.negotiableTag}>Negotiable</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.propertyTitle} numberOfLines={1}>{listing.title}</Text>

        {/* Features Row: Beds | Baths | Size */}
        <View style={styles.propertyFeatures}>
          {bedrooms && (
            <View style={styles.featureItem}>
              <Ionicons name="bed-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.featureText}>{bedrooms} {bedrooms === 1 ? 'Bed' : 'Beds'}</Text>
            </View>
          )}
          {bedrooms && (bathrooms || size) && <View style={styles.featureDivider} />}
          {bathrooms && (
            <View style={styles.featureItem}>
              <Ionicons name="water-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.featureText}>{bathrooms} {bathrooms === 1 ? 'Bath' : 'Baths'}</Text>
            </View>
          )}
          {bathrooms && size && <View style={styles.featureDivider} />}
          {size && (
            <View style={styles.featureItem}>
              <Ionicons name="expand-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.featureText}>{size} m²</Text>
            </View>
          )}
        </View>

        {/* Bottom Row: Location & Date */}
        <View style={styles.propertyBottomRow}>
          <View style={styles.propertyLocationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.propertyLocation} numberOfLines={1}>{listing.location}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.dateText}>{formatDate(listing.created_at)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============ AUTO LISTING CARD (Single Column - Image on Left) ============
const AutoListingCard = memo<ListingCardProps>(({ listing, onPress, onFavorite, isFavorited = false }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: listing.currency || 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const attributes = listing.attributes || {};
  const year = attributes.year;
  const mileage = attributes.mileage || attributes.km;
  const transmission = attributes.transmission;

  const formatMileage = (km: number) => {
    if (km >= 1000) return `${Math.round(km / 1000)}k km`;
    return `${km} km`;
  };

  // Build highlights array (max 3)
  const highlights: string[] = [];
  if (year) highlights.push(String(year));
  if (mileage) highlights.push(formatMileage(mileage));
  if (transmission) highlights.push(transmission);

  return (
    <TouchableOpacity style={styles.autoCard} onPress={onPress} activeOpacity={0.97}>
      <View style={styles.autoCardRow}>
        {/* Left: Image */}
        <View style={styles.autoImageContainer}>
          <Image
            source={{ uri: listing.images?.[0] || 'https://via.placeholder.com/300x200' }}
            style={styles.autoImage}
            resizeMode="cover"
          />
          {listing.featured && (
            <View style={styles.autoFeaturedBadge}>
              <Text style={styles.autoFeaturedText}>TOP</Text>
            </View>
          )}
          {listing.images?.length > 1 && (
            <View style={styles.autoImageCount}>
              <Ionicons name="camera-outline" size={10} color="#fff" />
              <Text style={styles.autoImageCountText}>{listing.images.length}</Text>
            </View>
          )}
        </View>

        {/* Right: Content */}
        <View style={styles.autoCardContent}>
          {/* Price */}
          <Text style={styles.autoPrice}>{formatPrice(listing.price)}</Text>

          {/* Title */}
          <Text style={styles.autoTitle} numberOfLines={2}>{listing.title}</Text>

          {/* Highlights Row (no icons) */}
          {highlights.length > 0 && (
            <Text style={styles.autoHighlights}>{highlights.join(' • ')}</Text>
          )}

          {/* Location */}
          <View style={styles.autoLocationRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.autoLocation} numberOfLines={1}>{listing.location}</Text>
          </View>

          {/* Date */}
          <Text style={styles.autoDate}>{formatDate(listing.created_at)}</Text>
        </View>

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.autoFavoriteButton}
          onPress={(e) => { e.stopPropagation(); onFavorite(); }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorited ? '#E53935' : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// ============ FILTER CHIP ============
interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  count?: number;
}

const FilterChip = memo<FilterChipProps>(({ label, selected, onPress, count }) => (
  <TouchableOpacity
    style={[styles.filterChip, selected && styles.filterChipSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
      {label}
    </Text>
    {count !== undefined && count > 0 && (
      <View style={[styles.filterChipCount, selected && styles.filterChipCountSelected]}>
        <Text style={[styles.filterChipCountText, selected && styles.filterChipCountTextSelected]}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
));

// ============ MAIN SCREEN ============
export default function CategoryScreen() {
  const router = useRouter();
  const { id, subcategory: initialSubcategory } = useLocalSearchParams<{ id: string; subcategory?: string }>();
  const { isAuthenticated } = useAuthStore();
  
  const [listings, setListings] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter state
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialSubcategory || '');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  const categoryId = id as string;

  // Get subcategories for this category
  const subcategories = useMemo(() => {
    return getSubcategories(categoryId);
  }, [categoryId]);

  // Get the current subcategory config
  const currentSubcategoryConfig = useMemo(() => {
    if (!selectedSubcategory) return null;
    return getSubcategoryConfig(categoryId, selectedSubcategory);
  }, [categoryId, selectedSubcategory]);

  // Get condition options based on selected subcategory
  const conditionOptions = useMemo(() => {
    if (!selectedSubcategory) return ['New', 'Like New', 'Good', 'Fair'];
    return getConditionOptions(categoryId, selectedSubcategory);
  }, [categoryId, selectedSubcategory]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSubcategory) count++;
    if (selectedCondition) count++;
    if (priceRange.min || priceRange.max) count++;
    count += Object.keys(activeFilters).filter(k => activeFilters[k]).length;
    return count;
  }, [selectedSubcategory, selectedCondition, priceRange, activeFilters]);

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
        setHasMore(true);
      }

      const currentPage = refresh ? 1 : page;
      
      // Build filters JSON string
      const filtersJson = Object.keys(activeFilters).length > 0 
        ? JSON.stringify(activeFilters) 
        : undefined;
      
      // Fetch category info and listings in parallel
      const [listingsRes, categoriesRes] = await Promise.all([
        listingsApi.getAll({ 
          category: categoryId, 
          subcategory: selectedSubcategory || undefined,
          page: currentPage, 
          limit: 20,
          min_price: priceRange.min ? parseFloat(priceRange.min) : undefined,
          max_price: priceRange.max ? parseFloat(priceRange.max) : undefined,
          condition: selectedCondition || undefined,
          sort: sortBy,
          filters: filtersJson,
        }),
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
  }, [categoryId, page, isAuthenticated, selectedSubcategory, priceRange, selectedCondition, sortBy, activeFilters]);

  useEffect(() => {
    fetchData(true);
  }, [categoryId, selectedSubcategory, selectedCondition, sortBy]);

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

  const handleSubcategorySelect = (subcatId: string) => {
    if (selectedSubcategory === subcatId) {
      setSelectedSubcategory('');
    } else {
      setSelectedSubcategory(subcatId);
    }
    // Reset attribute filters when subcategory changes
    setActiveFilters({});
  };

  const handleApplyFilters = () => {
    setShowFiltersModal(false);
    fetchData(true);
  };

  const handleClearFilters = () => {
    setSelectedSubcategory('');
    setActiveFilters({});
    setPriceRange({ min: '', max: '' });
    setSelectedCondition('');
    setSortBy('newest');
    setShowFiltersModal(false);
  };

  const getListingRoute = (listing: any) => {
    const catId = listing.category_id;
    const listingId = listing.id;
    
    // Only route to /auto/ for listings with auto_ prefix (from auto_listings collection)
    if (catId === 'auto_vehicles' && listingId.startsWith('auto_')) {
      return `/auto/${listingId}`;
    }
    // Only route to /property/ for listings with prop_ prefix (from properties collection)
    if (catId === 'properties' && listingId.startsWith('prop_')) {
      return `/property/${listingId}`;
    }
    // Default: route to generic listing page (for listings in listings collection)
    return `/listing/${listingId}`;
  };

  const isPropertyCategory = categoryId === 'properties';
  const isAutoCategory = categoryId === 'auto_vehicles';
  const isSingleColumn = isPropertyCategory || isAutoCategory;

  const renderListingCard = ({ item }: { item: any }) => {
    if (isPropertyCategory) {
      return (
        <PropertyListingCard
          listing={item}
          onPress={() => router.push(getListingRoute(item))}
          onFavorite={() => handleFavorite(item.id)}
          isFavorited={favorites.has(item.id)}
        />
      );
    }
    if (isAutoCategory) {
      return (
        <AutoListingCard
          listing={item}
          onPress={() => router.push(getListingRoute(item))}
          onFavorite={() => handleFavorite(item.id)}
          isFavorited={favorites.has(item.id)}
        />
      );
    }
    return (
      <ListingCard
        listing={item}
        onPress={() => router.push(getListingRoute(item))}
        onFavorite={() => handleFavorite(item.id)}
        isFavorited={favorites.has(item.id)}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No listings found</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilterCount > 0 
          ? 'Try adjusting your filters to see more results'
          : 'There are no listings in this category yet.'}
      </Text>
      {activeFilterCount > 0 && (
        <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
          <Text style={styles.clearFiltersText}>Clear all filters</Text>
        </TouchableOpacity>
      )}
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

  // ============ FILTERS MODAL ============
  const renderFiltersModal = () => (
    <Modal
      visible={showFiltersModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowFiltersModal(false)}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFiltersModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={handleClearFilters}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Subcategory Filter */}
          {subcategories.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Subcategory</Text>
              <View style={styles.filterChipsWrap}>
                {subcategories.map((sub) => (
                  <FilterChip
                    key={sub.id}
                    label={sub.name}
                    selected={selectedSubcategory === sub.id}
                    onPress={() => handleSubcategorySelect(sub.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.priceRangeRow}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceInputLabel}>Min</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={priceRange.min}
                  onChangeText={(val) => setPriceRange(prev => ({ ...prev, min: val }))}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
              <View style={styles.priceDivider}>
                <Text style={styles.priceDividerText}>-</Text>
              </View>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceInputLabel}>Max</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Any"
                  keyboardType="numeric"
                  value={priceRange.max}
                  onChangeText={(val) => setPriceRange(prev => ({ ...prev, max: val }))}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>
          </View>

          {/* Condition Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Condition</Text>
            <View style={styles.filterChipsWrap}>
              {conditionOptions.map((cond) => (
                <FilterChip
                  key={cond}
                  label={cond}
                  selected={selectedCondition === cond}
                  onPress={() => setSelectedCondition(selectedCondition === cond ? '' : cond)}
                />
              ))}
            </View>
          </View>

          {/* Subcategory-Specific Attributes */}
          {currentSubcategoryConfig && currentSubcategoryConfig.attributes.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                {currentSubcategoryConfig.name} Filters
              </Text>
              {currentSubcategoryConfig.attributes
                .filter(attr => attr.type === 'select' && attr.options)
                .slice(0, 5) // Limit to top 5 attributes for filtering
                .map((attr) => (
                  <View key={attr.name} style={styles.attributeFilter}>
                    <Text style={styles.attributeFilterLabel}>{attr.label}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.attributeChipsRow}>
                        {attr.options?.slice(0, 8).map((opt) => (
                          <FilterChip
                            key={opt}
                            label={opt}
                            selected={activeFilters[attr.name] === opt}
                            onPress={() => {
                              setActiveFilters(prev => ({
                                ...prev,
                                [attr.name]: prev[attr.name] === opt ? undefined : opt
                              }));
                            }}
                          />
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ))}
            </View>
          )}

          {/* Sort By */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.filterChipsWrap}>
              {[
                { id: 'newest', label: 'Newest' },
                { id: 'oldest', label: 'Oldest' },
                { id: 'price_asc', label: 'Price: Low to High' },
                { id: 'price_desc', label: 'Price: High to Low' },
              ].map((sort) => (
                <FilterChip
                  key={sort.id}
                  label={sort.label}
                  selected={sortBy === sort.id}
                  onPress={() => setSortBy(sort.id)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
            <Text style={styles.applyButtonText}>Show {total} Results</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (loading && listings.length === 0) {
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

  const mainCategory = getMainCategory(categoryId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {mainCategory?.icon && (
            <Ionicons name={mainCategory.icon as any} size={20} color={COLORS.primary} />
          )}
          <Text style={styles.headerTitle}>{mainCategory?.name || categoryId}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/search')} style={styles.searchButton}>
          <Ionicons name="search" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Subcategory Chips - Horizontal Scroll */}
      {subcategories.length > 0 && (
        <View style={styles.subcategoriesBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesContent}
          >
            <TouchableOpacity
              style={[styles.subcategoryChip, !selectedSubcategory && styles.subcategoryChipSelected]}
              onPress={() => setSelectedSubcategory('')}
            >
              <Text style={[styles.subcategoryChipText, !selectedSubcategory && styles.subcategoryChipTextSelected]}>
                All
              </Text>
            </TouchableOpacity>
            {subcategories.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subcategoryChip, selectedSubcategory === sub.id && styles.subcategoryChipSelected]}
                onPress={() => handleSubcategorySelect(sub.id)}
              >
                <Text style={[styles.subcategoryChipText, selectedSubcategory === sub.id && styles.subcategoryChipTextSelected]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results Bar with Filter Button */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>{total} listings found</Text>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]} 
          onPress={() => setShowFiltersModal(true)}
        >
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? '#fff' : COLORS.text} />
          <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedSubcategory && (
              <TouchableOpacity 
                style={styles.activeFilterTag}
                onPress={() => setSelectedSubcategory('')}
              >
                <Text style={styles.activeFilterTagText}>
                  {subcategories.find(s => s.id === selectedSubcategory)?.name}
                </Text>
                <Ionicons name="close-circle" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {selectedCondition && (
              <TouchableOpacity 
                style={styles.activeFilterTag}
                onPress={() => setSelectedCondition('')}
              >
                <Text style={styles.activeFilterTagText}>{selectedCondition}</Text>
                <Ionicons name="close-circle" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {(priceRange.min || priceRange.max) && (
              <TouchableOpacity 
                style={styles.activeFilterTag}
                onPress={() => { setPriceRange({ min: '', max: '' }); fetchData(true); }}
              >
                <Text style={styles.activeFilterTagText}>
                  €{priceRange.min || '0'} - €{priceRange.max || 'Any'}
                </Text>
                <Ionicons name="close-circle" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {Object.entries(activeFilters).filter(([_, v]) => v).map(([key, value]) => (
              <TouchableOpacity 
                key={key}
                style={styles.activeFilterTag}
                onPress={() => {
                  setActiveFilters(prev => ({ ...prev, [key]: undefined }));
                  fetchData(true);
                }}
              >
                <Text style={styles.activeFilterTagText}>{value}</Text>
                <Ionicons name="close-circle" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Listings Grid */}
      {isSingleColumn ? (
        <FlatList
          data={listings}
          renderItem={renderListingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={isAutoCategory ? styles.autoListContent : styles.propertyListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      ) : (
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
      )}

      {/* Filters Modal */}
      {renderFiltersModal()}
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
  
  // Subcategories Bar
  subcategoriesBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subcategoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subcategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  subcategoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subcategoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  subcategoryChipTextSelected: {
    color: '#fff',
  },

  // Results Bar
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterCountBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Active Filters Bar
  activeFiltersBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    marginRight: 8,
  },
  activeFilterTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
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
  subcategoryTag: {
    marginTop: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  subcategoryTagText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
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
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  clearFiltersText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // Filter Chips
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  filterChipCount: {
    marginLeft: 6,
    backgroundColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterChipCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterChipCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipCountTextSelected: {
    color: '#fff',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  clearAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  // Price Range
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  priceInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  priceDivider: {
    paddingHorizontal: 12,
    paddingTop: 18,
  },
  priceDividerText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },

  // Attribute Filters
  attributeFilter: {
    marginTop: 12,
  },
  attributeFilterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  attributeChipsRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },

  // Modal Footer
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Property Card Styles (Single Column - Image on Top)
  propertyListContent: {
    padding: 12,
    flexGrow: 1,
  },
  propertyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  propertyImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
  },
  propertyFeaturedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  propertyFeaturedText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  propertyFavoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  propertyTypeBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  propertyTypeBadgeText: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  propertyCardContent: {
    padding: 12,
  },
  propertyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  negotiableTag: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  propertyFeatures: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureDivider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  propertyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propertyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  propertyLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  // Auto Card Styles (Single Column - Image on Left)
  autoListContent: {
    padding: 12,
    flexGrow: 1,
  },
  autoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  autoCardRow: {
    flexDirection: 'row',
    position: 'relative',
  },
  autoImageContainer: {
    width: 130,
    height: 100,
    position: 'relative',
  },
  autoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
  },
  autoFeaturedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  autoFeaturedText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  autoImageCount: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoImageCountText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  autoCardContent: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 36,
  },
  autoPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  autoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 16,
    marginBottom: 4,
  },
  autoHighlights: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  autoLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  autoLocation: {
    fontSize: 10,
    color: COLORS.textLight,
    flex: 1,
  },
  autoDate: {
    fontSize: 9,
    color: COLORS.textLight,
  },
  autoFavoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
