import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from './homeStyles';
import { CategoryIcon } from './CategoryIcon';
import { AnimatedChip } from './AnimatedChip';
import { FeaturedSellersSection } from './FeaturedSellersSection';
import type { FeaturedSeller, FeaturedListing } from './FeaturedSellersSection';
import { Category } from '../../types';

// Full categories list - Must match backend DEFAULT_CATEGORIES and HomeDesktopHeader.tsx
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

// All categories for the icon scroll (same list without filter)
const ICON_CATEGORIES = FULL_CATEGORIES;

interface SearchSuggestions {
  recent: string[];
  trending: { query: string; count: number }[];
  autocomplete: { query: string; count: number }[];
}

interface MobileHeaderProps {
  // Notification & User data
  notificationCount: number;
  
  // Location state
  currentCity: string;
  onLocationPress: () => void;
  
  // Search state
  homeSearchQuery: string;
  showSearchSuggestions: boolean;
  searchSuggestions: SearchSuggestions;
  onSearchInputChange: (text: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onSearchSubmit: () => void;
  onSuggestionClick: (query: string) => void;
  onClearSearch: () => void;
  onClearRecentSearches: () => void;
  
  // Category state
  selectedCategory: string | null;
  onCategoryPress: (categoryId: string) => void;
  onClearCategory: () => void;
  
  // Featured data
  featuredListings: FeaturedListing[];
  featuredSellers: FeaturedSeller[];
  loadingFeatured: boolean;
  
  // Expanded search
  expandedSearch: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  notificationCount,
  currentCity,
  onLocationPress,
  homeSearchQuery,
  showSearchSuggestions,
  searchSuggestions,
  onSearchInputChange,
  onSearchFocus,
  onSearchBlur,
  onSearchSubmit,
  onSuggestionClick,
  onClearSearch,
  onClearRecentSearches,
  selectedCategory,
  onCategoryPress,
  onClearCategory,
  featuredListings,
  featuredSellers,
  loadingFeatured,
  expandedSearch,
}) => {
  const router = useRouter();
  const ICON_SIZE = 24;
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Handle category selection from dropdown
  const handleCategoryDropdownSelect = (categoryId: string | null) => {
    if (categoryId === null || categoryId === 'all') {
      onClearCategory();
    } else {
      onCategoryPress(categoryId);
    }
    setShowCategoryDropdown(false);
  };

  return (
    <View style={styles.headerWrapper}>
      {/* Category Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity 
          style={mobileDropdownStyles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={mobileDropdownStyles.dropdownContainer}>
            <View style={mobileDropdownStyles.dropdownHeader}>
              <Text style={mobileDropdownStyles.dropdownTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={mobileDropdownStyles.dropdownScroll} showsVerticalScrollIndicator={true}>
              <TouchableOpacity
                style={[mobileDropdownStyles.dropdownItem, !selectedCategory && mobileDropdownStyles.dropdownItemActive]}
                onPress={() => handleCategoryDropdownSelect(null)}
                data-testid="mobile-category-all"
              >
                <Ionicons name="apps-outline" size={20} color={!selectedCategory ? '#2E7D32' : '#666'} />
                <Text style={[mobileDropdownStyles.dropdownItemText, !selectedCategory && mobileDropdownStyles.dropdownItemTextActive]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {ICON_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[mobileDropdownStyles.dropdownItem, selectedCategory === cat.id && mobileDropdownStyles.dropdownItemActive]}
                  onPress={() => handleCategoryDropdownSelect(cat.id)}
                  data-testid={`mobile-category-${cat.id}`}
                >
                  <Ionicons name={cat.icon as any} size={20} color={selectedCategory === cat.id ? '#2E7D32' : '#666'} />
                  <Text style={[mobileDropdownStyles.dropdownItemText, selectedCategory === cat.id && mobileDropdownStyles.dropdownItemTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ROW 1: LOGO + LOCATION (center) + NOTIFICATIONS + PROFILE */}
      <View style={newHeaderStyles.row1}>
        {/* Logo - Left */}
        <Text style={newHeaderStyles.logo} data-testid="mobile-header-logo">avida</Text>
        
        {/* Location - Center */}
        <TouchableOpacity 
          style={newHeaderStyles.locationChip} 
          activeOpacity={0.7} 
          onPress={onLocationPress}
          data-testid="mobile-location-selector"
        >
          <Ionicons name="location" size={16} color="#2E7D32" />
          <Text style={newHeaderStyles.locationText} numberOfLines={1}>{currentCity}</Text>
          <Ionicons name="chevron-down" size={14} color="#666" />
        </TouchableOpacity>
        
        {/* Right Icon - Notification only */}
        <TouchableOpacity
          style={newHeaderStyles.iconButton}
          onPress={() => router.push('/notifications')}
          accessibilityLabel="Notifications"
          data-testid="mobile-notifications-btn"
        >
          <Ionicons name="notifications-outline" size={22} color="#2E7D32" />
          {notificationCount > 0 && (
            <View style={newHeaderStyles.notificationBadge}>
              <Text style={newHeaderStyles.notificationBadgeText}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ROW 2: FULL-WIDTH SEARCH BAR WITH DROPDOWN */}
      <View style={newHeaderStyles.row2}>
        <View style={newHeaderStyles.searchContainer}>
          <View style={newHeaderStyles.searchField}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={newHeaderStyles.searchInput}
              placeholder="Search for anything..."
              placeholderTextColor="#999"
              value={homeSearchQuery}
              onChangeText={onSearchInputChange}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              onSubmitEditing={onSearchSubmit}
              returnKeyType="search"
              data-testid="home-search-input"
            />
            {homeSearchQuery.length > 0 && (
              <TouchableOpacity onPress={onClearSearch} style={newHeaderStyles.searchIconBtn}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Search Suggestions Dropdown */}
          {showSearchSuggestions && (
            <View style={newHeaderStyles.suggestionsDropdown}>
              {/* Autocomplete suggestions when typing */}
              {homeSearchQuery.length > 0 && searchSuggestions.autocomplete.length > 0 ? (
                <>
                  {searchSuggestions.autocomplete.slice(0, 6).map((item, idx) => (
                    <TouchableOpacity
                      key={`autocomplete-${idx}`}
                      style={newHeaderStyles.suggestionItem}
                      onPress={() => onSuggestionClick(item.query)}
                      data-testid={`suggestion-item-${idx}`}
                    >
                      <Ionicons name="search-outline" size={18} color="#666" />
                      <Text style={newHeaderStyles.suggestionText} numberOfLines={1}>{item.query}</Text>
                      {item.count > 0 && (
                        <Text style={newHeaderStyles.suggestionCount}>{item.count} results</Text>
                      )}
                      <Ionicons name="arrow-forward" size={16} color="#ccc" />
                    </TouchableOpacity>
                  ))}
                </>
              ) : searchSuggestions.recent.length > 0 ? (
                /* Recent searches when not typing */
                <>
                  <View style={newHeaderStyles.suggestionHeader}>
                    <View style={newHeaderStyles.suggestionHeaderLeft}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={newHeaderStyles.suggestionHeaderText}>Recent Searches</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={onClearRecentSearches}
                      data-testid="clear-recent-btn"
                    >
                      <Text style={newHeaderStyles.clearText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  {searchSuggestions.recent.slice(0, 5).map((query, idx) => (
                    <TouchableOpacity
                      key={`recent-${idx}`}
                      style={newHeaderStyles.suggestionItem}
                      onPress={() => onSuggestionClick(query)}
                      data-testid={`recent-item-${idx}`}
                    >
                      <Ionicons name="time-outline" size={18} color="#999" />
                      <Text style={newHeaderStyles.suggestionText} numberOfLines={1}>{query}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#ccc" />
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View style={newHeaderStyles.noSuggestions}>
                  <Ionicons name="search-outline" size={24} color="#ccc" />
                  <Text style={newHeaderStyles.noSuggestionsText}>Start typing to search</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* FULL-WIDTH DIVIDER */}
      <View style={styles.divider} />

      {/* CATEGORY ICONS - ALL BUTTON INCLUDED IN SCROLL */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {/* All Button - Same style as category icons */}
          <TouchableOpacity 
            style={allIconStyles.item}
            onPress={() => setShowCategoryDropdown(true)}
            activeOpacity={0.7}
            accessibilityLabel="All categories"
            accessibilityRole="button"
            data-testid="mobile-all-dropdown-trigger"
          >
            <View style={[
              allIconStyles.iconContainer,
              selectedCategory === null && allIconStyles.iconContainerSelected,
            ]}>
              <Ionicons 
                name="apps" 
                size={28} 
                color={selectedCategory === null ? '#fff' : '#2E7D32'} 
              />
            </View>
            <Text style={[
              allIconStyles.label,
              selectedCategory === null && allIconStyles.labelSelected
            ]}>All</Text>
          </TouchableOpacity>
          
          {/* Category Icons */}
          {ICON_CATEGORIES.map((cat) => (
            <CategoryIcon
              key={cat.id}
              id={cat.id}
              name={cat.name}
              icon={cat.icon}
              selected={selectedCategory === cat.id}
              onPress={() => onCategoryPress(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* FEATURED SELLERS SECTION */}
      <FeaturedSellersSection 
        featuredListings={featuredListings}
        featuredSellers={featuredSellers}
        loadingFeatured={loadingFeatured}
      />

      {/* SECTION TITLE */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedCategory 
            ? FULL_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Listings' 
            : (expandedSearch ? 'Nearby Listings' : 'Recent Listings')}
        </Text>
        {selectedCategory && (
          <TouchableOpacity onPress={onClearCategory}>
            <Text style={styles.clearFilter}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Autocomplete suggestions component
const AutocompleteSuggestions: React.FC<{
  suggestions: { query: string; count: number }[];
  onSuggestionClick: (query: string) => void;
}> = ({ suggestions, onSuggestionClick }) => (
  <View style={styles.suggestionsSection}>
    <View style={styles.suggestionSection}>
      <View style={styles.suggestionHeader}>
        <Ionicons name="search" size={14} color="#2E7D32" />
        <Text style={[styles.suggestionHeaderText, { color: '#2E7D32' }]}>Suggestions</Text>
      </View>
      <View style={styles.autocompleteList}>
        {suggestions.map((item, idx) => (
          <TouchableOpacity
            key={`autocomplete-${idx}`}
            style={styles.autocompleteItem}
            onPress={() => onSuggestionClick(item.query)}
            data-testid={`autocomplete-item-${idx}`}
          >
            <Ionicons name="search-outline" size={16} color="#666" style={{ marginRight: 12 }} />
            <Text style={styles.autocompleteText} numberOfLines={1}>{item.query}</Text>
            {item.count > 0 && (
              <View style={styles.autocompleteCount}>
                <Text style={styles.autocompleteCountText}>{item.count}</Text>
              </View>
            )}
            <Ionicons name="arrow-forward" size={14} color="#999" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </View>
);

// Recent and trending suggestions component
const RecentAndTrendingSuggestions: React.FC<{
  recent: string[];
  trending: { query: string; count: number }[];
  onSuggestionClick: (query: string) => void;
  onClearRecentSearches: () => void;
}> = ({ recent, trending, onSuggestionClick, onClearRecentSearches }) => (
  <View style={styles.suggestionsSection}>
    {/* Recent Searches - Horizontal Chips */}
    {recent.length > 0 && (
      <View style={styles.suggestionSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={[styles.suggestionHeaderText, { marginLeft: 6 }]}>Recent</Text>
          <TouchableOpacity 
            onPress={onClearRecentSearches}
            style={{ marginLeft: 'auto', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}
            data-testid="clear-recent-searches-btn"
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#2E7D32' }}>Clear</Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionChipsContainer}
        >
          {recent.slice(0, 5).map((query, idx) => (
            <AnimatedChip
              key={`recent-${idx}`}
              icon="time-outline"
              iconColor="#666"
              text={query}
              onPress={() => onSuggestionClick(query)}
              testID={`recent-search-chip-${idx}`}
            />
          ))}
        </ScrollView>
      </View>
    )}
    
    {/* Trending Searches - Horizontal Chips */}
    {trending.length > 0 && (
      <View style={styles.suggestionSection}>
        <View style={styles.suggestionHeader}>
          <Ionicons name="trending-up" size={14} color="#F57C00" />
          <Text style={[styles.suggestionHeaderText, { color: '#F57C00' }]}>Trending</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionChipsContainer}
        >
          {trending.slice(0, 6).map((item, idx) => (
            <AnimatedChip
              key={`trending-${idx}`}
              icon="flame"
              iconColor="#F57C00"
              text={item.query}
              onPress={() => onSuggestionClick(item.query)}
              style={styles.trendingChip}
              testID={`trending-search-chip-${idx}`}
            />
          ))}
        </ScrollView>
      </View>
    )}
  </View>
);

// Mobile dropdown styles
const mobileDropdownStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dropdownScroll: {
    paddingHorizontal: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    gap: 12,
    backgroundColor: '#f8f8f8',
  },
  dropdownItemActive: {
    backgroundColor: '#E8F5E9',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  // Categories row with All button
  categoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  allButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  allButtonActive: {
    backgroundColor: '#2E7D32',
  },
  allButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  allButtonTextActive: {
    color: '#fff',
  },
  categoriesScroll: {
    flex: 1,
  },
});

// All Icon Styles - Matching CategoryIcon design
const allIconStyles = StyleSheet.create({
  item: {
    alignItems: 'center',
    width: 72,
    marginBottom: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: '#2E7D32',
  },
  label: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
    height: 28,
  },
  labelSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },
});

// NEW Header Styles - Two-tier layout matching mockup
const newHeaderStyles = StyleSheet.create({
  // Row 1: Logo + Location (center) + Icons (right)
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: -0.5,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    maxWidth: 160,
  },
  locationText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flexShrink: 1,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  
  // Row 2: Full-width search bar with dropdown
  row2: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 1000,
  },
  searchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    height: 52,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    // Shadow for elevated look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
    height: '100%',
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Search suggestions dropdown
  suggestionsDropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
    maxHeight: 320,
    overflow: 'hidden',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  suggestionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  suggestionCount: {
    fontSize: 12,
    color: '#999',
  },
  noSuggestions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noSuggestionsText: {
    fontSize: 14,
    color: '#999',
  },
});

export default MobileHeader;
