import React, { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react';
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
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../src/utils/api';
import {
  Property,
  PropertyPurpose,
  PropertyFilters,
  PROPERTY_TYPE_CATEGORIES,
  FACILITIES_LIST,
  PropertyType,
  FurnishingType,
  ConditionType,
} from '../../src/types/property';

const { width, height } = Dimensions.get('window');

// Layout constants
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = width - HORIZONTAL_PADDING * 2;

// Colors - Material 3 inspired
const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  secondary: '#1565C0',
  secondaryLight: '#E3F2FD',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  background: '#FAFAFA',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#FF9800',
  success: '#4CAF50',
  verified: '#4CAF50',
  divider: '#EEEEEE',
};

// German Cities with Areas
const LOCATION_DATA = {
  Germany: {
    Berlin: ['Mitte', 'Kreuzberg', 'Prenzlauer Berg', 'Charlottenburg', 'Friedrichshain', 'Neukölln', 'Schöneberg', 'Wedding', 'Spandau', 'Steglitz'],
    Munich: ['Schwabing', 'Maxvorstadt', 'Haidhausen', 'Sendling', 'Bogenhausen', 'Lehel', 'Au', 'Giesing', 'Pasing', 'Trudering'],
    Hamburg: ['Altona', 'Eimsbüttel', 'Wandsbek', 'Harburg', 'Bergedorf', 'St. Pauli', 'HafenCity', 'Eppendorf', 'Winterhude', 'Blankenese'],
    Frankfurt: ['Sachsenhausen', 'Nordend', 'Bornheim', 'Bockenheim', 'Westend', 'Ostend', 'Gallus', 'Niederrad', 'Rödelheim', 'Höchst'],
    Cologne: ['Altstadt', 'Neustadt', 'Ehrenfeld', 'Nippes', 'Lindenthal', 'Rodenkirchen', 'Porz', 'Kalk', 'Mülheim', 'Deutz'],
    Stuttgart: ['Mitte', 'West', 'Ost', 'Süd', 'Nord', 'Bad Cannstatt', 'Vaihingen', 'Möhringen', 'Degerloch', 'Feuerbach'],
    Düsseldorf: ['Altstadt', 'Carlstadt', 'Pempelfort', 'Oberkassel', 'Flingern', 'Bilk', 'Unterbilk', 'Friedrichstadt', 'Derendorf', 'Golzheim'],
    Leipzig: ['Zentrum', 'Connewitz', 'Plagwitz', 'Lindenau', 'Gohlis', 'Reudnitz', 'Südvorstadt', 'Schleußig', 'Leutzsch', 'Mockau'],
    Dresden: ['Altstadt', 'Neustadt', 'Blasewitz', 'Striesen', 'Loschwitz', 'Pieschen', 'Cotta', 'Plauen', 'Prohlis', 'Laubegast'],
    Hannover: ['Mitte', 'Linden', 'Nordstadt', 'Südstadt', 'List', 'Vahrenwald', 'Bothfeld', 'Ricklingen', 'Döhren', 'Herrenhausen'],
  },
};

const GERMAN_CITIES = Object.keys(LOCATION_DATA.Germany);

// Popular landmarks by city
const LANDMARKS: Record<string, string[]> = {
  Berlin: ['Brandenburg Gate', 'Alexanderplatz', 'Potsdamer Platz', 'Kurfürstendamm', 'East Side Gallery'],
  Munich: ['Marienplatz', 'English Garden', 'Olympiapark', 'BMW World', 'Viktualienmarkt'],
  Hamburg: ['Elbphilharmonie', 'Reeperbahn', 'Speicherstadt', 'Jungfernstieg', 'Landungsbrücken'],
  Frankfurt: ['Römerberg', 'Main Tower', 'Palmengarten', 'Zeil', 'Sachsenhausen'],
};

// Recent searches storage key
const RECENT_SEARCHES_KEY = 'property_recent_searches';

// ============ SMART SEARCH BAR ============
interface SmartSearchBarProps {
  purpose: PropertyPurpose;
  value: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  selectedCity: string;
}

const SmartSearchBar = memo<SmartSearchBarProps>(({ purpose, value, onChangeText, onFocus, selectedCity }) => {
  const placeholder = purpose === 'buy'
    ? 'Find your dream plot / house / apartment'
    : 'Find apartments, houses, short lets';

  return (
    <TouchableOpacity style={searchStyles.container} onPress={onFocus} activeOpacity={0.9}>
      <View style={searchStyles.iconContainer}>
        <Ionicons name="search" size={20} color={COLORS.primary} />
      </View>
      <TextInput
        style={searchStyles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={searchStyles.clearBtn}>
          <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={searchStyles.locationBadge}>
          <Ionicons name="location" size={14} color={COLORS.primary} />
          <Text style={searchStyles.locationText}>{selectedCity}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const searchStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: 16,
    paddingHorizontal: 4,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  clearBtn: {
    padding: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

// ============ SEARCH MODAL (Auto-suggest + Recent) ============
interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  selectedCity: string;
}

const SearchModal = memo<SearchModalProps>(({ visible, onClose, onSearch, selectedCity }) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Load recent searches
  useEffect(() => {
    if (visible) {
      loadRecentSearches();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {
      console.error('Error loading recent searches:', e);
    }
  };

  const saveSearch = async (searchQuery: string) => {
    try {
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (e) {
      console.error('Error saving search:', e);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      saveSearch(searchQuery.trim());
      onSearch(searchQuery.trim());
    }
    onClose();
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (e) {
      console.error('Error clearing recent searches:', e);
    }
  };

  // Popular searches for the selected city
  const popularSearches = [
    `${selectedCity} apartment for rent`,
    `${selectedCity} house for sale`,
    `Furnished apartments ${selectedCity}`,
    `Studio apartment ${selectedCity}`,
    `Family house ${selectedCity}`,
  ];

  // Auto-suggestions based on query
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: string[] = [];
    
    // Suggest areas
    const areas = LOCATION_DATA.Germany[selectedCity as keyof typeof LOCATION_DATA.Germany] || [];
    areas.forEach(area => {
      if (area.toLowerCase().includes(q)) {
        results.push(`${area}, ${selectedCity}`);
      }
    });
    
    // Suggest landmarks
    const landmarks = LANDMARKS[selectedCity] || [];
    landmarks.forEach(landmark => {
      if (landmark.toLowerCase().includes(q)) {
        results.push(`Near ${landmark}, ${selectedCity}`);
      }
    });
    
    // Property type suggestions
    const types = ['Apartment', 'House', 'Studio', 'Villa', 'Penthouse', 'Loft', 'Office', 'Shop'];
    types.forEach(type => {
      if (type.toLowerCase().includes(q)) {
        results.push(`${type} in ${selectedCity}`);
      }
    });
    
    return results.slice(0, 6);
  }, [query, selectedCity]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={searchModalStyles.container}>
        {/* Header */}
        <View style={searchModalStyles.header}>
          <TouchableOpacity onPress={onClose} style={searchModalStyles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={searchModalStyles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              ref={inputRef}
              style={searchModalStyles.searchInput}
              placeholder="Search properties..."
              placeholderTextColor={COLORS.textSecondary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch(query)}
              returnKeyType="search"
            />
            {query && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={searchModalStyles.content} keyboardShouldPersistTaps="handled">
          {/* Auto-suggestions */}
          {suggestions.length > 0 && (
            <View style={searchModalStyles.section}>
              <Text style={searchModalStyles.sectionTitle}>Suggestions</Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={searchModalStyles.suggestionItem}
                  onPress={() => handleSearch(suggestion)}
                >
                  <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={searchModalStyles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <View style={searchModalStyles.section}>
              <View style={searchModalStyles.sectionHeader}>
                <Text style={searchModalStyles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={searchModalStyles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={searchModalStyles.recentItem}
                  onPress={() => handleSearch(search)}
                >
                  <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={searchModalStyles.recentText}>{search}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const updated = recentSearches.filter((_, i) => i !== index);
                      setRecentSearches(updated);
                      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
                    }}
                  >
                    <Ionicons name="close" size={18} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular Searches */}
          {!query && (
            <View style={searchModalStyles.section}>
              <Text style={searchModalStyles.sectionTitle}>Popular in {selectedCity}</Text>
              {popularSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={searchModalStyles.popularItem}
                  onPress={() => handleSearch(search)}
                >
                  <Ionicons name="trending-up" size={18} color={COLORS.primary} />
                  <Text style={searchModalStyles.popularText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

const searchModalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  content: { flex: 1 },
  section: { paddingHorizontal: HORIZONTAL_PADDING, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  clearText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  suggestionText: { fontSize: 15, color: COLORS.text },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  recentText: { flex: 1, fontSize: 15, color: COLORS.text },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  popularText: { fontSize: 15, color: COLORS.text },
});

// ============ LOCATION FILTER MODAL ============
interface LocationFilterProps {
  visible: boolean;
  onClose: () => void;
  selectedCity: string;
  selectedArea: string;
  onApply: (city: string, area: string, radius: number) => void;
}

const LocationFilterModal = memo<LocationFilterProps>(({ visible, onClose, selectedCity, selectedArea, onApply }) => {
  const [city, setCity] = useState(selectedCity);
  const [area, setArea] = useState(selectedArea);
  const [radius, setRadius] = useState(10);
  const [searchLandmark, setSearchLandmark] = useState('');

  const areas = LOCATION_DATA.Germany[city as keyof typeof LOCATION_DATA.Germany] || [];
  const landmarks = LANDMARKS[city] || [];

  const handleApply = () => {
    onApply(city, area, radius);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={locationStyles.container}>
        {/* Header */}
        <View style={locationStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={locationStyles.headerTitle}>Location</Text>
          <TouchableOpacity onPress={() => { setCity('Berlin'); setArea(''); setRadius(10); }}>
            <Text style={locationStyles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={locationStyles.content} showsVerticalScrollIndicator={false}>
          {/* City Selection */}
          <View style={locationStyles.section}>
            <Text style={locationStyles.sectionTitle}>City</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={locationStyles.cityScroll}>
              {GERMAN_CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[locationStyles.cityChip, city === c && locationStyles.cityChipActive]}
                  onPress={() => { setCity(c); setArea(''); }}
                >
                  <Text style={[locationStyles.cityChipText, city === c && locationStyles.cityChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Area Selection */}
          <View style={locationStyles.section}>
            <Text style={locationStyles.sectionTitle}>Area / District</Text>
            <View style={locationStyles.areaGrid}>
              <TouchableOpacity
                style={[locationStyles.areaChip, !area && locationStyles.areaChipActive]}
                onPress={() => setArea('')}
              >
                <Text style={[locationStyles.areaChipText, !area && locationStyles.areaChipTextActive]}>All Areas</Text>
              </TouchableOpacity>
              {areas.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[locationStyles.areaChip, area === a && locationStyles.areaChipActive]}
                  onPress={() => setArea(a)}
                >
                  <Text style={[locationStyles.areaChipText, area === a && locationStyles.areaChipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Near Landmark */}
          {landmarks.length > 0 && (
            <View style={locationStyles.section}>
              <Text style={locationStyles.sectionTitle}>Near Landmark</Text>
              <View style={locationStyles.landmarkInput}>
                <Ionicons name="location" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={locationStyles.landmarkTextInput}
                  placeholder="Search landmark..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchLandmark}
                  onChangeText={setSearchLandmark}
                />
              </View>
              <View style={locationStyles.landmarkList}>
                {landmarks.filter(l => l.toLowerCase().includes(searchLandmark.toLowerCase())).map((l) => (
                  <TouchableOpacity key={l} style={locationStyles.landmarkItem}>
                    <Ionicons name="pin" size={16} color={COLORS.primary} />
                    <Text style={locationStyles.landmarkText}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Radius Selector */}
          <View style={locationStyles.section}>
            <Text style={locationStyles.sectionTitle}>Search Radius</Text>
            <View style={locationStyles.radiusOptions}>
              {[5, 10, 25, 50, 100].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[locationStyles.radiusChip, radius === r && locationStyles.radiusChipActive]}
                  onPress={() => setRadius(r)}
                >
                  <Text style={[locationStyles.radiusText, radius === r && locationStyles.radiusTextActive]}>{r} km</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={locationStyles.footer}>
          <TouchableOpacity style={locationStyles.applyBtn} onPress={handleApply}>
            <Ionicons name="location" size={20} color="#fff" />
            <Text style={locationStyles.applyText}>Apply Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const locationStyles = StyleSheet.create({
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
  content: { flex: 1 },
  section: { paddingHorizontal: HORIZONTAL_PADDING, paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  cityScroll: { marginHorizontal: -HORIZONTAL_PADDING, paddingHorizontal: HORIZONTAL_PADDING },
  cityChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceVariant,
    marginRight: 10,
  },
  cityChipActive: { backgroundColor: COLORS.primary },
  cityChipText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cityChipTextActive: { color: '#fff' },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  areaChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceVariant,
  },
  areaChipActive: { backgroundColor: COLORS.primary },
  areaChipText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  areaChipTextActive: { color: '#fff' },
  landmarkInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 12,
  },
  landmarkTextInput: { flex: 1, fontSize: 14, color: COLORS.text },
  landmarkList: { gap: 8 },
  landmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 10,
  },
  landmarkText: { fontSize: 14, color: COLORS.text },
  radiusOptions: { flexDirection: 'row', gap: 10 },
  radiusChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceVariant,
  },
  radiusChipActive: { backgroundColor: COLORS.primary },
  radiusText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  radiusTextActive: { color: '#fff' },
  footer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  applyText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ============ ADVANCED FILTER MODAL ============
interface AdvancedFilterProps {
  visible: boolean;
  onClose: () => void;
  filters: PropertyFilters;
  onApply: (filters: PropertyFilters) => void;
  purpose: PropertyPurpose;
}

const AdvancedFilterModal = memo<AdvancedFilterProps>(({ visible, onClose, filters, onApply, purpose }) => {
  const [localFilters, setLocalFilters] = useState<PropertyFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  const toggleFacility = (facilityId: string) => {
    const current = localFilters.facilities || [];
    const updated = current.includes(facilityId as any)
      ? current.filter((f) => f !== facilityId)
      : [...current, facilityId as any];
    setLocalFilters({ ...localFilters, facilities: updated });
  };

  // Group facilities by category
  const facilitiesByCategory = {
    utilities: FACILITIES_LIST.filter(f => f.category === 'utilities'),
    interior: FACILITIES_LIST.filter(f => f.category === 'interior'),
    security: FACILITIES_LIST.filter(f => f.category === 'security'),
    outdoor: FACILITIES_LIST.filter(f => f.category === 'outdoor'),
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={filterStyles.container}>
        {/* Header */}
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
            <View style={filterStyles.sectionHeader}>
              <Ionicons name="pricetag" size={20} color={COLORS.primary} />
              <Text style={filterStyles.sectionTitle}>Price Range</Text>
              <Text style={filterStyles.sectionSubtitle}>
                {purpose === 'rent' ? 'Per month' : 'Total price'}
              </Text>
            </View>
            <View style={filterStyles.priceRow}>
              <View style={filterStyles.priceInputContainer}>
                <Text style={filterStyles.priceLabel}>Min</Text>
                <TextInput
                  style={filterStyles.priceInput}
                  placeholder="€0"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                  value={localFilters.priceMin?.toString() || ''}
                  onChangeText={(t) => setLocalFilters({ ...localFilters, priceMin: t ? parseInt(t) : undefined })}
                />
              </View>
              <View style={filterStyles.priceSeparator}>
                <Text style={filterStyles.priceSeparatorText}>—</Text>
              </View>
              <View style={filterStyles.priceInputContainer}>
                <Text style={filterStyles.priceLabel}>Max</Text>
                <TextInput
                  style={filterStyles.priceInput}
                  placeholder="No limit"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                  value={localFilters.priceMax?.toString() || ''}
                  onChangeText={(t) => setLocalFilters({ ...localFilters, priceMax: t ? parseInt(t) : undefined })}
                />
              </View>
            </View>
          </View>

          {/* Property Details */}
          <View style={filterStyles.section}>
            <View style={filterStyles.sectionHeader}>
              <Ionicons name="home" size={20} color={COLORS.primary} />
              <Text style={filterStyles.sectionTitle}>Property Details</Text>
            </View>

            {/* Bedrooms */}
            <Text style={filterStyles.fieldLabel}>Bedrooms</Text>
            <View style={filterStyles.optionRow}>
              {['Any', '1', '2', '3', '4', '5+'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    filterStyles.optionChip,
                    (option === 'Any' && !localFilters.bedroomsMin) && filterStyles.optionChipActive,
                    (localFilters.bedroomsMin?.toString() === option) && filterStyles.optionChipActive,
                  ]}
                  onPress={() => setLocalFilters({
                    ...localFilters,
                    bedroomsMin: option === 'Any' ? undefined : parseInt(option.replace('+', '')),
                  })}
                >
                  <Text style={[
                    filterStyles.optionText,
                    ((option === 'Any' && !localFilters.bedroomsMin) || localFilters.bedroomsMin?.toString() === option) && filterStyles.optionTextActive,
                  ]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bathrooms */}
            <Text style={filterStyles.fieldLabel}>Bathrooms</Text>
            <View style={filterStyles.optionRow}>
              {['Any', '1', '2', '3', '4+'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    filterStyles.optionChip,
                    (option === 'Any' && !localFilters.bathroomsMin) && filterStyles.optionChipActive,
                    (localFilters.bathroomsMin?.toString() === option) && filterStyles.optionChipActive,
                  ]}
                  onPress={() => setLocalFilters({
                    ...localFilters,
                    bathroomsMin: option === 'Any' ? undefined : parseInt(option.replace('+', '')),
                  })}
                >
                  <Text style={[
                    filterStyles.optionText,
                    ((option === 'Any' && !localFilters.bathroomsMin) || localFilters.bathroomsMin?.toString() === option) && filterStyles.optionTextActive,
                  ]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Property Size */}
            <Text style={filterStyles.fieldLabel}>Property Size (sqm)</Text>
            <View style={filterStyles.sizeRow}>
              <TextInput
                style={filterStyles.sizeInput}
                placeholder="Min"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
                value={localFilters.sizeMin?.toString() || ''}
                onChangeText={(t) => setLocalFilters({ ...localFilters, sizeMin: t ? parseInt(t) : undefined })}
              />
              <Text style={filterStyles.sizeSeparator}>—</Text>
              <TextInput
                style={filterStyles.sizeInput}
                placeholder="Max"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
                value={localFilters.sizeMax?.toString() || ''}
                onChangeText={(t) => setLocalFilters({ ...localFilters, sizeMax: t ? parseInt(t) : undefined })}
              />
            </View>

            {/* Furnishing */}
            <Text style={filterStyles.fieldLabel}>Furnishing</Text>
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
                    (!localFilters.furnishing && !option.value) && filterStyles.optionChipActive,
                  ]}
                  onPress={() => setLocalFilters({ ...localFilters, furnishing: option.value as FurnishingType | undefined })}
                >
                  <Text style={[
                    filterStyles.optionText,
                    (localFilters.furnishing === option.value || (!localFilters.furnishing && !option.value)) && filterStyles.optionTextActive,
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Condition */}
            <Text style={filterStyles.fieldLabel}>Condition</Text>
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
                    (!localFilters.condition && !option.value) && filterStyles.optionChipActive,
                  ]}
                  onPress={() => setLocalFilters({ ...localFilters, condition: option.value as ConditionType | undefined })}
                >
                  <Text style={[
                    filterStyles.optionText,
                    (localFilters.condition === option.value || (!localFilters.condition && !option.value)) && filterStyles.optionTextActive,
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Legal & Trust */}
          <View style={filterStyles.section}>
            <View style={filterStyles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
              <Text style={filterStyles.sectionTitle}>Legal & Trust</Text>
            </View>
            
            <TouchableOpacity
              style={filterStyles.trustOption}
              onPress={() => setLocalFilters({ ...localFilters, verifiedOnly: !localFilters.verifiedOnly })}
            >
              <View style={[filterStyles.checkbox, localFilters.verifiedOnly && filterStyles.checkboxActive]}>
                {localFilters.verifiedOnly && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <View style={filterStyles.trustInfo}>
                <Text style={filterStyles.trustLabel}>Verified Properties Only</Text>
                <Text style={filterStyles.trustDesc}>Documents checked & address confirmed</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={filterStyles.trustOption}>
              <View style={filterStyles.checkbox}>
              </View>
              <View style={filterStyles.trustInfo}>
                <Text style={filterStyles.trustLabel}>Title Deed Available</Text>
                <Text style={filterStyles.trustDesc}>Property has valid title documentation</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={filterStyles.trustOption}>
              <View style={filterStyles.checkbox}>
              </View>
              <View style={filterStyles.trustInfo}>
                <Text style={filterStyles.trustLabel}>Agent Verified</Text>
                <Text style={filterStyles.trustDesc}>Listed by a verified agent</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={filterStyles.trustOption}>
              <View style={filterStyles.checkbox}>
              </View>
              <View style={filterStyles.trustInfo}>
                <Text style={filterStyles.trustLabel}>Owner Direct</Text>
                <Text style={filterStyles.trustDesc}>Listed directly by property owner</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Facilities */}
          <View style={filterStyles.section}>
            <View style={filterStyles.sectionHeader}>
              <Ionicons name="apps" size={20} color={COLORS.primary} />
              <Text style={filterStyles.sectionTitle}>Facilities</Text>
            </View>

            {/* Utilities */}
            <Text style={filterStyles.facilityCategory}>Utilities</Text>
            <View style={filterStyles.facilityGrid}>
              {facilitiesByCategory.utilities.map((facility) => (
                <TouchableOpacity
                  key={facility.id}
                  style={[
                    filterStyles.facilityChip,
                    localFilters.facilities?.includes(facility.id as any) && filterStyles.facilityChipActive,
                  ]}
                  onPress={() => toggleFacility(facility.id)}
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

            {/* Interior */}
            <Text style={filterStyles.facilityCategory}>Interior</Text>
            <View style={filterStyles.facilityGrid}>
              {facilitiesByCategory.interior.map((facility) => (
                <TouchableOpacity
                  key={facility.id}
                  style={[
                    filterStyles.facilityChip,
                    localFilters.facilities?.includes(facility.id as any) && filterStyles.facilityChipActive,
                  ]}
                  onPress={() => toggleFacility(facility.id)}
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

            {/* Security */}
            <Text style={filterStyles.facilityCategory}>Security</Text>
            <View style={filterStyles.facilityGrid}>
              {facilitiesByCategory.security.map((facility) => (
                <TouchableOpacity
                  key={facility.id}
                  style={[
                    filterStyles.facilityChip,
                    localFilters.facilities?.includes(facility.id as any) && filterStyles.facilityChipActive,
                  ]}
                  onPress={() => toggleFacility(facility.id)}
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

            {/* Outdoor */}
            <Text style={filterStyles.facilityCategory}>Outdoor</Text>
            <View style={filterStyles.facilityGrid}>
              {facilitiesByCategory.outdoor.map((facility) => (
                <TouchableOpacity
                  key={facility.id}
                  style={[
                    filterStyles.facilityChip,
                    localFilters.facilities?.includes(facility.id as any) && filterStyles.facilityChipActive,
                  ]}
                  onPress={() => toggleFacility(facility.id)}
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

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Footer */}
        <View style={filterStyles.footer}>
          <TouchableOpacity style={filterStyles.applyBtn} onPress={handleApply}>
            <Text style={filterStyles.applyText}>Show Results</Text>
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
  content: { flex: 1 },
  section: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 'auto' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 12, marginTop: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInputContainer: { flex: 1 },
  priceLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  priceInput: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceVariant,
  },
  priceSeparator: { paddingTop: 20 },
  priceSeparatorText: { fontSize: 16, color: COLORS.textSecondary },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceVariant,
  },
  optionChipActive: { backgroundColor: COLORS.primary },
  optionText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  optionTextActive: { color: '#fff' },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sizeInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  sizeSeparator: { fontSize: 16, color: COLORS.textSecondary },
  trustOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  trustInfo: { flex: 1 },
  trustLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  trustDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  facilityCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 10,
  },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceVariant,
    gap: 6,
  },
  facilityChipActive: { backgroundColor: COLORS.primary },
  facilityText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
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
    borderRadius: 14,
    alignItems: 'center',
  },
  applyText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ============ PROPERTY TYPE TILE ============
interface PropertyTypeTileProps {
  id: string;
  name: string;
  icon: string;
  count: number;
  onPress: () => void;
  isSelected: boolean;
}

const PropertyTypeTile = memo<PropertyTypeTileProps>(({ name, icon, count, onPress, isSelected }) => (
  <TouchableOpacity 
    style={[tileStyles.container, isSelected && tileStyles.containerSelected]} 
    onPress={onPress} 
    activeOpacity={0.7}
  >
    <View style={[tileStyles.iconBox, isSelected && tileStyles.iconBoxSelected]}>
      <Ionicons name={icon as any} size={22} color={isSelected ? '#fff' : COLORS.primary} />
    </View>
    <Text style={[tileStyles.name, isSelected && tileStyles.nameSelected]} numberOfLines={2}>{name}</Text>
    <Text style={tileStyles.count}>{count} listings</Text>
  </TouchableOpacity>
));

const tileStyles = StyleSheet.create({
  container: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 12,
    padding: 6,
    borderRadius: 12,
  },
  containerSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBoxSelected: {
    backgroundColor: COLORS.primary,
  },
  name: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 13,
  },
  nameSelected: {
    color: COLORS.primary,
  },
  count: {
    fontSize: 9,
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
      currency: property.currency || 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
    return perMonth ? `${formatted}/mo` : formatted;
  };

  return (
    <TouchableOpacity style={cardStyles.container} onPress={onPress} activeOpacity={0.95}>
      {property.sponsored && <View style={cardStyles.sponsoredBorder} />}
      
      {/* Image */}
      <View style={cardStyles.imageContainer}>
        <Image 
          source={{ uri: property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800' }} 
          style={cardStyles.image} 
          resizeMode="cover" 
        />
        
        {/* Badges */}
        <View style={cardStyles.badgeRow}>
          {property.featured && (
            <View style={cardStyles.featuredBadge}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={cardStyles.featuredText}>Featured</Text>
            </View>
          )}
          {property.verification?.isVerified && (
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
        {property.images && property.images.length > 1 && (
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
          {property.priceNegotiable && <Text style={cardStyles.negotiable}> (VB)</Text>}
        </Text>
        
        {/* Specs */}
        <View style={cardStyles.specs}>
          {property.bedrooms && (
            <View style={cardStyles.specItem}>
              <Ionicons name="bed-outline" size={14} color={COLORS.textSecondary} />
              <Text style={cardStyles.specText}>{property.bedrooms} Beds</Text>
            </View>
          )}
          {property.bathrooms && (
            <View style={cardStyles.specItem}>
              <Ionicons name="water-outline" size={14} color={COLORS.textSecondary} />
              <Text style={cardStyles.specText}>{property.bathrooms} Baths</Text>
            </View>
          )}
          {property.size && (
            <View style={cardStyles.specItem}>
              <Ionicons name="resize-outline" size={14} color={COLORS.textSecondary} />
              <Text style={cardStyles.specText}>{property.size} {property.sizeUnit || 'sqm'}</Text>
            </View>
          )}
        </View>
        
        {/* Title */}
        <Text style={cardStyles.title} numberOfLines={2}>{property.title}</Text>
        
        {/* Location */}
        <View style={cardStyles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text style={cardStyles.location} numberOfLines={1}>
            {property.location?.area ? `${property.location.area}, ` : ''}{property.location?.city || 'Berlin'}
          </Text>
        </View>
        
        {/* Tags */}
        <View style={cardStyles.tags}>
          {property.furnishing === 'furnished' && (
            <View style={cardStyles.tag}>
              <Text style={cardStyles.tagText}>Furnished</Text>
            </View>
          )}
          {property.condition === 'new' && (
            <View style={[cardStyles.tag, { backgroundColor: COLORS.secondaryLight }]}>
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
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: COLORS.surfaceVariant,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  featuredText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 10,
  },
  negotiable: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  specs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  location: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
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
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
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

// ============ MAIN PROPERTY SCREEN ============
export default function PropertyScreen() {
  const router = useRouter();
  const [purpose, setPurpose] = useState<PropertyPurpose>('rent');
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedCity, setSelectedCity] = useState('Berlin');
  const [selectedArea, setSelectedArea] = useState('');
  const [searchRadius, setSearchRadius] = useState(10);
  const [selectedType, setSelectedType] = useState<PropertyType | null>(null);
  
  // API state
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});

  // Fetch properties from API
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        purpose,
        limit: 50,
      };
      
      if (filters.priceMin) params.price_min = filters.priceMin;
      if (filters.priceMax) params.price_max = filters.priceMax;
      if (filters.bedroomsMin) params.bedrooms_min = filters.bedroomsMin;
      if (filters.furnishing) params.furnishing = filters.furnishing;
      if (filters.condition) params.condition = filters.condition;
      if (filters.verifiedOnly) params.verified_only = true;
      if (selectedType) params.property_type = selectedType;
      if (searchQuery) params.search = searchQuery;
      if (selectedCity) params.city = selectedCity;
      if (selectedArea) params.area = selectedArea;
      
      const response = await api.get('/property/listings', { params });
      setProperties(response.data.listings || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }, [purpose, filters, searchQuery, selectedType, selectedCity, selectedArea]);

  // Fetch type counts
  const fetchTypeCounts = useCallback(async () => {
    try {
      const response = await api.get('/property/type-counts', {
        params: { purpose }
      });
      setTypeCounts(response.data || {});
    } catch (error) {
      console.error('Error fetching type counts:', error);
    }
  }, [purpose]);

  // Initial fetch and refetch on changes
  useEffect(() => {
    fetchProperties();
    fetchTypeCounts();
  }, [fetchProperties, fetchTypeCounts]);

  const toggleFavorite = async (id: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleCall = (property: Property) => {
    if (property.seller?.phone) {
      Linking.openURL(`tel:${property.seller.phone}`);
    } else {
      Alert.alert('No phone number', 'This seller has not provided a phone number.');
    }
  };

  const handleChat = (property: Property) => {
    router.push(`/property/chat/${property.id}`);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchProperties(), fetchTypeCounts()]).finally(() => {
      setRefreshing(false);
    });
  }, [fetchProperties, fetchTypeCounts]);

  const handleLocationApply = (city: string, area: string, radius: number) => {
    setSelectedCity(city);
    setSelectedArea(area);
    setSearchRadius(radius);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleTypeSelect = (typeId: PropertyType) => {
    if (selectedType === typeId) {
      setSelectedType(null);
    } else {
      setSelectedType(typeId);
    }
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.bedroomsMin) count++;
    if (filters.bathroomsMin) count++;
    if (filters.furnishing) count++;
    if (filters.condition) count++;
    if (filters.verifiedOnly) count++;
    if (filters.facilities?.length) count++;
    return count;
  }, [filters]);

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
          <Ionicons name="home" size={18} color={purpose === 'buy' ? '#fff' : COLORS.textSecondary} />
          <Text style={[styles.purposeText, purpose === 'buy' && styles.purposeTextActive]}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.purposeBtn, purpose === 'rent' && styles.purposeBtnActive]}
          onPress={() => setPurpose('rent')}
        >
          <Ionicons name="key" size={18} color={purpose === 'rent' ? '#fff' : COLORS.textSecondary} />
          <Text style={[styles.purposeText, purpose === 'rent' && styles.purposeTextActive]}>Rent</Text>
        </TouchableOpacity>
      </View>

      {/* Smart Search Bar */}
      <SmartSearchBar
        purpose={purpose}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFocus={() => setShowSearchModal(true)}
        selectedCity={selectedCity}
      />

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterChipScroll}
        contentContainerStyle={styles.filterChipContent}
      >
        <TouchableOpacity 
          style={[styles.filterChip, activeFiltersCount > 0 && styles.filterChipActive]} 
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={18} color={activeFiltersCount > 0 ? '#fff' : COLORS.primary} />
          <Text style={[styles.filterChipText, activeFiltersCount > 0 && styles.filterChipTextActive]}>
            Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterChip, selectedArea && styles.filterChipActive]} 
          onPress={() => setShowLocationFilter(true)}
        >
          <Ionicons name="location-outline" size={18} color={selectedArea ? '#fff' : COLORS.primary} />
          <Text style={[styles.filterChipText, selectedArea && styles.filterChipTextActive]}>
            {selectedArea || selectedCity}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.filterChip}>
          <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
          <Text style={styles.filterChipText}>
            {filters.priceMin || filters.priceMax 
              ? `€${filters.priceMin || 0} - €${filters.priceMax || '∞'}` 
              : 'Price'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterChip}>
          <Ionicons name="bed-outline" size={18} color={COLORS.primary} />
          <Text style={styles.filterChipText}>
            {filters.bedroomsMin ? `${filters.bedroomsMin}+ Beds` : 'Bedrooms'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Property Type Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Property Types</Text>
        {selectedType && (
          <TouchableOpacity onPress={() => setSelectedType(null)}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
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
            count={typeCounts[type.id] || 0}
            onPress={() => handleTypeSelect(type.id as PropertyType)}
            isSelected={selectedType === type.id}
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
            count={typeCounts[type.id] || 0}
            onPress={() => handleTypeSelect(type.id as PropertyType)}
            isSelected={selectedType === type.id}
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
            count={typeCounts[type.id] || 0}
            onPress={() => handleTypeSelect(type.id as PropertyType)}
            isSelected={selectedType === type.id}
          />
        ))}
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {properties.length} Properties for {purpose === 'buy' ? 'Sale' : 'Rent'}
        </Text>
        <TouchableOpacity style={styles.sortBtn}>
          <Ionicons name="swap-vertical" size={18} color={COLORS.primary} />
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>
      
      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={properties}
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
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="home-outline" size={48} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyText}>No properties found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters or search in a different area</Text>
            <TouchableOpacity 
              style={styles.emptyBtn} 
              onPress={() => { setFilters({}); setSelectedType(null); setSelectedArea(''); }}
            >
              <Text style={styles.emptyBtnText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Search Modal */}
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearch={handleSearch}
        selectedCity={selectedCity}
      />

      {/* Location Filter Modal */}
      <LocationFilterModal
        visible={showLocationFilter}
        onClose={() => setShowLocationFilter(false)}
        selectedCity={selectedCity}
        selectedArea={selectedArea}
        onApply={handleLocationApply}
      />

      {/* Advanced Filter Modal */}
      <AdvancedFilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
        purpose={purpose}
      />

      {/* Floating Post Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/property/post')}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    gap: 24,
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
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 14,
    padding: 4,
  },
  purposeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  purposeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  purposeText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  purposeTextActive: {
    color: '#fff',
  },
  filterChipScroll: {
    marginTop: 16,
  },
  filterChipContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 14,
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
    paddingTop: 24,
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
    fontWeight: '600',
    color: COLORS.primary,
  },
  listContent: {
    paddingBottom: 100,
  },
  cardContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
