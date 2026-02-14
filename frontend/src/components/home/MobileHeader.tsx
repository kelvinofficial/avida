import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from './homeStyles';
import { CategoryIcon, AnimatedChip, FeaturedSellersSection } from './index';
import type { FeaturedSeller, FeaturedListing } from './index';
import { Category } from '../../types';

// Full categories list
const FULL_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'auto-vehicles', name: 'Auto & Vehicles', icon: 'car' },
  { id: 'properties', name: 'Properties', icon: 'home' },
  { id: 'electronics', name: 'Electronics', icon: 'tv' },
  { id: 'phones-tablets', name: 'Phones & Tablets', icon: 'phone-portrait' },
  { id: 'home-furniture', name: 'Home & Furniture', icon: 'bed' },
  { id: 'fashion-beauty', name: 'Fashion & Beauty', icon: 'shirt' },
  { id: 'jobs-services', name: 'Jobs & Services', icon: 'briefcase' },
  { id: 'kids-babies', name: 'Kids & Babies', icon: 'people' },
  { id: 'sports-hobbies', name: 'Sports & Hobbies', icon: 'football' },
  { id: 'pets', name: 'Pets', icon: 'paw' },
  { id: 'food-agriculture', name: 'Food & Agriculture', icon: 'leaf' },
  { id: 'health-wellness', name: 'Health & Wellness', icon: 'fitness' },
  { id: 'education', name: 'Education', icon: 'school' },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' },
];

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

  return (
    <View style={styles.headerWrapper}>
      {/* ROW 1: BRAND + NOTIFICATIONS */}
      <View style={styles.row1}>
        <Text style={styles.logo}>avida</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={ICON_SIZE} color="#333" />
          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ROW 2: LOCATION + SEARCH */}
      <View style={styles.row2}>
        {/* Location Selector Row */}
        <TouchableOpacity 
          style={styles.locationRow} 
          activeOpacity={0.7} 
          onPress={onLocationPress}
        >
          <Ionicons name="location" size={18} color="#2E7D32" />
          <Text style={styles.locationRowText}>{currentCity}</Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
        
        {/* Search Field Row */}
        <View style={styles.searchFieldWrapper}>
          <View style={styles.searchField}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
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
              <TouchableOpacity onPress={onClearSearch} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Search Suggestions Section */}
      {showSearchSuggestions && homeSearchQuery.length > 0 && searchSuggestions.autocomplete.length > 0 ? (
        <AutocompleteSuggestions 
          suggestions={searchSuggestions.autocomplete}
          onSuggestionClick={onSuggestionClick}
        />
      ) : showSearchSuggestions && (searchSuggestions.recent.length > 0 || searchSuggestions.trending.length > 0) ? (
        <RecentAndTrendingSuggestions
          recent={searchSuggestions.recent}
          trending={searchSuggestions.trending}
          onSuggestionClick={onSuggestionClick}
          onClearRecentSearches={onClearRecentSearches}
        />
      ) : (
        <>
          {/* FULL-WIDTH DIVIDER */}
          <View style={styles.divider} />

          {/* CATEGORY ICONS - CIRCULAR DESIGN */}
          <View style={styles.categoriesSection}>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}
            >
              {FULL_CATEGORIES.map((cat) => (
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
        </>
      )}

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

export default MobileHeader;
