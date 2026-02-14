import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Theme colors for category icons
export const COLORS_CATEGORY = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#fff',
  text: '#333',
};

// Category item width calculation
export const CATEGORY_ITEM_WIDTH = 72;

export interface CategoryIconProps {
  id: string;
  name: string;
  icon: string;
  onPress: () => void;
  selected?: boolean;
}

export const CategoryIcon = memo<CategoryIconProps>(({ id, name, icon, onPress, selected }) => {
  return (
    <TouchableOpacity 
      style={styles.item} 
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${name} category`}
      accessibilityRole="button"
      data-testid={`category-icon-${id}`}
    >
      <View style={[
        styles.iconContainer,
        selected && styles.iconContainerSelected,
      ]}>
        <Ionicons 
          name={icon as any} 
          size={28} 
          color={selected ? '#fff' : COLORS_CATEGORY.primary} 
        />
      </View>
      <Text style={[
        styles.label,
        selected && styles.labelSelected
      ]} numberOfLines={2}>
        {name}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    width: CATEGORY_ITEM_WIDTH,
    marginBottom: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS_CATEGORY.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: COLORS_CATEGORY.primary,
  },
  label: {
    fontSize: 11,
    color: COLORS_CATEGORY.text,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
    height: 28,
  },
  labelSelected: {
    color: COLORS_CATEGORY.primary,
    fontWeight: '600',
  },
});

export default CategoryIcon;
