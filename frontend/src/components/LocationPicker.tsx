/**
 * LocationPicker Component
 * City-level location selection: Country → Region → City
 * Supports search and recent locations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';
import { theme } from '../utils/theme';
import api from '../utils/api';

// Types for location data
interface Region {
  country_code: string;
  region_code: string;
  name: string;
}

interface City {
  country_code: string;
  region_code: string;
  city_code: string;
  name: string;
  region_name?: string;
}

export interface LocationData {
  country_code?: string;
  region_code?: string;
  city_code?: string;
  city_name?: string;
  region_name?: string;
  location_text?: string;
}

interface LocationPickerProps {
  value?: LocationData | null;
  onChange: (location: LocationData) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  showRecentLocations?: boolean;
  embedded?: boolean; // When true, shows selection directly without trigger/modal
}

type SelectionStep = 'region' | 'city';

const RECENT_LOCATIONS_KEY = '@recent_locations';
const MAX_RECENT_LOCATIONS = 5;

// Tanzania-only configuration
const TANZANIA_COUNTRY = {
  code: 'TZ',
  name: 'Tanzania',
  flag: '🇹🇿',
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = 'Select city',
  error,
  disabled = false,
  showRecentLocations = true,
  embedded = false,
}) => {
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<SelectionStep>('region');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Data state
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);

  // Selection state
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  // Load regions on mount
  useEffect(() => {
    loadRegions();
    loadRecentLocations();
  }, []);

  const loadRecentLocations = async () => {
    try {
      const stored = await Storage.getItem(RECENT_LOCATIONS_KEY);
      if (stored) {
        setRecentLocations(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load recent locations:', err);
    }
  };

  const saveRecentLocation = async (location: LocationData) => {
    try {
      const locationKey = `${location.region_code}-${location.city_code}`;
      const updatedRecent = [
        location,
        ...recentLocations.filter(loc => 
          `${loc.region_code}-${loc.city_code}` !== locationKey
        )
      ].slice(0, MAX_RECENT_LOCATIONS);
      
      setRecentLocations(updatedRecent);
      await Storage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updatedRecent));
    } catch (err) {
      console.error('Failed to save recent location:', err);
    }
  };

  const clearRecentLocations = async () => {
    try {
      setRecentLocations([]);
      await Storage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify([]));
    } catch (err) {
      console.error('Failed to clear recent locations:', err);
    }
  };

  const loadRegions = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/locations/regions?country_code=${TANZANIA_COUNTRY.code}`);
      setRegions(response.data || []);
    } catch (err) {
      console.error('Failed to load regions:', err);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async (regionCode: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/locations/cities/by-region?country_code=${TANZANIA_COUNTRY.code}&region_code=${regionCode}`);
      setCities(response.data || []);
    } catch (err) {
      console.error('Failed to load cities:', err);
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter regions by search query
  const getFilteredRegions = useCallback(() => {
    if (!searchQuery || searchQuery.length < 1) {
      return regions;
    }
    const query = searchQuery.toLowerCase();
    return regions.filter(region => 
      region.name.toLowerCase().includes(query)
    );
  }, [regions, searchQuery]);

  // Filter cities by search query
  const getFilteredCities = useCallback(() => {
    if (!searchQuery || searchQuery.length < 1) {
      return cities;
    }
    const query = searchQuery.toLowerCase();
    return cities.filter(city => 
      city.name.toLowerCase().includes(query)
    );
  }, [cities, searchQuery]);

  const handleRegionSelect = (region: Region) => {
    setSelectedRegion(region);
    setSearchQuery('');
    setCurrentStep('city');
    loadCities(region.region_code);
  };

  const handleCitySelect = (city: City) => {
    const locationData: LocationData = {
      country_code: TANZANIA_COUNTRY.code,
      region_code: selectedRegion?.region_code || city.region_code,
      region_name: selectedRegion?.name || city.region_name || '',
      city_code: city.city_code,
      city_name: city.name,
      location_text: `${city.name}, ${selectedRegion?.name || city.region_name || ''}, Tanzania`,
    };
    
    saveRecentLocation(locationData);
    onChange(locationData);
    closeModal();
  };

  const handleRecentLocationSelect = (location: LocationData) => {
    saveRecentLocation(location);
    onChange(location);
    closeModal();
  };

  const openModal = () => {
    if (disabled) return;
    setModalVisible(true);
    setCurrentStep('region');
    setSelectedRegion(null);
    setSearchQuery('');
    setCities([]);
    if (regions.length === 0) {
      loadRegions();
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSearchQuery('');
  };

  const goBack = () => {
    if (currentStep === 'city') {
      setCurrentStep('region');
      setSelectedRegion(null);
      setSearchQuery('');
      setCities([]);
    } else {
      closeModal();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'region':
        return 'Select Region';
      case 'city':
        return `Select City in ${selectedRegion?.name || 'Region'}`;
      default:
        return 'Select Location';
    }
  };

  const getDisplayText = () => {
    if (value?.location_text) return value.location_text;
    if (value?.city_name) return value.city_name;
    return placeholder;
  };

  const renderRegionItem = (region: Region, index: number) => {
    if (Platform.OS === 'web') {
      return (
        <div
          key={`${region.country_code}-${region.region_code}`}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '16px',
            gap: '12px',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            borderBottom: index < getFilteredRegions().length - 1 ? `1px solid ${theme.colors.outlineVariant}` : 'none',
          }}
          onClick={() => handleRegionSelect(region)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = theme.colors.surfaceVariant;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
          data-testid={`region-${region.region_code}`}
        >
          <div style={{ 
            width: 32, 
            height: 32, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: 8,
            flexShrink: 0,
          }}>
            <Ionicons name="map-outline" size={20} color={theme.colors.primary} />
          </div>
          <span style={{ 
            flex: 1, 
            fontSize: 16, 
            color: theme.colors.onSurface,
          }}>{region.name}</span>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
        </div>
      );
    }
    
    return (
      <TouchableOpacity
        key={`${region.country_code}-${region.region_code}`}
        style={[styles.listItem, index < getFilteredRegions().length - 1 && styles.listItemBorder]}
        onPress={() => handleRegionSelect(region)}
        data-testid={`region-${region.region_code}`}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="map-outline" size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.itemText}>{region.name}</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>
    );
  };

  const renderCityItem = (city: City, index: number) => {
    if (Platform.OS === 'web') {
      return (
        <div
          key={`${city.region_code}-${city.city_code}`}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '16px',
            gap: '12px',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            borderBottom: index < getFilteredCities().length - 1 ? `1px solid ${theme.colors.outlineVariant}` : 'none',
          }}
          onClick={() => handleCitySelect(city)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = theme.colors.surfaceVariant;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
          data-testid={`city-${city.city_code}`}
        >
          <div style={{ 
            width: 32, 
            height: 32, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: 8,
            flexShrink: 0,
          }}>
            <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
          </div>
          <span style={{ 
            flex: 1, 
            fontSize: 16, 
            color: theme.colors.onSurface,
          }}>{city.name}</span>
        </div>
      );
    }
    
    return (
      <TouchableOpacity
        key={`${city.region_code}-${city.city_code}`}
        style={[styles.listItem, index < getFilteredCities().length - 1 && styles.listItemBorder]}
        onPress={() => handleCitySelect(city)}
        data-testid={`city-${city.city_code}`}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.itemText}>{city.name}</Text>
      </TouchableOpacity>
    );
  };

  // Render the selection content (used by both modal and embedded modes)
  const renderSelectionContent = () => (
    <View style={embedded ? styles.embeddedContainer : styles.modalContainer}>
      {/* Header - only show in non-embedded mode or when on city step */}
      {!embedded && (
        <View style={styles.modalHeader}>
          {currentStep === 'city' && (
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          )}
          <Text style={styles.modalTitle}>{getStepTitle()}</Text>
          <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
      )}

      {/* Back button for embedded mode when on city step */}
      {embedded && currentStep === 'city' && (
        <TouchableOpacity onPress={goBack} style={styles.embeddedBackButton}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
          <Text style={styles.embeddedBackText}>Back to regions</Text>
        </TouchableOpacity>
      )}

      {/* Recent Locations - Only show on region step */}
      {showRecentLocations && recentLocations.length > 0 && currentStep === 'region' && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Locations</Text>
            <TouchableOpacity 
              onPress={clearRecentLocations}
              style={styles.clearRecentButton}
              data-testid="clear-recent-locations"
            >
              <Text style={styles.clearRecentText}>Clear</Text>
            </TouchableOpacity>
          </View>
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
            </TouchableOpacity>
          ))}
          <View style={styles.recentDivider} />
        </View>
      )}

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbText}>
          {TANZANIA_COUNTRY.flag} {TANZANIA_COUNTRY.name}
          {selectedRegion && ` → ${selectedRegion.name}`}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder={currentStep === 'region' ? 'Search regions...' : 'Search cities...'}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          testID={`${currentStep}-search-input`}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* List Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollViewContainer} contentContainerStyle={styles.listContent}>
          {currentStep === 'region' && (
            getFilteredRegions().length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={48} color={theme.colors.outline} />
                <Text style={styles.emptyText}>
                  {searchQuery.length > 0 ? 'No regions found' : 'Loading regions...'}
                </Text>
              </View>
            ) : (
              getFilteredRegions().map((region, index) => renderRegionItem(region, index))
            )
          )}
          
          {currentStep === 'city' && (
            getFilteredCities().length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={48} color={theme.colors.outline} />
                <Text style={styles.emptyText}>
                  {searchQuery.length > 0 ? 'No cities found' : 'Loading cities...'}
                </Text>
              </View>
            ) : (
              getFilteredCities().map((city, index) => renderCityItem(city, index))
            )
          )}
        </ScrollView>
      )}
    </View>
  );

  // Embedded mode - render selection UI directly
  if (embedded) {
    return renderSelectionContent();
  }

  // Normal mode - render trigger button and modal
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
        {renderSelectionContent()}
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
    minHeight: 48,
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
  scrollViewContainer: {
    flex: 1,
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
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
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
  // Recent locations styles
  recentSection: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingTop: theme.spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearRecentButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  clearRecentText: {
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '500',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  recentItemText: {
    flex: 1,
  },
  recentItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  recentItemSubtext: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  recentDivider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginTop: theme.spacing.md,
  },
});

export default LocationPicker;
