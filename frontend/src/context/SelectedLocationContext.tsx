/**
 * User Selected Location Context
 * Manages user's manually selected location for marketplace
 * NO GPS - Location is ALWAYS user-selected
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface SelectedCity {
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
}

interface LocationFilter {
  country_code?: string;
  region_code?: string;
  district_code?: string;
  city_code?: string;
}

interface SelectedLocationContextType {
  // Selected location
  selectedCity: SelectedCity | null;
  setSelectedCity: (city: SelectedCity | null) => Promise<void>;
  
  // Filter settings
  includeNearbyCities: boolean;
  setIncludeNearbyCities: (include: boolean) => void;
  searchRadius: number; // in km
  setSearchRadius: (radius: number) => void;
  
  // Display helpers
  getLocationDisplay: () => string;
  getLocationFilter: () => LocationFilter | null;
  
  // State
  isLocationSelected: boolean;
  showLocationPicker: boolean;
  setShowLocationPicker: (show: boolean) => void;
  
  // Clear
  clearLocation: () => Promise<void>;
}

const STORAGE_KEY = '@selected_location';
const RADIUS_KEY = '@search_radius';
const INCLUDE_NEARBY_KEY = '@include_nearby';
const DEFAULT_RADIUS = 50; // 50km default

const SelectedLocationContext = createContext<SelectedLocationContextType | undefined>(undefined);

export const SelectedLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCity, setSelectedCityState] = useState<SelectedCity | null>(null);
  const [includeNearbyCities, setIncludeNearbyCitiesState] = useState(true);
  const [searchRadius, setSearchRadiusState] = useState(DEFAULT_RADIUS);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    loadSavedSettings();
  }, []);

  const loadSavedSettings = async () => {
    try {
      const [savedLocation, savedRadius, savedIncludeNearby] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(RADIUS_KEY),
        AsyncStorage.getItem(INCLUDE_NEARBY_KEY),
      ]);

      if (savedLocation) {
        setSelectedCityState(JSON.parse(savedLocation));
      }
      if (savedRadius) {
        setSearchRadiusState(parseInt(savedRadius, 10));
      }
      if (savedIncludeNearby !== null) {
        setIncludeNearbyCitiesState(savedIncludeNearby === 'true');
      }
    } catch (err) {
      console.error('Failed to load location settings:', err);
    }
  };

  const setSelectedCity = useCallback(async (city: SelectedCity | null) => {
    setSelectedCityState(city);
    try {
      if (city) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(city));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to save location:', err);
    }
  }, []);

  const setIncludeNearbyCities = useCallback(async (include: boolean) => {
    setIncludeNearbyCitiesState(include);
    try {
      await AsyncStorage.setItem(INCLUDE_NEARBY_KEY, include.toString());
    } catch (err) {
      console.error('Failed to save include nearby setting:', err);
    }
  }, []);

  const setSearchRadius = useCallback(async (radius: number) => {
    setSearchRadiusState(radius);
    try {
      await AsyncStorage.setItem(RADIUS_KEY, radius.toString());
    } catch (err) {
      console.error('Failed to save search radius:', err);
    }
  }, []);

  const getLocationDisplay = useCallback((): string => {
    if (!selectedCity) return 'Select Location';
    return selectedCity.city_name;
  }, [selectedCity]);

  const getLocationFilter = useCallback((): LocationFilter | null => {
    if (!selectedCity) return null;
    return {
      country_code: selectedCity.country_code,
      region_code: selectedCity.region_code,
      district_code: selectedCity.district_code,
      city_code: selectedCity.city_code,
    };
  }, [selectedCity]);

  const clearLocation = useCallback(async () => {
    setSelectedCityState(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear location:', err);
    }
  }, []);

  const isLocationSelected = selectedCity !== null;

  return (
    <SelectedLocationContext.Provider
      value={{
        selectedCity,
        setSelectedCity,
        includeNearbyCities,
        setIncludeNearbyCities,
        searchRadius,
        setSearchRadius,
        getLocationDisplay,
        getLocationFilter,
        isLocationSelected,
        showLocationPicker,
        setShowLocationPicker,
        clearLocation,
      }}
    >
      {children}
    </SelectedLocationContext.Provider>
  );
};

export const useSelectedLocation = (): SelectedLocationContextType => {
  const context = useContext(SelectedLocationContext);
  if (context === undefined) {
    throw new Error('useSelectedLocation must be used within a SelectedLocationProvider');
  }
  return context;
};

export type { SelectedCity, LocationFilter };
export default SelectedLocationContext;
