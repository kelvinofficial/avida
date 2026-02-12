/**
 * Custom hook to fetch and manage attribute icons
 * Icons are displayed with green color (matching app's primary theme)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';

// Theme green color - matches the app's primary color
export const ICON_COLOR = '#2E7D32';

export interface AttributeIcon {
  id: string;
  name: string;
  ionicon_name: string;
  category_id?: string;
  subcategory_id?: string;
  attribute_name?: string;
  icon_type: string;
  color?: string;
  description?: string;
  is_active: boolean;
}

interface IconCache {
  icons: AttributeIcon[];
  timestamp: number;
}

// Global cache to prevent redundant API calls
let globalIconCache: IconCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch and use attribute icons
 * @param categoryId - Optional category ID to filter icons
 */
export function useAttributeIcons(categoryId?: string) {
  const [icons, setIcons] = useState<AttributeIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIcons = useCallback(async () => {
    try {
      // Check cache first
      if (globalIconCache && Date.now() - globalIconCache.timestamp < CACHE_DURATION) {
        setIcons(globalIconCache.icons);
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await api.get('/attribute-icons/public');
      const fetchedIcons = response.data.icons || [];
      
      // Update global cache
      globalIconCache = {
        icons: fetchedIcons,
        timestamp: Date.now(),
      };
      
      setIcons(fetchedIcons);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching attribute icons:', err);
      setError(err.message || 'Failed to load icons');
      // Use cached data if available even if stale
      if (globalIconCache) {
        setIcons(globalIconCache.icons);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIcons();
  }, [fetchIcons]);

  // Filter icons by category if provided
  const filteredIcons = useMemo(() => {
    if (!categoryId) return icons;
    return icons.filter(icon => 
      icon.category_id === categoryId || !icon.category_id
    );
  }, [icons, categoryId]);

  /**
   * Get icon for a specific attribute
   * @param attributeName - The attribute name/key (e.g., 'make', 'model', 'bedrooms')
   * @param catId - Optional category ID for more specific matching
   * @returns The Ionicon name or a default icon
   */
  const getIconForAttribute = useCallback((
    attributeName: string,
    catId?: string
  ): string => {
    const normalizedAttr = attributeName.toLowerCase().replace(/[_\s-]/g, '');
    
    // First try to find exact match with category
    const categoryToSearch = catId || categoryId;
    if (categoryToSearch) {
      const categoryMatch = icons.find(icon => {
        const iconAttr = (icon.attribute_name || '').toLowerCase().replace(/[_\s-]/g, '');
        return iconAttr === normalizedAttr && icon.category_id === categoryToSearch;
      });
      if (categoryMatch) return categoryMatch.ionicon_name;
    }
    
    // Then try global match (icons without category)
    const globalMatch = icons.find(icon => {
      const iconAttr = (icon.attribute_name || '').toLowerCase().replace(/[_\s-]/g, '');
      return iconAttr === normalizedAttr && !icon.category_id;
    });
    if (globalMatch) return globalMatch.ionicon_name;
    
    // Then try any match
    const anyMatch = icons.find(icon => {
      const iconAttr = (icon.attribute_name || '').toLowerCase().replace(/[_\s-]/g, '');
      return iconAttr === normalizedAttr;
    });
    if (anyMatch) return anyMatch.ionicon_name;
    
    // Fallback to intelligent defaults based on common attribute names
    return getDefaultIconForAttribute(attributeName);
  }, [icons, categoryId]);

  /**
   * Get custom color for a specific attribute icon
   * @param attributeName - The attribute name/key
   * @param catId - Optional category ID for more specific matching
   * @returns The custom color or the default ICON_COLOR
   */
  const getIconColorForAttribute = useCallback((
    attributeName: string,
    catId?: string
  ): string => {
    const normalizedAttr = attributeName.toLowerCase().replace(/[_\s-]/g, '');
    const categoryToSearch = catId || categoryId;
    
    // Find matching icon with custom color
    const matchingIcon = icons.find(icon => {
      const iconAttr = (icon.attribute_name || '').toLowerCase().replace(/[_\s-]/g, '');
      if (categoryToSearch) {
        return iconAttr === normalizedAttr && icon.category_id === categoryToSearch;
      }
      return iconAttr === normalizedAttr;
    });
    
    // Return custom color if set, otherwise default
    return matchingIcon?.color || ICON_COLOR;
  }, [icons, categoryId]);

  /**
   * Get category icon
   * @param catId - The category ID
   * @returns The Ionicon name for the category
   */
  const getCategoryIcon = useCallback((catId: string): string => {
    const categoryIcon = icons.find(
      icon => icon.category_id === catId && icon.icon_type === 'category'
    );
    return categoryIcon?.ionicon_name || 'folder-outline';
  }, [icons]);

  /**
   * Build icon map for quick lookup
   * Returns a map of attribute_name -> ionicon_name
   */
  const iconMap = useMemo(() => {
    const map: Record<string, string> = {};
    filteredIcons.forEach(icon => {
      if (icon.attribute_name) {
        const key = icon.category_id 
          ? `${icon.category_id}:${icon.attribute_name}`
          : icon.attribute_name;
        map[key] = icon.ionicon_name;
      }
    });
    return map;
  }, [filteredIcons]);

  return {
    icons: filteredIcons,
    loading,
    error,
    getIconForAttribute,
    getIconColorForAttribute,
    getCategoryIcon,
    iconMap,
    refetch: fetchIcons,
    iconColor: ICON_COLOR,
  };
}

/**
 * Get a sensible default icon based on attribute name
 */
function getDefaultIconForAttribute(attributeName: string): string {
  const normalized = attributeName.toLowerCase().replace(/[_\s-]/g, '');
  
  const defaults: Record<string, string> = {
    // Common attributes
    price: 'pricetag-outline',
    title: 'text-outline',
    description: 'document-text-outline',
    location: 'location-outline',
    condition: 'star-outline',
    negotiable: 'swap-horizontal-outline',
    
    // Vehicle attributes
    make: 'ribbon-outline',
    model: 'car-sport-outline',
    year: 'calendar-outline',
    mileage: 'speedometer-outline',
    fueltype: 'water-outline',
    fuel: 'water-outline',
    transmission: 'settings-outline',
    bodytype: 'car-outline',
    enginesize: 'flash-outline',
    engine: 'flash-outline',
    color: 'color-palette-outline',
    colour: 'color-palette-outline',
    doors: 'enter-outline',
    registered: 'document-outline',
    
    // Property attributes
    propertytype: 'home-outline',
    bedrooms: 'bed-outline',
    bathrooms: 'water-outline',
    size: 'resize-outline',
    sizesqm: 'resize-outline',
    floor: 'layers-outline',
    parking: 'car-outline',
    furnished: 'cube-outline',
    availablefrom: 'time-outline',
    petsallowed: 'paw-outline',
    pets: 'paw-outline',
    balcony: 'sunny-outline',
    elevator: 'arrow-up-outline',
    
    // Electronics
    brand: 'ribbon-outline',
    type: 'laptop-outline',
    processor: 'hardware-chip-outline',
    ram: 'server-outline',
    storage: 'folder-outline',
    graphics: 'game-controller-outline',
    screensize: 'expand-outline',
    warranty: 'shield-checkmark-outline',
    originalbox: 'cube-outline',
    batteryhealth: 'battery-half-outline',
    carrierlock: 'lock-closed-outline',
    
    // Fashion
    clothingtype: 'shirt-outline',
    gender: 'people-outline',
    forgender: 'people-outline',
    material: 'layers-outline',
    
    // Jobs
    jobtitle: 'person-outline',
    jobtype: 'briefcase-outline',
    industry: 'business-outline',
    experience: 'trending-up-outline',
    salaryrange: 'cash-outline',
    salary: 'cash-outline',
    remote: 'home-outline',
    remotework: 'home-outline',
    
    // Pets
    breed: 'paw-outline',
    age: 'calendar-outline',
    vaccinated: 'medkit-outline',
    
    // Category - general
    category: 'folder-outline',
    subcategory: 'folder-open-outline',
  };
  
  return defaults[normalized] || 'information-circle-outline';
}

/**
 * Force refresh the icon cache
 */
export function clearIconCache() {
  globalIconCache = null;
}

export default useAttributeIcons;
