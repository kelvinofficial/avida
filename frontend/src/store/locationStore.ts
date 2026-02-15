import { create } from 'zustand';
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
  // Hydrate from localStorage
  hydrate: () => void;
}

// Helper to save to localStorage
const saveToStorage = (currentCity: string, filter: LocationFilter | null) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      localStorage.setItem('avida-location', JSON.stringify({ currentCity, selectedLocationFilter: filter }));
    } catch (e) {
      // Ignore
    }
  }
};

// Helper to load from localStorage
const loadFromStorage = (): { currentCity: string; selectedLocationFilter: LocationFilter | null } | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('avida-location');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore
    }
  }
  return null;
};

export const useLocationStore = create<LocationState>()((set) => ({
  currentCity: 'Select Location',
  showLocationModal: false,
  selectedLocationFilter: null,

  setCurrentCity: (city) => set({ currentCity: city }),
  setShowLocationModal: (show) => set({ showLocationModal: show }),
  setSelectedLocationFilter: (filter) => set({ selectedLocationFilter: filter }),
  
  setLocation: (city, filter) => {
    saveToStorage(city, filter);
    set({ 
      currentCity: city, 
      selectedLocationFilter: filter,
      showLocationModal: false 
    });
  },
  
  clearLocation: () => {
    saveToStorage('All Locations', null);
    set({ 
      currentCity: 'All Locations', 
      selectedLocationFilter: null,
      showLocationModal: false 
    });
  },
  
  hydrate: () => {
    const stored = loadFromStorage();
    if (stored) {
      set({
        currentCity: stored.currentCity,
        selectedLocationFilter: stored.selectedLocationFilter,
      });
    }
  },
}));

// Auto-hydrate on load (only on web)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after the store is created
  setTimeout(() => {
    useLocationStore.getState().hydrate();
  }, 0);
}
