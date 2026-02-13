import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Storage } from '../lib/storage';

interface LocationFilter {
  country_code?: string;
  country_name?: string;
  region_code?: string;
  region_name?: string;
  district_code?: string;
  district_name?: string;
  city_code?: string;
  city_name?: string;
  location_text?: string;
}

interface LocationContextType {
  currentCity: string;
  showLocationModal: boolean;
  selectedLocationFilter: LocationFilter | null;
  setCurrentCity: (city: string) => void;
  setShowLocationModal: (show: boolean) => void;
  setLocation: (city: string, filter: LocationFilter | null) => void;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = 'avida_location';

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentCity, setCurrentCity] = useState('Select Location');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<LocationFilter | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    const loadStoredLocation = async () => {
      try {
        const stored = await Storage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.currentCity) setCurrentCity(parsed.currentCity);
          if (parsed.selectedLocationFilter) setSelectedLocationFilter(parsed.selectedLocationFilter);
        }
      } catch (error) {
        console.log('Error loading stored location:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadStoredLocation();
  }, []);

  // Save to storage when location changes
  useEffect(() => {
    if (!isInitialized) return;
    
    const saveLocation = async () => {
      try {
        await Storage.setItem(STORAGE_KEY, JSON.stringify({
          currentCity,
          selectedLocationFilter,
        }));
      } catch (error) {
        console.log('Error saving location:', error);
      }
    };
    saveLocation();
  }, [currentCity, selectedLocationFilter, isInitialized]);

  const setLocation = (city: string, filter: LocationFilter | null) => {
    setCurrentCity(city);
    setSelectedLocationFilter(filter);
    setShowLocationModal(false);
  };

  const clearLocation = () => {
    setCurrentCity('All Locations');
    setSelectedLocationFilter(null);
    setShowLocationModal(false);
  };

  return (
    <LocationContext.Provider
      value={{
        currentCity,
        showLocationModal,
        selectedLocationFilter,
        setCurrentCity,
        setShowLocationModal,
        setLocation,
        clearLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;
