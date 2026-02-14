/**
 * HomeDesktopHeader Component
 * Desktop/Tablet header specifically for the Home Screen
 * Wraps the shared DesktopHeader and adds category row + section title
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
  return (
    <View style={desktopStyles.headerWrapper}>
      {/* Shared Desktop Header for Rows 1-2 */}
      <DesktopHeader showNavLinks={true} showSearch={true} showLocationSelector={true} />
      
      {/* Row 3: Category Icons */}
      <View style={desktopStyles.categoryRowWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={desktopStyles.categoryScroll}
          contentContainerStyle={desktopStyles.categoryContent}
        >
          <TouchableOpacity
            style={[desktopStyles.categoryPill, !selectedCategory && desktopStyles.categoryPillActive]}
            onPress={() => onCategorySelect(null)}
            data-testid="category-all-btn"
          >
            <Ionicons name="apps" size={16} color={!selectedCategory ? '#fff' : '#666'} />
            <Text style={[desktopStyles.categoryPillText, !selectedCategory && desktopStyles.categoryPillTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {FULL_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[desktopStyles.categoryPill, selectedCategory === cat.id && desktopStyles.categoryPillActive]}
              onPress={() => onCategoryPress(cat.id)}
              data-testid={`category-${cat.id}-btn`}
            >
              <Ionicons 
                name={cat.icon as any} 
                size={16} 
                color={selectedCategory === cat.id ? '#fff' : '#666'} 
              />
              <Text style={[desktopStyles.categoryPillText, selectedCategory === cat.id && desktopStyles.categoryPillTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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

export default HomeDesktopHeader;
