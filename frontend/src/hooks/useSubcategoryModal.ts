/**
 * useSubcategoryModal Hook
 * Manages subcategory modal state and handlers
 */

import { useState, useCallback, useEffect } from 'react';
import { Storage } from '../../utils/storage';
import { categoriesApi } from '../../utils/api';
import { getSubcategories, SubcategoryConfig } from '../../config/subcategories';

// Storage key for recently viewed subcategories
const RECENT_SUBCATEGORIES_KEY = '@avida_recent_subcategories';

// Category type
interface CategoryData {
  id: string;
  name: string;
  icon: string;
  subcategories: SubcategoryConfig[];
}

// Recent subcategory type
export interface RecentSubcategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  subcategoryId: string;
  subcategoryName: string;
  timestamp: number;
}

// Full categories list
const FULL_CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles', icon: 'car-outline' },
  { id: 'properties', name: 'Properties', icon: 'business-outline' },
  { id: 'electronics', name: 'Electronics', icon: 'laptop-outline' },
  { id: 'phones_tablets', name: 'Phones & Tablets', icon: 'phone-portrait-outline' },
  { id: 'home_furniture', name: 'Home & Furniture', icon: 'home-outline' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty', icon: 'shirt-outline' },
  { id: 'jobs_services', name: 'Jobs & Services', icon: 'briefcase-outline' },
  { id: 'kids_baby', name: 'Kids & Baby', icon: 'people-outline' },
  { id: 'sports_hobbies', name: 'Sports & Hobbies', icon: 'football-outline' },
  { id: 'pets', name: 'Pets', icon: 'paw-outline' },
  { id: 'agriculture', name: 'Agriculture & Food', icon: 'leaf-outline' },
  { id: 'commercial_equipment', name: 'Commercial Equipment', icon: 'construct-outline' },
  { id: 'repair_construction', name: 'Repair & Construction', icon: 'hammer-outline' },
  { id: 'friendship_dating', name: 'Friendship & Dating', icon: 'heart-outline' },
];

export function useSubcategoryModal() {
  // Modal visibility
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  
  // Selected category with its subcategories
  const [selectedCategoryForSubcats, setSelectedCategoryForSubcats] = useState<CategoryData | null>(null);
  
  // Subcategory counts from API
  const [subcategoryCounts, setSubcategoryCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  
  // Recent subcategories history
  const [recentSubcategories, setRecentSubcategories] = useState<RecentSubcategory[]>([]);

  // Load recent subcategories from storage
  const loadRecentSubcategories = useCallback(async () => {
    try {
      const stored = await Storage.getItem(RECENT_SUBCATEGORIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Keep only last 10 and those from last 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recent = parsed
          .filter((item: RecentSubcategory) => item.timestamp > thirtyDaysAgo)
          .slice(0, 10);
        setRecentSubcategories(recent);
      }
    } catch (error) {
      console.log('Error loading recent subcategories:', error);
    }
  }, []);

  // Save a subcategory to recent history
  const saveRecentSubcategory = useCallback(async (
    categoryId: string,
    categoryName: string,
    categoryIcon: string,
    subcategoryId: string,
    subcategoryName: string
  ) => {
    try {
      const newItem: RecentSubcategory = {
        categoryId,
        categoryName,
        categoryIcon,
        subcategoryId,
        subcategoryName,
        timestamp: Date.now(),
      };
      
      // Remove duplicates and add new item at the start
      const updated = [
        newItem,
        ...recentSubcategories.filter(
          item => !(item.categoryId === categoryId && item.subcategoryId === subcategoryId)
        )
      ].slice(0, 10);
      
      setRecentSubcategories(updated);
      await Storage.setItem(RECENT_SUBCATEGORIES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.log('Error saving recent subcategory:', error);
    }
  }, [recentSubcategories]);

  // Load recent subcategories on mount
  useEffect(() => {
    loadRecentSubcategories();
  }, []);

  // Open subcategory modal for a category
  const openSubcategoryModal = useCallback(async (categoryId: string) => {
    const category = FULL_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    const subcategories = getSubcategories(categoryId);
    
    // Show subcategory selection modal
    setSelectedCategoryForSubcats({
      id: categoryId,
      name: category.name,
      icon: category.icon,
      subcategories: subcategories,
    });
    setShowSubcategoryModal(true);
    
    // Fetch subcategory counts in background
    setLoadingCounts(true);
    try {
      const counts = await categoriesApi.getSubcategoryCounts(categoryId);
      setSubcategoryCounts(counts);
    } catch (error) {
      console.log('Error fetching subcategory counts:', error);
      setSubcategoryCounts({});
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  // Close the modal
  const closeSubcategoryModal = useCallback(() => {
    setShowSubcategoryModal(false);
  }, []);

  // Handle subcategory selection (returns navigation path)
  const handleSubcategorySelect = useCallback(async (
    categoryId: string, 
    subcategoryId?: string
  ): Promise<string> => {
    setShowSubcategoryModal(false);
    
    // Save to recent if a specific subcategory is selected
    if (subcategoryId && selectedCategoryForSubcats) {
      const subcategory = selectedCategoryForSubcats.subcategories.find(s => s.id === subcategoryId);
      if (subcategory) {
        await saveRecentSubcategory(
          categoryId,
          selectedCategoryForSubcats.name,
          selectedCategoryForSubcats.icon,
          subcategoryId,
          subcategory.name
        );
      }
    }
    
    // Return navigation path
    if (subcategoryId) {
      return `/category/${categoryId}?subcategory=${subcategoryId}`;
    }
    return `/category/${categoryId}`;
  }, [selectedCategoryForSubcats, saveRecentSubcategory]);

  // Handle recent subcategory press (returns navigation path)
  const handleRecentSubcategoryPress = useCallback((item: RecentSubcategory): string => {
    setShowSubcategoryModal(false);
    return `/category/${item.categoryId}?subcategory=${item.subcategoryId}`;
  }, []);

  return {
    // State
    showSubcategoryModal,
    selectedCategoryForSubcats,
    subcategoryCounts,
    loadingCounts,
    recentSubcategories,
    
    // Actions
    openSubcategoryModal,
    closeSubcategoryModal,
    handleSubcategorySelect,
    handleRecentSubcategoryPress,
  };
}

export default useSubcategoryModal;
