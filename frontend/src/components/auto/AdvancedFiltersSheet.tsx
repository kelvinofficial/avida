import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { AutoFilters } from '../../types/auto';
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  BODY_TYPES,
  DRIVE_TYPES,
  CONDITIONS,
  SELLER_TYPES,
  PRICE_RANGES,
  YEAR_RANGE,
  MILEAGE_RANGES,
} from '../../data/autoData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AdvancedFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: AutoFilters;
  onApplyFilters: (filters: AutoFilters) => void;
  onClearFilters: () => void;
}

export const AdvancedFiltersSheet: React.FC<AdvancedFiltersSheetProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onClearFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<AutoFilters>(filters);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['vehicle', 'condition', 'pricing'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const updateFilter = <K extends keyof AutoFilters>(key: K, value: AutoFilters[K]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleBooleanFilter = (key: keyof AutoFilters) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: prev[key] === true ? undefined : true,
    }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const renderSection = (
    id: string,
    title: string,
    icon: string,
    children: React.ReactNode
  ) => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(id)}
      >
        <View style={styles.sectionTitleRow}>
          <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Ionicons
          name={expandedSections.has(id) ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>
      {expandedSections.has(id) && (
        <View style={styles.sectionContent}>{children}</View>
      )}
    </View>
  );

  const renderChipSelector = (
    options: string[],
    selected: string | undefined,
    onSelect: (value: string | undefined) => void
  ) => (
    <View style={styles.chipContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.chip,
            selected === option && styles.chipSelected,
          ]}
          onPress={() => onSelect(selected === option ? undefined : option)}
        >
          <Text
            style={[
              styles.chipText,
              selected === option && styles.chipTextSelected,
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderToggle = (
    label: string,
    key: keyof AutoFilters,
    icon?: string
  ) => (
    <TouchableOpacity
      style={styles.toggleRow}
      onPress={() => toggleBooleanFilter(key)}
    >
      <View style={styles.toggleLabelRow}>
        {icon && (
          <Ionicons
            name={icon as any}
            size={18}
            color={localFilters[key] ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
        )}
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <View
        style={[
          styles.toggleSwitch,
          localFilters[key] && styles.toggleSwitchActive,
        ]}
      >
        <View
          style={[
            styles.toggleKnob,
            localFilters[key] && styles.toggleKnobActive,
          ]}
        />
      </View>
    </TouchableOpacity>
  );

  const activeFilterCount = Object.values(localFilters).filter(
    (v) => v !== undefined && v !== null
  ).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Advanced Filters</Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Vehicle Details */}
          {renderSection('vehicle', 'Vehicle Details', 'car', (
            <>
              <Text style={styles.filterLabel}>Year Range</Text>
              <View style={styles.rangeRow}>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangeValue}>
                    {localFilters.yearMin || YEAR_RANGE.min}
                  </Text>
                </View>
                <Text style={styles.rangeSeparator}>to</Text>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangeValue}>
                    {localFilters.yearMax || YEAR_RANGE.max}
                  </Text>
                </View>
              </View>

              <Text style={styles.filterLabel}>Mileage</Text>
              <View style={styles.chipContainer}>
                {MILEAGE_RANGES.map((range, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.chip,
                      localFilters.mileageMax === range.max && styles.chipSelected,
                    ]}
                    onPress={() =>
                      updateFilter(
                        'mileageMax',
                        localFilters.mileageMax === range.max ? undefined : range.max ?? undefined
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        localFilters.mileageMax === range.max && styles.chipTextSelected,
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Fuel Type</Text>
              {renderChipSelector(
                FUEL_TYPES,
                localFilters.fuelType,
                (v) => updateFilter('fuelType', v)
              )}

              <Text style={styles.filterLabel}>Transmission</Text>
              {renderChipSelector(
                TRANSMISSIONS,
                localFilters.transmission,
                (v) => updateFilter('transmission', v)
              )}

              <Text style={styles.filterLabel}>Body Type</Text>
              {renderChipSelector(
                BODY_TYPES,
                localFilters.bodyType,
                (v) => updateFilter('bodyType', v)
              )}

              <Text style={styles.filterLabel}>Drive Type</Text>
              {renderChipSelector(
                DRIVE_TYPES,
                localFilters.driveType,
                (v) => updateFilter('driveType', v)
              )}
            </>
          ))}

          {/* Condition & Trust */}
          {renderSection('condition', 'Condition & Trust', 'shield-checkmark', (
            <>
              <Text style={styles.filterLabel}>Condition</Text>
              <View style={styles.chipContainer}>
                {CONDITIONS.map((condition) => (
                  <TouchableOpacity
                    key={condition}
                    style={[
                      styles.chip,
                      localFilters.condition === condition.toLowerCase() && styles.chipSelected,
                    ]}
                    onPress={() =>
                      updateFilter(
                        'condition',
                        localFilters.condition === condition.toLowerCase()
                          ? undefined
                          : (condition.toLowerCase() as 'new' | 'used')
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        localFilters.condition === condition.toLowerCase() && styles.chipTextSelected,
                      ]}
                    >
                      {condition}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {renderToggle('Accident-free', 'accidentFree', 'checkmark-circle')}
              {renderToggle('Verified Seller', 'verifiedSeller', 'shield-checkmark')}
              {renderToggle('Inspection Available', 'inspectionAvailable', 'document-text')}
            </>
          ))}

          {/* Pricing & Deals */}
          {renderSection('pricing', 'Pricing & Deals', 'cash', (
            <>
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.chipContainer}>
                {PRICE_RANGES.map((range, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.chip,
                      localFilters.priceMin === range.min &&
                        localFilters.priceMax === range.max &&
                        styles.chipSelected,
                    ]}
                    onPress={() => {
                      if (
                        localFilters.priceMin === range.min &&
                        localFilters.priceMax === range.max
                      ) {
                        updateFilter('priceMin', undefined);
                        updateFilter('priceMax', undefined);
                      } else {
                        updateFilter('priceMin', range.min);
                        updateFilter('priceMax', range.max ?? undefined);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        localFilters.priceMin === range.min &&
                          localFilters.priceMax === range.max &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {renderToggle('Fixed Price', 'fixedPrice', 'pricetag')}
              {renderToggle('Negotiable', 'negotiable', 'swap-horizontal')}
              {renderToggle('Exchange Possible', 'exchangePossible', 'repeat')}
              {renderToggle('Accepts Offers', 'acceptsOffers', 'hand-left')}
              {renderToggle('Financing Available', 'financingAvailable', 'card')}
            </>
          ))}

          {/* Seller Type */}
          {renderSection('seller', 'Seller Type', 'person', (
            <View style={styles.chipContainer}>
              {SELLER_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.chip,
                    localFilters.sellerType === type.id && styles.chipSelected,
                  ]}
                  onPress={() =>
                    updateFilter(
                      'sellerType',
                      localFilters.sellerType === type.id
                        ? undefined
                        : (type.id as 'individual' | 'dealer' | 'certified')
                    )
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      localFilters.sellerType === type.id && styles.chipTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Apply Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>
              Show Results{activeFilterCount > 0 ? ` (${activeFilterCount} filters)` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  clearText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sectionContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.onSurface,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rangeInput: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
  },
  rangeValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  rangeSeparator: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  toggleLabel: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
