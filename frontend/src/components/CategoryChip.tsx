import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { Category } from '../types';

interface CategoryChipProps {
  category: Category;
  selected?: boolean;
  onPress: () => void;
  compact?: boolean;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  category,
  selected = false,
  onPress,
  compact = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        compact && styles.chipCompact,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
        <Ionicons
          name={category.icon as any}
          size={compact ? 18 : 24}
          color={selected ? theme.colors.onPrimary : theme.colors.primary}
        />
      </View>
      <Text
        style={[
          styles.label,
          selected && styles.labelSelected,
          compact && styles.labelCompact,
        ]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    minWidth: 80,
  },
  chipSelected: {
    // Selected state handled by children
  },
  chipCompact: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minWidth: 'auto',
    gap: theme.spacing.xs,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  iconContainerSelected: {
    backgroundColor: theme.colors.primary,
  },
  label: {
    fontSize: 12,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  labelSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 13,
    marginBottom: 0,
  },
});
