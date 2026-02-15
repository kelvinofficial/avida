import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/navigation';

interface BackButtonProps {
  /**
   * Custom fallback route if there's no navigation history
   * @default '/'
   */
  fallbackRoute?: string;
  /**
   * Icon color
   * @default '#1A1A1A'
   */
  color?: string;
  /**
   * Icon size
   * @default 24
   */
  size?: number;
  /**
   * Additional container styles
   */
  style?: ViewStyle;
  /**
   * Test ID for testing
   * @default 'back-button'
   */
  testID?: string;
  /**
   * Optional custom onPress handler (overrides default navigation)
   */
  onPress?: () => void;
}

/**
 * Reusable BackButton component with consistent styling across the app.
 * Uses safeGoBack to navigate back or fallback to a specified route.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  fallbackRoute = '/',
  color = '#1A1A1A',
  size = 24,
  style,
  testID = 'back-button',
  onPress,
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      safeGoBack(router, fallbackRoute);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel="Go back"
      accessibilityRole="button"
      data-testid={testID}
    >
      <Ionicons name="arrow-back" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BackButton;
