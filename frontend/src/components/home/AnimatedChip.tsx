import React, { memo, useRef } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============ TYPES ============
export interface AnimatedChipProps {
  onPress: () => void;
  icon: string;
  iconColor: string;
  text: string;
  style?: any;
  testID?: string;
}

// ============ COMPONENT ============
export const AnimatedChip = memo<AnimatedChipProps>(({ onPress, icon, iconColor, text, style, testID }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 4,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      testID={testID}
    >
      <Animated.View style={[styles.chip, style, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name={icon as any} size={14} color={iconColor} />
        <Text style={styles.chipText} numberOfLines={1}>{text}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

AnimatedChip.displayName = 'AnimatedChip';

// ============ STYLES ============
const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    maxWidth: 120,
  },
});

export default AnimatedChip;
