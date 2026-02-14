import React, { memo, useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ============ ANIMATED CHIP COMPONENT ============
interface AnimatedChipProps {
  onPress: () => void;
  icon: string;
  iconColor: string;
  text: string;
  style?: any;
  testID?: string;
}

export const AnimatedChip = memo<AnimatedChipProps>(({ onPress, icon, iconColor, text, style, testID }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.suggestionChip, style]}
        activeOpacity={0.8}
        data-testid={testID}
      >
        <Ionicons name={icon as any} size={14} color={iconColor} />
        <Text style={styles.chipText} numberOfLines={1}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ============ SEARCH SUGGESTIONS SECTION ============
interface SearchSuggestionsProps {
  homeSearchQuery: string;
  searchSuggestions: {
    recent: string[];
    trending: { query: string; count: number }[];
    autocomplete: { query: string; count: number }[];
  };
  showSearchSuggestions: boolean;
  onSuggestionClick: (query: string) => void;
  onClearRecentSearches: () => void;
}

export const SearchSuggestions = memo<SearchSuggestionsProps>(({
  homeSearchQuery,
  searchSuggestions,
  showSearchSuggestions,
  onSuggestionClick,
  onClearRecentSearches,
}) => {
  if (!showSearchSuggestions) return null;

  // Show autocomplete when user is typing
  if (homeSearchQuery.length > 0 && searchSuggestions.autocomplete.length > 0) {
    return (
      <View style={styles.suggestionsSection}>
        <View style={styles.suggestionSection}>
          <View style={styles.suggestionHeader}>
            <Ionicons name="search" size={14} color="#2E7D32" />
            <Text style={[styles.suggestionHeaderText, { color: '#2E7D32' }]}>Suggestions</Text>
          </View>
          <View style={styles.autocompleteList}>
            {searchSuggestions.autocomplete.map((item, idx) => (
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
  }

  // Show recent + trending when search is empty
  if (searchSuggestions.recent.length > 0 || searchSuggestions.trending.length > 0) {
    return (
      <View style={styles.suggestionsSection}>
        {/* Recent Searches - Horizontal Chips */}
        {searchSuggestions.recent.length > 0 && (
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
              {searchSuggestions.recent.slice(0, 5).map((query, idx) => (
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
        {searchSuggestions.trending.length > 0 && (
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
              {searchSuggestions.trending.slice(0, 6).map((item, idx) => (
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
  }

  return null;
});

// ============ SEARCH INPUT HOOK ============
export const useSearchSuggestions = () => {
  const router = useRouter();
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<{
    recent: string[];
    trending: { query: string; count: number }[];
    autocomplete: { query: string; count: number }[];
  }>({ recent: [], trending: [], autocomplete: [] });

  // Load search suggestions on mount
  const loadSearchSuggestions = useCallback(async () => {
    try {
      // Load recent searches from localStorage
      let recent: string[] = [];
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem('recent_searches');
        if (stored) {
          recent = JSON.parse(stored);
        }
      }

      // Fetch trending searches from API
      let trending: { query: string; count: number }[] = [];
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/searches/popular?limit=5`);
        if (res.ok) {
          const data = await res.json();
          trending = data.global_searches || [];
        }
      } catch (e) {
        console.log('Could not fetch trending searches');
      }

      setSearchSuggestions(prev => ({ ...prev, recent: recent.slice(0, 5), trending }));
    } catch (err) {
      console.error('Failed to load search suggestions:', err);
    }
  }, []);

  useEffect(() => {
    loadSearchSuggestions();
  }, [loadSearchSuggestions]);

  // Fetch autocomplete suggestions
  const fetchAutocompleteSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions(prev => ({ ...prev, autocomplete: [] }));
      return;
    }

    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/searches/suggestions?q=${encodeURIComponent(query)}&limit=8`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchSuggestions(prev => ({ 
          ...prev, 
          autocomplete: data.suggestions || [] 
        }));
      }
    } catch (e) {
      console.log('Could not fetch autocomplete suggestions');
    }
  }, []);

  // Handle input change with debounce
  const handleSearchInputChange = useCallback((text: string) => {
    setHomeSearchQuery(text);
    
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }
    
    if (text.length === 0) {
      setShowSearchSuggestions(true);
      setSearchSuggestions(prev => ({ ...prev, autocomplete: [] }));
    } else {
      setShowSearchSuggestions(true);
      autocompleteTimeoutRef.current = setTimeout(() => {
        fetchAutocompleteSuggestions(text);
      }, 300);
    }
  }, [fetchAutocompleteSuggestions]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((query: string) => {
    setHomeSearchQuery(query);
    setShowSearchSuggestions(false);
    const searchUrl = `/search?q=${encodeURIComponent(query.trim())}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = searchUrl;
    } else {
      router.push(searchUrl);
    }
  }, [router]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('recent_searches');
    }
    setSearchSuggestions(prev => ({ ...prev, recent: [] }));
  }, []);

  // Handle search submit
  const handleSearchSubmit = useCallback(() => {
    if (homeSearchQuery.trim()) {
      // Save to recent searches
      if (Platform.OS === 'web') {
        try {
          const stored = localStorage.getItem('recent_searches');
          let recent: string[] = stored ? JSON.parse(stored) : [];
          recent = [homeSearchQuery.trim(), ...recent.filter(q => q !== homeSearchQuery.trim())].slice(0, 10);
          localStorage.setItem('recent_searches', JSON.stringify(recent));
        } catch (e) {
          console.log('Could not save recent search');
        }
      }
      
      const searchUrl = `/search?q=${encodeURIComponent(homeSearchQuery.trim())}`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = searchUrl;
      } else {
        router.push(searchUrl);
      }
    }
  }, [homeSearchQuery, router]);

  return {
    homeSearchQuery,
    setHomeSearchQuery,
    showSearchSuggestions,
    setShowSearchSuggestions,
    searchSuggestions,
    handleSearchInputChange,
    handleSuggestionClick,
    clearRecentSearches,
    handleSearchSubmit,
    loadSearchSuggestions,
  };
};

const styles = StyleSheet.create({
  suggestionsSection: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingTop: 4,
    marginTop: -60,
    paddingBottom: 20,
    position: 'relative',
    zIndex: 10000,
  },
  suggestionSection: {
    paddingVertical: 4,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionChipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
    flexDirection: 'row',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    gap: 6,
  },
  trendingChip: {
    backgroundColor: '#FFF3E0',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    maxWidth: 120,
  },
  autocompleteList: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  autocompleteText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  autocompleteCount: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  autocompleteCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
});

export default SearchSuggestions;
