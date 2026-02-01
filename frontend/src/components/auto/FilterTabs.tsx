import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

interface FilterTab {
  id: string;
  label: string;
  value?: string;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  activeFilters: Record<string, any>;
  onTabPress: (tabId: string) => void;
  onMoreFilters: () => void;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  tabs,
  activeFilters,
  onTabPress,
  onMoreFilters,
}) => {
  const hasActiveFilter = (tabId: string) => {
    return activeFilters[tabId] !== undefined && activeFilters[tabId] !== null;
  };

  const getFilterCount = () => {
    return Object.keys(activeFilters).filter((key) => 
      !['make', 'model', 'city', 'priceMin', 'priceMax'].includes(key) &&
      activeFilters[key] !== undefined && 
      activeFilters[key] !== null
    ).length;
  };

  const filterCount = getFilterCount();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            hasActiveFilter(tab.id) && styles.tabActive,
          ]}
          onPress={() => onTabPress(tab.id)}
        >
          <Text style={[
            styles.tabText,
            hasActiveFilter(tab.id) && styles.tabTextActive,
          ]} numberOfLines={1}>
            {tab.value || tab.label}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={hasActiveFilter(tab.id) ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          styles.moreFiltersTab,
          filterCount > 0 && styles.moreFiltersTabActive,
        ]}
        onPress={onMoreFilters}
      >
        <Ionicons
          name="options"
          size={16}
          color={filterCount > 0 ? theme.colors.onPrimary : theme.colors.primary}
        />
        <Text style={[
          styles.moreFiltersText,
          filterCount > 0 && styles.moreFiltersTextActive,
        ]}>
          More Filters
        </Text>
        {filterCount > 0 && (
          <View style={styles.filterCountBadge}>
            <Text style={styles.filterCountText}>{filterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: theme.colors.onSurface,
    fontWeight: '500',
    maxWidth: 100,
  },
  tabTextActive: {
    color: theme.colors.onPrimary,
  },
  moreFiltersTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 4,
  },
  moreFiltersTabActive: {
    backgroundColor: theme.colors.primary,
  },
  moreFiltersText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  moreFiltersTextActive: {
    color: theme.colors.onPrimary,
  },
  filterCountBadge: {
    backgroundColor: theme.colors.onPrimary,
    borderRadius: theme.borderRadius.full,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
