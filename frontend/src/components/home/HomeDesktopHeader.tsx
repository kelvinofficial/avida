/**
 * HomeDesktopHeader Component
 * Desktop/Tablet header specifically for the Home Screen
 * Wraps the shared DesktopHeader and adds category row + section title
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DesktopHeader } from '../layout';
import { desktopStyles } from './homeStyles';
import { Listing } from '../../types';

// Full categories list - Match backend DEFAULT_CATEGORIES
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

// Split categories into 2 rows for desktop
const ROW1_CATEGORIES = FULL_CATEGORIES.slice(0, 7);
const ROW2_CATEGORIES = FULL_CATEGORIES.slice(7);

interface HomeDesktopHeaderProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onCategoryPress: (categoryId: string) => void;
  listings: Listing[];
}

export const HomeDesktopHeader: React.FC<HomeDesktopHeaderProps> = ({
  selectedCategory,
  onCategorySelect,
  onCategoryPress,
  listings,
}) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const handleAllPress = () => {
    setShowCategoryDropdown(true);
  };

  const handleCategoryFromDropdown = (catId: string | null) => {
    setShowCategoryDropdown(false);
    if (catId === null) {
      onCategorySelect(null);
    } else {
      onCategoryPress(catId);
    }
  };

  return (
    <View style={desktopStyles.headerWrapper}>
      {/* Shared Desktop Header for Rows 1-2 */}
      <DesktopHeader showNavLinks={true} showSearch={true} showLocationSelector={true} />
      
      {/* Row 3: Category Icons in 2 Rows */}
      <View style={localStyles.categoryRowWrapper}>
        {/* Row 1 with All dropdown */}
        <View style={localStyles.categoryRow}>
          <TouchableOpacity
            style={[localStyles.categoryPill, !selectedCategory && localStyles.categoryPillActive]}
            onPress={handleAllPress}
            data-testid="category-all-btn"
          >
            <Ionicons name="apps" size={16} color={!selectedCategory ? '#fff' : '#666'} />
            <Text style={[localStyles.categoryPillText, !selectedCategory && localStyles.categoryPillTextActive]}>
              All
            </Text>
            <Ionicons name="chevron-down" size={14} color={!selectedCategory ? '#fff' : '#666'} />
          </TouchableOpacity>
          {ROW1_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[localStyles.categoryPill, selectedCategory === cat.id && localStyles.categoryPillActive]}
              onPress={() => onCategoryPress(cat.id)}
              data-testid={`category-${cat.id}-btn`}
            >
              <Ionicons 
                name={cat.icon as any} 
                size={16} 
                color={selectedCategory === cat.id ? '#fff' : '#666'} 
              />
              <Text style={[localStyles.categoryPillText, selectedCategory === cat.id && localStyles.categoryPillTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Row 2 */}
        <View style={localStyles.categoryRow}>
          {ROW2_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[localStyles.categoryPill, selectedCategory === cat.id && localStyles.categoryPillActive]}
              onPress={() => onCategoryPress(cat.id)}
              data-testid={`category-${cat.id}-btn`}
            >
              <Ionicons 
                name={cat.icon as any} 
                size={16} 
                color={selectedCategory === cat.id ? '#fff' : '#666'} 
              />
              <Text style={[localStyles.categoryPillText, selectedCategory === cat.id && localStyles.categoryPillTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category Dropdown Overlay - Uses fixed positioning for web compatibility */}
      {showCategoryDropdown && (
        <View style={localStyles.dropdownOverlay}>
          <Pressable 
            style={localStyles.modalBackdrop} 
            onPress={() => setShowCategoryDropdown(false)}
          />
          <View style={localStyles.dropdownContainer}>
            <View style={localStyles.dropdownHeader}>
              <Text style={localStyles.dropdownTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={localStyles.dropdownScroll}>
              <TouchableOpacity 
                style={[localStyles.dropdownItem, !selectedCategory && localStyles.dropdownItemActive]}
                onPress={() => handleCategoryFromDropdown(null)}
              >
                <Ionicons name="apps" size={20} color={!selectedCategory ? '#2E7D32' : '#666'} />
                <Text style={[localStyles.dropdownItemText, !selectedCategory && localStyles.dropdownItemTextActive]}>
                  All Categories
                </Text>
                {!selectedCategory && <Ionicons name="checkmark" size={20} color="#2E7D32" />}
              </TouchableOpacity>
              {FULL_CATEGORIES.map((cat) => (
                <TouchableOpacity 
                  key={cat.id}
                  style={[localStyles.dropdownItem, selectedCategory === cat.id && localStyles.dropdownItemActive]}
                  onPress={() => handleCategoryFromDropdown(cat.id)}
                >
                  <Ionicons name={cat.icon as any} size={20} color={selectedCategory === cat.id ? '#2E7D32' : '#666'} />
                  <Text style={[localStyles.dropdownItemText, selectedCategory === cat.id && localStyles.dropdownItemTextActive]}>
                    {cat.name}
                  </Text>
                  {selectedCategory === cat.id && <Ionicons name="checkmark" size={20} color="#2E7D32" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Section Title */}
      <View style={desktopStyles.sectionHeaderWrapper}>
        <View style={desktopStyles.sectionHeader}>
          <Text style={desktopStyles.sectionTitle} data-testid="section-title">
            {selectedCategory ? FULL_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Listings' : 'Recent Listings'}
          </Text>
          <Text style={desktopStyles.listingCount} data-testid="listing-count">
            {listings.length} items
          </Text>
        </View>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  categoryRowWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 10,
    zIndex: 100,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  categoryPillActive: {
    backgroundColor: '#2E7D32',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  // Fixed position dropdown overlay for web compatibility
  dropdownOverlay: {
    position: Platform.OS === 'web' ? 'fixed' as any : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dropdownContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: Platform.OS === 'web' ? [{ translateX: '-50%' }, { translateY: '-50%' }] as any : [],
    backgroundColor: '#fff',
    borderRadius: 16,
    width: Platform.OS === 'web' ? 400 : '90%',
    maxWidth: 400,
    maxHeight: '70%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 32,
      elevation: 10,
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dropdownScroll: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemActive: {
    backgroundColor: '#E8F5E9',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
});

export default HomeDesktopHeader;
