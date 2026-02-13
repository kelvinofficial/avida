import React, { useCallback } from 'react';
import { 
  Pressable, 
  StyleSheet, 
  ViewStyle, 
  Platform,
  GestureResponderEvent
} from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TouchableScaleProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
  activeScale?: number;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
}

/**
 * TouchableScale Component
 * 
 * Enhanced touchable with:
 * - Scale animation on press
 * - Haptic feedback (iOS/Android)
 * - Spring animation for natural feel
 * - Accessibility support
 */
export const TouchableScale: React.FC<TouchableScaleProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  activeScale = 0.97,
  hapticFeedback = 'light',
  disabled = false,
  testID,
  accessibilityLabel,
  accessibilityRole = 'button',
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(activeScale, {
      damping: 15,
      stiffness: 400,
    });
    opacity.value = withTiming(0.9, { duration: 100 });

    // Trigger haptic feedback on native platforms
    if (Platform.OS !== 'web' && hapticFeedback !== 'none') {
      const hapticStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      }[hapticFeedback];
      
      Haptics.impactAsync(hapticStyle).catch(() => {
        // Haptics not available, ignore
      });
    }
  }, [activeScale, hapticFeedback]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
    opacity.value = withTiming(1, { duration: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.container, style, animatedStyle, disabled && styles.disabled]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled }}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    // Base styles
  },
  disabled: {
    opacity: 0.5,
  },
});

export default TouchableScale;
