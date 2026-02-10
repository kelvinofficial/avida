/**
 * User Location Context
 * Manages user's GPS location for distance calculations and "Near Me" filtering
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

interface UserLocation {
  lat: number;
  lng: number;
  timestamp: number;
  city?: string;
  country?: string;
}

interface LocationContextType {
  userLocation: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean | null;
  requestLocation: () => Promise<UserLocation | null>;
  clearLocation: () => void;
  nearMeEnabled: boolean;
  setNearMeEnabled: (enabled: boolean) => void;
  searchRadius: number;
  setSearchRadius: (radius: number) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_STORAGE_KEY = '@user_location';
const RADIUS_STORAGE_KEY = '@search_radius';
const LOCATION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_RADIUS = 50; // Default 50km

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [searchRadius, setSearchRadiusState] = useState(DEFAULT_RADIUS);

  // Load cached location and radius on mount
  useEffect(() => {
    loadCachedLocation();
    loadCachedRadius();
  }, []);

  const loadCachedRadius = async () => {
    try {
      const cached = await AsyncStorage.getItem(RADIUS_STORAGE_KEY);
      if (cached) {
        setSearchRadiusState(parseInt(cached, 10));
      }
    } catch (err) {
      console.log('Failed to load cached radius:', err);
    }
  };

  const setSearchRadius = useCallback(async (radius: number) => {
    setSearchRadiusState(radius);
    try {
      await AsyncStorage.setItem(RADIUS_STORAGE_KEY, radius.toString());
    } catch (err) {
      console.log('Failed to save radius:', err);
    }
  }, []);

  const loadCachedLocation = async () => {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (cached) {
        const location = JSON.parse(cached) as UserLocation;
        // Check if location is still valid (not expired)
        if (Date.now() - location.timestamp < LOCATION_EXPIRY_MS) {
          setUserLocation(location);
        }
      }
    } catch (err) {
      console.log('Failed to load cached location:', err);
    }
  };

  const saveLocation = async (location: UserLocation) => {
    try {
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
    } catch (err) {
      console.log('Failed to save location:', err);
    }
  };

  const requestLocation = useCallback(async (): Promise<UserLocation | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check current permission status
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      let finalStatus = existingStatus;
      
      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      setHasPermission(finalStatus === 'granted');

      if (finalStatus !== 'granted') {
        setError('Location permission denied');
        Alert.alert(
          'Location Permission Required',
          'To use "Near Me" feature, please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return null;
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation: UserLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: Date.now(),
      };

      // Try to get city/country from reverse geocoding
      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        
        if (geocode) {
          newLocation.city = geocode.city || geocode.subregion || undefined;
          newLocation.country = geocode.country || undefined;
        }
      } catch (geoErr) {
        console.log('Reverse geocoding failed:', geoErr);
      }

      setUserLocation(newLocation);
      await saveLocation(newLocation);
      setIsLoading(false);
      return newLocation;

    } catch (err: any) {
      console.error('Location error:', err);
      setError(err.message || 'Failed to get location');
      setIsLoading(false);
      return null;
    }
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setNearMeEnabled(false);
    AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
  }, []);

  // When nearMeEnabled is toggled on, request location if not available
  useEffect(() => {
    if (nearMeEnabled && !userLocation && !isLoading) {
      requestLocation();
    }
  }, [nearMeEnabled, userLocation, isLoading, requestLocation]);

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        isLoading,
        error,
        hasPermission,
        requestLocation,
        clearLocation,
        nearMeEnabled,
        setNearMeEnabled,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useUserLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useUserLocation must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;
