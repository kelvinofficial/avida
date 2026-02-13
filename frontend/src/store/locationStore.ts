import { create } from 'zustand';

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

export const useLocationStore = create<LocationState>()((set) => ({
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
}));
