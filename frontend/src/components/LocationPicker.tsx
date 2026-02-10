/**
 * LocationPicker Component
 * Hierarchical location selection: Country → Region → District → City
 * Supports search, GPS location detection, and recent locations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../utils/theme';
import { locationsApi } from '../utils/api';

// Types for location data
interface Country {
  code: string;
  name: string;
  flag?: string;
}

interface Region {
  country_code: string;
  region_code: string;
  name: string;
}

interface District {
  country_code: string;
  region_code: string;
  district_code: string;
  name: string;
}

interface City {
  country_code: string;
  region_code: string;
  district_code: string;
  city_code: string;
  name: string;
  lat: number;
  lng: number;
  region_name?: string;
  district_name?: string;
  location_text?: string;
}

export interface LocationData {
  country_code?: string;
  region_code?: string;
  district_code?: string;
  city_code?: string;
  city_name?: string;
  region_name?: string;
  district_name?: string;
  lat?: number;
  lng?: number;
  location_text?: string;
}

interface LocationPickerProps {
  value?: LocationData | null;
  onChange: (location: LocationData) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  showGpsOption?: boolean;
  showRecentLocations?: boolean;
}

type SelectionStep = 'country' | 'region' | 'district' | 'city';

const RECENT_LOCATIONS_KEY = '@recent_locations';
const MAX_RECENT_LOCATIONS = 5;

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = 'Select location',
  error,
  disabled = false,
  showGpsOption = true,
  showRecentLocations = true,
}) => {
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<SelectionStep>('country');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Selection state
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [searchResults, setSearchResults] = useState<City[]>([]);

  // Recent locations
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);

  // Current selections
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);

  // Load countries and recent locations on mount
  useEffect(() => {
    loadCountries();
    loadRecentLocations();
  }, []);

  const loadRecentLocations = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
      if (stored) {
        setRecentLocations(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load recent locations:', err);
    }
  };

  const saveRecentLocation = async (location: LocationData) => {
    try {
      // Create a unique key for this location
      const locationKey = `${location.country_code}-${location.region_code}-${location.district_code}-${location.city_code}`;
      
      // Filter out duplicate and add new location at the start
      const updatedRecent = [
        location,
        ...recentLocations.filter(loc => 
          `${loc.country_code}-${loc.region_code}-${loc.district_code}-${loc.city_code}` !== locationKey
        )
      ].slice(0, MAX_RECENT_LOCATIONS);
      
      setRecentLocations(updatedRecent);
      await AsyncStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updatedRecent));
    } catch (err) {
      console.error('Failed to save recent location:', err);
    }
  };

  const loadCountries = async () => {
    try {
      setLoading(true);
      const data = await locationsApi.getCountries();
      setCountries(data);
    } catch (err) {
      console.error('Failed to load countries:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRegions = async (countryCode: string) => {
    try {
      setLoading(true);
      const data = await locationsApi.getRegions(countryCode);
      setRegions(data);
    } catch (err) {
      console.error('Failed to load regions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async (countryCode: string, regionCode: string) => {
    try {
      setLoading(true);
      const data = await locationsApi.getDistricts(countryCode, regionCode);
      setDistricts(data);
    } catch (err) {
      console.error('Failed to load districts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async (countryCode: string, regionCode: string, districtCode: string) => {
    try {
      setLoading(true);
      const data = await locationsApi.getCities(countryCode, regionCode, districtCode);
      setCities(data);
    } catch (err) {
      console.error('Failed to load cities:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchCities = useCallback(async (query: string) => {
    if (!selectedCountry || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const data = await locationsApi.searchCities(selectedCountry.code, query, 20);
      setSearchResults(data);
    } catch (err) {
      console.error('Failed to search cities:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && currentStep === 'city' && selectedCountry) {
        searchCities(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentStep, selectedCountry, searchCities]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setSelectedRegion(null);
    setSelectedDistrict(null);
    setRegions([]);
    setDistricts([]);
    setCities([]);
    setSearchQuery('');
    setCurrentStep('region');
    loadRegions(country.code);
  };

  const handleRegionSelect = (region: Region) => {
    setSelectedRegion(region);
    setSelectedDistrict(null);
    setDistricts([]);
    setCities([]);
    setSearchQuery('');
    setCurrentStep('district');
    loadDistricts(region.country_code, region.region_code);
  };

  const handleDistrictSelect = (district: District) => {
    setSelectedDistrict(district);
    setCities([]);
    setSearchQuery('');
    setCurrentStep('city');
    loadCities(district.country_code, district.region_code, district.district_code);
  };

  const handleCitySelect = (city: City) => {
    const locationData: LocationData = {
      country_code: city.country_code,
      region_code: city.region_code,
      district_code: city.district_code,
      city_code: city.city_code,
      city_name: city.name,
      region_name: city.region_name || selectedRegion?.name,
      district_name: city.district_name || selectedDistrict?.name,
      lat: city.lat,
      lng: city.lng,
      location_text: city.location_text || `${city.name}, ${selectedDistrict?.name || ''}, ${selectedRegion?.name || ''}`,
    };
    
    // Save to recent locations
    saveRecentLocation(locationData);
    
    onChange(locationData);
    closeModal();
  };

  const handleRecentLocationSelect = (location: LocationData) => {
    // Save to recent locations (moves to top)
    saveRecentLocation(location);
    onChange(location);
    closeModal();
  };

  const openModal = () => {
    if (disabled) return;
    setModalVisible(true);
    setCurrentStep('country');
    setSelectedCountry(null);
    setSelectedRegion(null);
    setSelectedDistrict(null);
    setSearchQuery('');
  };

  const closeModal = () => {
    setModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const goBack = () => {
    switch (currentStep) {
      case 'region':
        setCurrentStep('country');
        setSelectedCountry(null);
        setRegions([]);
        break;
      case 'district':
        setCurrentStep('region');
        setSelectedRegion(null);
        setDistricts([]);
        break;
      case 'city':
        setCurrentStep('district');
        setSelectedDistrict(null);
        setCities([]);
        setSearchQuery('');
        setSearchResults([]);
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'country':
        return 'Select Country';
      case 'region':
        return `Select Region in ${selectedCountry?.name || ''}`;
      case 'district':
        return `Select District in ${selectedRegion?.name || ''}`;
      case 'city':
        return `Select City in ${selectedDistrict?.name || ''}`;
    }
  };

  const getDisplayText = () => {
    if (value?.location_text) return value.location_text;
    if (value?.city_name) return value.city_name;
    return placeholder;
  };

  const renderItem = ({ item }: { item: any }) => {
    switch (currentStep) {
      case 'country':
        return (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleCountrySelect(item)}
            data-testid={`country-${item.code}`}
          >
            <Text style={styles.flagText}>{item.flag || ''}</Text>
            <Text style={styles.itemText}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        );
      case 'region':
        return (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleRegionSelect(item)}
            data-testid={`region-${item.region_code}`}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="map-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.itemText}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        );
      case 'district':
        return (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleDistrictSelect(item)}
            data-testid={`district-${item.district_code}`}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="business-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.itemText}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        );
      case 'city':
        const city = item as City;
        return (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleCitySelect(city)}
            data-testid={`city-${city.city_code}`}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.cityInfo}>
              <Text style={styles.itemText}>{city.name}</Text>
              {city.location_text && (
                <Text style={styles.citySubtext} numberOfLines={1}>
                  {city.location_text}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
    }
  };

  const getData = () => {
    if (currentStep === 'city' && searchQuery.length >= 2) {
      return searchResults;
    }
    
    switch (currentStep) {
      case 'country':
        return countries;
      case 'region':
        return regions;
      case 'district':
        return districts;
      case 'city':
        return cities;
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[
          styles.trigger,
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
        onPress={openModal}
        disabled={disabled}
        data-testid="location-picker-trigger"
      >
        <Ionicons
          name="location"
          size={20}
          color={value ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
        <Text
          style={[
            styles.triggerText,
            !value && styles.triggerPlaceholder,
          ]}
          numberOfLines={1}
        >
          {getDisplayText()}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            {currentStep !== 'country' && (
              <TouchableOpacity onPress={goBack} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            )}
            <Text style={styles.modalTitle}>{getStepTitle()}</Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Recent Locations - Only show on country step */}
          {showRecentLocations && currentStep === 'country' && recentLocations.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Recent Locations</Text>
              {recentLocations.map((loc, index) => (
                <TouchableOpacity
                  key={`recent-${index}`}
                  style={styles.recentItem}
                  onPress={() => handleRecentLocationSelect(loc)}
                  data-testid={`recent-location-${index}`}
                >
                  <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                  <View style={styles.recentItemText}>
                    <Text style={styles.recentItemName}>{loc.city_name || loc.location_text}</Text>
                    {loc.location_text && loc.city_name && (
                      <Text style={styles.recentItemSubtext} numberOfLines={1}>
                        {loc.location_text}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.outline} />
                </TouchableOpacity>
              ))}
              <View style={styles.recentDivider} />
            </View>
          )}

          {/* Breadcrumb */}
          {selectedCountry && (
            <View style={styles.breadcrumb}>
              <Text style={styles.breadcrumbText}>
                {selectedCountry.flag} {selectedCountry.name}
                {selectedRegion && ` > ${selectedRegion.name}`}
                {selectedDistrict && ` > ${selectedDistrict.name}`}
              </Text>
            </View>
          )}

          {/* Search (for city step) */}
          {currentStep === 'city' && selectedCountry && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                data-testid="city-search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={getData()}
              keyExtractor={(item) => {
                switch (currentStep) {
                  case 'country':
                    return item.code;
                  case 'region':
                    return `${item.country_code}-${item.region_code}`;
                  case 'district':
                    return `${item.country_code}-${item.region_code}-${item.district_code}`;
                  case 'city':
                    return `${item.country_code}-${item.region_code}-${item.district_code}-${item.city_code}`;
                }
              }}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="location-outline" size={48} color={theme.colors.outline} />
                  <Text style={styles.emptyText}>
                    {searchQuery.length > 0 ? 'No cities found' : 'No locations available'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  triggerError: {
    borderColor: theme.colors.error,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  triggerPlaceholder: {
    color: theme.colors.onSurfaceVariant,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 16 : theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  backButton: {
    position: 'absolute',
    left: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    maxWidth: '70%',
    textAlign: 'center',
  },
  breadcrumb: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  breadcrumbText: {
    fontSize: 13,
    color: theme.colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  flagText: {
    fontSize: 24,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  cityInfo: {
    flex: 1,
  },
  citySubtext: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginLeft: 64,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
});

export default LocationPicker;
