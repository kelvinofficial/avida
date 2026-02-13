import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  useSharedValue,
  withRepeat,
  withSequence
} from 'react-native-reanimated';

interface OfflineBannerProps {
  isOffline: boolean;
  onRetry?: () => void;
}

/**
 * Offline Banner Component
 * Displays a prominent banner when the device loses network connectivity
 * Provides visual feedback and retry option for users
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({ 
  isOffline,
  onRetry 
}) => {
  const translateY = useSharedValue(isOffline ? 0 : -60);
  const pulseOpacity = useSharedValue(1);

  React.useEffect(() => {
    translateY.value = withTiming(isOffline ? 0 : -60, { duration: 300 });
    
    if (isOffline) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isOffline]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Animated.View style={[styles.content, pulseStyle]}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
        </View>
        <Text style={styles.text}>You're offline</Text>
        {onRetry && (
          <Pressable 
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retry connection"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#EF5350',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  retryButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OfflineBanner;
