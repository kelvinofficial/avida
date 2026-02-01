import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, CATEGORY_COLORS, CATEGORY_ICON_COLORS } from '../utils/theme';
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
  const bgColor = CATEGORY_COLORS[category.id] || theme.colors.surfaceVariant;
  const iconColor = CATEGORY_ICON_COLORS[category.id] || theme.colors.primary;

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.chipCompact,
          selected && styles.chipCompactSelected,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={category.icon as any}
          size={16}
          color={selected ? theme.colors.onPrimary : iconColor}
        />
        <Text
          style={[
            styles.labelCompact,
            selected && styles.labelCompactSelected,
          ]}
          numberOfLines={1}
        >
          {category.name.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Ionicons
          name={category.icon as any}
          size={24}
          color={iconColor}
        />
      </View>
      <Text
        style={[
          styles.label,
          selected && styles.labelSelected,
        ]}
        numberOfLines={1}
      >
        {category.name.split('&')[0].trim()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    marginRight: theme.spacing.md,
    width: 72,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: 11,
    color: theme.colors.onSurface,
    textAlign: 'center',
    fontWeight: '500',
  },
  labelSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  chipCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  chipCompactSelected: {
    backgroundColor: theme.colors.primary,
  },
  labelCompact: {
    fontSize: 13,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  labelCompactSelected: {
    color: theme.colors.onPrimary,
  },
});
