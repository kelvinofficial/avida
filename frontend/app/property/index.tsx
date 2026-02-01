import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import {
  Property,
  PropertyPurpose,
  PropertyFilters,
  PROPERTY_TYPE_CATEGORIES,
  FACILITIES_LIST,
  PropertyType,
} from '../../src/types/property';

// API URL
const API_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

const { width } = Dimensions.get('window');

// Layout constants
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = width - HORIZONTAL_PADDING * 2;

// Colors
const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  secondary: '#1565C0',
  secondaryLight: '#E3F2FD',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#333333',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#FF9800',
  verified: '#4CAF50',
};

// ============ PROPERTY TYPE TILE ============
interface PropertyTypeTileProps {
  id: string;
  name: string;
  icon: string;
  count: number;
  onPress: () => void;
}

const PropertyTypeTile = memo<PropertyTypeTileProps>(({ name, icon, count, onPress }) => (
  <TouchableOpacity style={tileStyles.container} onPress={onPress} activeOpacity={0.7}>
    <View style={tileStyles.iconBox}>
      <Ionicons name={icon as any} size={24} color={COLORS.primary} />
    </View>
    <Text style={tileStyles.name} numberOfLines={1}>{name}</Text>
    <Text style={tileStyles.count}>{count} listings</Text>
  </TouchableOpacity>
));

const tileStyles = StyleSheet.create({
  container: {
    width: (width - HORIZONTAL_PADDING * 2 - 12 * 3) / 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  count: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

// ============ PROPERTY CARD ============
interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  onFavorite: () => void;
  onChat: () => void;
  onCall: () => void;
  isFavorited: boolean;
}

const PropertyCard = memo<PropertyCardProps>(({ property, onPress, onFavorite, onChat, onCall, isFavorited }) => {
  const formatPrice = (price: number, perMonth?: boolean) => {
    const formatted = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: property.currency,
      minimumFractionDigits: 0,
    }).format(price);
    return perMonth ? `${formatted}/mo` : formatted;
  };

  return (
    <TouchableOpacity style={cardStyles.container} onPress={onPress} activeOpacity={0.95}>
      {property.sponsored && <View style={cardStyles.sponsoredBorder} />}
      
      {/* Image */}
      <View style={cardStyles.imageContainer}>
        <Image source={{ uri: property.images[0] }} style={cardStyles.image} resizeMode="cover" />
        
        {/* Badges */}
        <View style={cardStyles.badgeRow}>
          {property.featured && (
            <View style={cardStyles.featuredBadge}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={cardStyles.featuredText}>Featured</Text>
            </View>
          )}
          {property.verification.isVerified && (
            <View style={cardStyles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={10} color="#fff" />
              <Text style={cardStyles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        
        {/* Favorite button */}
        <TouchableOpacity style={cardStyles.favoriteBtn} onPress={onFavorite}>
          <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={20} color={isFavorited ? COLORS.error : '#fff'} />
        </TouchableOpacity>
        
        {/* Image count */}
        {property.images.length > 1 && (
          <View style={cardStyles.imageCount}>
            <Ionicons name="camera" size={12} color="#fff" />
            <Text style={cardStyles.imageCountText}>{property.images.length}</Text>
          </View>
        )}
        
        {/* Video badge */}
        {property.videoUrl && (
          <View style={cardStyles.videoBadge}>
            <Ionicons name="videocam" size={14} color="#fff" />
          </View>
        )}
      </View>
      
      {/* Content */}
      <View style={cardStyles.content}>
        {/* Price */}
        <Text style={cardStyles.price}>
          {formatPrice(property.price, property.pricePerMonth)}
          {property.priceNegotiable && <Text style={cardStyles.negotiable}> (Negotiable)</Text>}
        </Text>
        
        {/* Specs */}
        <View style={cardStyles.specs}>
          {property.bedrooms && (
            <View style={cardStyles.specItem}>
              <Ionicons name="bed" size={14} color={COLORS.textSecondary} />
              <Text style={cardStyles.specText}>{property.bedrooms}</Text>
            </View>
          )}
          {property.bathrooms && (
            <View style={cardStyles.specItem}>
              <Ionicons name="water" size={14} color={COLORS.textSecondary} />
              <Text style={cardStyles.specText}>{property.bathrooms}</Text>
            </View>
          )}
          {property.size && (
            <View style={cardStyles.specItem}>
              <Ionicons name="resize" size={14} color={COLORS.textSecondary} />
              <Text style={cardStyles.specText}>{property.size} {property.sizeUnit}</Text>
            </View>
          )}
        </View>
        
        {/* Title */}
        <Text style={cardStyles.title} numberOfLines={2}>{property.title}</Text>
        
        {/* Location */}
        <View style={cardStyles.locationRow}>
          <Ionicons name="location" size={12} color={COLORS.textSecondary} />
          <Text style={cardStyles.location}>{property.location.area}, {property.location.city}</Text>
        </View>
        
        {/* Tags */}
        <View style={cardStyles.tags}>
          {property.furnishing === 'furnished' && (
            <View style={cardStyles.tag}>
              <Text style={cardStyles.tagText}>Furnished</Text>
            </View>
          )}
          {property.condition === 'new' && (
            <View style={[cardStyles.tag, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[cardStyles.tagText, { color: COLORS.secondary }]}>Newly Built</Text>
            </View>
          )}
          {property.condition === 'renovated' && (
            <View style={[cardStyles.tag, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[cardStyles.tagText, { color: '#EF6C00' }]}>Renovated</Text>
            </View>
          )}
        </View>
        
        {/* Actions */}
        <View style={cardStyles.actions}>
          <TouchableOpacity style={cardStyles.actionBtn} onPress={onChat}>
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
            <Text style={cardStyles.actionText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.actionBtnPrimary]} onPress={onCall}>
            <Ionicons name="call" size={18} color="#fff" />
            <Text style={[cardStyles.actionText, { color: '#fff' }]}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sponsoredBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.warning,
    zIndex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0F0F0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  featuredText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.verified,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCount: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 14,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  negotiable: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  specs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  location: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

// ============ FILTER MODAL ============
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: PropertyFilters;
  onApply: (filters: PropertyFilters) => void;
  purpose: PropertyPurpose;
}

const FilterModal = memo<FilterModalProps>(({ visible, onClose, filters, onApply, purpose }) => {
  const [localFilters, setLocalFilters] = useState<PropertyFilters>(filters);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={filterStyles.container}>
        <View style={filterStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={filterStyles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={filterStyles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={filterStyles.content} showsVerticalScrollIndicator={false}>
          {/* Price Range */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Price Range ({purpose === 'rent' ? '/month' : 'total'})</Text>
            <View style={filterStyles.row}>
              <TextInput
                style={filterStyles.input}
                placeholder="Min"
                keyboardType="numeric"
                value={localFilters.priceMin?.toString() || ''}
                onChangeText={(t) => setLocalFilters({ ...localFilters, priceMin: t ? parseInt(t) : undefined })}
              />
              <Text style={filterStyles.separator}>-</Text>
              <TextInput
                style={filterStyles.input}
                placeholder="Max"
                keyboardType="numeric"
                value={localFilters.priceMax?.toString() || ''}
                onChangeText={(t) => setLocalFilters({ ...localFilters, priceMax: t ? parseInt(t) : undefined })}
              />
            </View>
          </View>

          {/* Bedrooms */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Bedrooms</Text>
            <View style={filterStyles.optionRow}>
              {['Any', '1', '2', '3', '4', '5+'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    filterStyles.optionChip,
                    localFilters.bedroomsMin?.toString() === option && filterStyles.optionChipActive,
                  ]}
                  onPress={() => setLocalFilters({
                    ...localFilters,
                    bedroomsMin: option === 'Any' ? undefined : parseInt(option),
                  })}
                >
                  <Text style={[
                    filterStyles.optionText,
                    localFilters.bedroomsMin?.toString() === option && filterStyles.optionTextActive,
                  ]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Furnishing */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Furnishing</Text>
            <View style={filterStyles.optionRow}>
              {[
                { value: undefined, label: 'Any' },
                { value: 'furnished', label: 'Furnished' },
                { value: 'semi_furnished', label: 'Semi' },
                { value: 'unfurnished', label: 'Unfurnished' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    filterStyles.optionChip,
                    localFilters.furnishing === option.value && filterStyles.optionChipActive,
                  ]}
                  onPress={() => setLocalFilters({ ...localFilters, furnishing: option.value as any })}
                >
                  <Text style={[
                    filterStyles.optionText,
                    localFilters.furnishing === option.value && filterStyles.optionTextActive,
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Condition */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Condition</Text>
            <View style={filterStyles.optionRow}>
              {[
                { value: undefined, label: 'Any' },
                { value: 'new', label: 'New' },
                { value: 'renovated', label: 'Renovated' },
                { value: 'old', label: 'Old' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    filterStyles.optionChip,
                    localFilters.condition === option.value && filterStyles.optionChipActive,
                  ]}
                  onPress={() => setLocalFilters({ ...localFilters, condition: option.value as any })}
                >
                  <Text style={[
                    filterStyles.optionText,
                    localFilters.condition === option.value && filterStyles.optionTextActive,
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Verified Only */}
          <View style={filterStyles.section}>
            <TouchableOpacity
              style={filterStyles.checkRow}
              onPress={() => setLocalFilters({ ...localFilters, verifiedOnly: !localFilters.verifiedOnly })}
            >
              <View style={[filterStyles.checkbox, localFilters.verifiedOnly && filterStyles.checkboxActive]}>
                {localFilters.verifiedOnly && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={filterStyles.checkLabel}>Verified properties only</Text>
            </TouchableOpacity>
          </View>

          {/* Facilities */}
          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionTitle}>Facilities</Text>
            <View style={filterStyles.facilityGrid}>
              {FACILITIES_LIST.slice(0, 12).map((facility) => (
                <TouchableOpacity
                  key={facility.id}
                  style={[
                    filterStyles.facilityChip,
                    localFilters.facilities?.includes(facility.id as any) && filterStyles.facilityChipActive,
                  ]}
                  onPress={() => {
                    const current = localFilters.facilities || [];
                    const updated = current.includes(facility.id as any)
                      ? current.filter((f) => f !== facility.id)
                      : [...current, facility.id as any];
                    setLocalFilters({ ...localFilters, facilities: updated });
                  }}
                >
                  <Ionicons
                    name={facility.icon as any}
                    size={16}
                    color={localFilters.facilities?.includes(facility.id as any) ? '#fff' : COLORS.textSecondary}
                  />
                  <Text style={[
                    filterStyles.facilityText,
                    localFilters.facilities?.includes(facility.id as any) && filterStyles.facilityTextActive,
                  ]}>{facility.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={filterStyles.footer}>
          <TouchableOpacity style={filterStyles.applyBtn} onPress={handleApply}>
            <Text style={filterStyles.applyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const filterStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  resetText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: HORIZONTAL_PADDING },
  section: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  separator: { fontSize: 16, color: COLORS.textSecondary },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  optionChipActive: { backgroundColor: COLORS.primary },
  optionText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  optionTextActive: { color: '#fff' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkLabel: { fontSize: 14, color: COLORS.text },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    gap: 6,
  },
  facilityChipActive: { backgroundColor: COLORS.primary },
  facilityText: { fontSize: 12, color: COLORS.textSecondary },
  facilityTextActive: { color: '#fff' },
  footer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ============ MAIN PROPERTY SCREEN ============
export default function PropertyScreen() {
  const router = useRouter();
  const [purpose, setPurpose] = useState<PropertyPurpose>('rent');
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Filter properties
  const filteredProperties = useMemo(() => {
    return MOCK_PROPERTIES.filter((p) => {
      if (p.purpose !== purpose) return false;
      if (filters.priceMin && p.price < filters.priceMin) return false;
      if (filters.priceMax && p.price > filters.priceMax) return false;
      if (filters.bedroomsMin && (p.bedrooms || 0) < filters.bedroomsMin) return false;
      if (filters.furnishing && p.furnishing !== filters.furnishing) return false;
      if (filters.condition && p.condition !== filters.condition) return false;
      if (filters.verifiedOnly && !p.verification.isVerified) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          p.title.toLowerCase().includes(q) ||
          p.location.city.toLowerCase().includes(q) ||
          p.location.area.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [purpose, filters, searchQuery]);

  const getSearchPlaceholder = () => {
    return purpose === 'buy'
      ? 'Find your dream plot / house / apartment'
      : 'Find apartments, houses, short lets';
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleCall = (property: Property) => {
    if (property.seller.phone) {
      Linking.openURL(`tel:${property.seller.phone}`);
    }
  };

  const handleChat = (property: Property) => {
    Alert.alert('Start Chat', `Send a message to ${property.seller.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Chat', onPress: () => router.push(`/property/${property.id}`) },
    ]);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Property type counts
  const getTypeCount = (typeId: string) => {
    return MOCK_PROPERTIES.filter((p) => p.type === typeId && p.purpose === purpose).length;
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Nav Tabs */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => router.push('/')}>
          <Text style={styles.navTabText}>avida</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navTab} onPress={() => router.push('/auto')}>
          <Text style={styles.navTabText}>Motors</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navTab, styles.navTabActive]}>
          <Text style={[styles.navTabText, styles.navTabTextActive]}>Property</Text>
        </TouchableOpacity>
      </View>

      {/* Buy / Rent Toggle */}
      <View style={styles.purposeToggle}>
        <TouchableOpacity
          style={[styles.purposeBtn, purpose === 'buy' && styles.purposeBtnActive]}
          onPress={() => setPurpose('buy')}
        >
          <Text style={[styles.purposeText, purpose === 'buy' && styles.purposeTextActive]}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.purposeBtn, purpose === 'rent' && styles.purposeBtnActive]}
          onPress={() => setPurpose('rent')}
        >
          <Text style={[styles.purposeText, purpose === 'rent' && styles.purposeTextActive]}>Rent</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={getSearchPlaceholder()}
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterChip} onPress={() => setShowFilters(true)}>
          <Ionicons name="options" size={18} color={COLORS.primary} />
          <Text style={styles.filterChipText}>Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Ionicons name="location" size={18} color={COLORS.primary} />
          <Text style={styles.filterChipText}>Berlin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Ionicons name="pricetag" size={18} color={COLORS.primary} />
          <Text style={styles.filterChipText}>Price</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Property Type Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Property Types</Text>
      </View>

      {/* Residential */}
      <Text style={styles.categoryLabel}>Residential</Text>
      <View style={styles.typeGrid}>
        {PROPERTY_TYPE_CATEGORIES.residential.map((type) => (
          <PropertyTypeTile
            key={type.id}
            id={type.id}
            name={type.name}
            icon={type.icon}
            count={getTypeCount(type.id)}
            onPress={() => setFilters({ ...filters, type: type.id as PropertyType })}
          />
        ))}
      </View>

      {/* Land */}
      <Text style={styles.categoryLabel}>Land</Text>
      <View style={styles.typeGrid}>
        {PROPERTY_TYPE_CATEGORIES.land.map((type) => (
          <PropertyTypeTile
            key={type.id}
            id={type.id}
            name={type.name}
            icon={type.icon}
            count={getTypeCount(type.id)}
            onPress={() => setFilters({ ...filters, type: type.id as PropertyType })}
          />
        ))}
      </View>

      {/* Commercial */}
      <Text style={styles.categoryLabel}>Commercial</Text>
      <View style={styles.typeGrid}>
        {PROPERTY_TYPE_CATEGORIES.commercial.slice(0, 4).map((type) => (
          <PropertyTypeTile
            key={type.id}
            id={type.id}
            name={type.name}
            icon={type.icon}
            count={getTypeCount(type.id)}
            onPress={() => setFilters({ ...filters, type: type.id as PropertyType })}
          />
        ))}
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {filteredProperties.length} Properties for {purpose === 'buy' ? 'Sale' : 'Rent'}
        </Text>
        <TouchableOpacity style={styles.sortBtn}>
          <Ionicons name="swap-vertical" size={18} color={COLORS.primary} />
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <PropertyCard
              property={item}
              onPress={() => router.push(`/property/${item.id}`)}
              onFavorite={() => toggleFavorite(item.id)}
              onChat={() => handleChat(item)}
              onCall={() => handleCall(item)}
              isFavorited={favorites.has(item.id)}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      />

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
        purpose={purpose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.surface,
    paddingBottom: 16,
  },
  topNav: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    gap: 20,
  },
  navTab: {
    paddingVertical: 8,
  },
  navTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  navTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  navTabTextActive: {
    color: COLORS.primary,
  },
  purposeToggle: {
    flexDirection: 'row',
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 16,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 4,
  },
  purposeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  purposeBtnActive: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  purposeText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  purposeTextActive: {
    color: COLORS.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 16,
  },
  sectionHeader: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  listContent: {
    paddingBottom: 100,
  },
  cardContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
});
