import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { CAR_BRANDS, CAR_MODELS } from '../../data/autoData';

interface SmartSearchBarProps {
  onSearch: (query: string) => void;
  onVoiceSearch?: () => void;
  recentSearches?: string[];
  popularSearches?: string[];
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  onSearch,
  onVoiceSearch,
  recentSearches = [],
  popularSearches = [],
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }

    // Generate suggestions based on brands and models
    const lowercaseQuery = text.toLowerCase();
    const newSuggestions: string[] = [];

    // Match brands
    CAR_BRANDS.forEach((brand) => {
      if (brand.name.toLowerCase().includes(lowercaseQuery)) {
        newSuggestions.push(brand.name);
        // Add models for matched brand
        CAR_MODELS[brand.id]?.slice(0, 3).forEach((model) => {
          newSuggestions.push(`${brand.name} ${model}`);
        });
      }
    });

    // Also check models directly
    Object.entries(CAR_MODELS).forEach(([brandId, models]) => {
      models.forEach((model) => {
        if (model.toLowerCase().includes(lowercaseQuery)) {
          const brand = CAR_BRANDS.find((b) => b.id === brandId);
          if (brand) {
            newSuggestions.push(`${brand.name} ${model}`);
          }
        }
      });
    });

    setSuggestions([...new Set(newSuggestions)].slice(0, 6));
  };

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch(query.trim());
      Keyboard.dismiss();
      setIsFocused(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    Keyboard.dismiss();
    setIsFocused(false);
  };

  const showDropdown = isFocused && (suggestions.length > 0 || recentSearches.length > 0 || popularSearches.length > 0);

  return (
    <View style={styles.container}>
      <View style={[
        styles.searchContainer,
        isFocused && styles.searchContainerFocused,
      ]}>
        <Ionicons
          name="search"
          size={20}
          color={isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search by make, model, year, city"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setSuggestions([]);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={onVoiceSearch}
        >
          <Ionicons name="mic" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          {suggestions.length > 0 ? (
            <View>
              <Text style={styles.dropdownTitle}>Suggestions</Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <Ionicons name="search" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              {recentSearches.length > 0 && (
                <View style={styles.dropdownSection}>
                  <Text style={styles.dropdownTitle}>Recent Searches</Text>
                  {recentSearches.slice(0, 3).map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionPress(search)}
                    >
                      <Ionicons name="time" size={16} color={theme.colors.onSurfaceVariant} />
                      <Text style={styles.suggestionText}>{search}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {popularSearches.length > 0 && (
                <View style={styles.dropdownSection}>
                  <Text style={styles.dropdownTitle}>Popular Searches</Text>
                  {popularSearches.slice(0, 4).map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionPress(search)}
                    >
                      <Ionicons name="trending-up" size={16} color={theme.colors.primary} />
                      <Text style={styles.suggestionText}>{search}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    gap: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.onSurface,
    padding: 0,
  },
  voiceButton: {
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    ...theme.elevation.level3,
    maxHeight: 300,
  },
  dropdownSection: {
    marginBottom: theme.spacing.sm,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
});
