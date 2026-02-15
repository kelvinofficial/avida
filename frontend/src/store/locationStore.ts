import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Platform } from 'react-native';

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

interface LocationState {
  // Display text for the location button
  currentCity: string;
  // Whether the location modal is visible
  showLocationModal: boolean;
  // The selected location filter for API queries
  selectedLocationFilter: LocationFilter | null;
  // Actions
  setCurrentCity: (city: string) => void;
  setShowLocationModal: (show: boolean) => void;
  setSelectedLocationFilter: (filter: LocationFilter | null) => void;
  setLocation: (city: string, filter: LocationFilter | null) => void;
  clearLocation: () => void;
}

// Simple localStorage wrapper that works on web
const getStorage = () => ({
  getItem: (name: string): string | null => {
    if (Platform.OS !== 'web') return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (Platform.OS !== 'web') return;
    try {
      localStorage.setItem(name, value);
    } catch {
      // Ignore errors
    }
  },
  removeItem: (name: string): void => {
    if (Platform.OS !== 'web') return;
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore errors
    }
  },
});

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      currentCity: 'Select Location',
      showLocationModal: false,
      selectedLocationFilter: null,

      setCurrentCity: (city) => set({ currentCity: city }),
      setShowLocationModal: (show) => set({ showLocationModal: show }),
      setSelectedLocationFilter: (filter) => set({ selectedLocationFilter: filter }),
      
      setLocation: (city, filter) => set({ 
        currentCity: city, 
        selectedLocationFilter: filter,
        showLocationModal: false 
      }),
      
      clearLocation: () => set({ 
        currentCity: 'All Locations', 
        selectedLocationFilter: null,
        showLocationModal: false 
      }),
    }),
    {
      name: 'avida-location-storage',
      storage: getStorage(),
      // Only persist these fields
      partialize: (state) => ({
        currentCity: state.currentCity,
        selectedLocationFilter: state.selectedLocationFilter,
      }),
    }
  )
);
