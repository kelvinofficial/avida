import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { 
  Image, 
  View, 
  StyleSheet, 
  ImageStyle,
  ViewStyle,
  Platform,
  Animated
} from 'react-native';
import { ImagePlaceholder } from './ImagePlaceholder';

interface OptimizedImageProps {
  uri: string | null | undefined;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholderType?: 'listing' | 'avatar';
  placeholderSize?: 'small' | 'medium' | 'large';
  showLoadingIndicator?: boolean;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  priority?: 'low' | 'normal' | 'high';
}

/**
 * ImageShimmer - Skeleton loading animation for images
 * Uses CSS animation on web and Animated.View on native
 */
const ImageShimmer: React.FC<{ style?: ViewStyle }> = memo(({ style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // For web, use CSS animation via data attribute
  if (Platform.OS === 'web') {
    return (
      <View
        // @ts-ignore - data attribute for CSS styling
        dataSet={{ shimmer: true }}
        style={[styles.shimmerContainer, style]}
      />
    );
  }

  // For native, use Animated.View with translateX
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View style={[styles.shimmerContainer, style]}>
      <Animated.View
        style={[
          styles.shimmerGradient,
          { transform: [{ translateX }, { skewX: '-20deg' }] }
        ]}
      />
    </View>
  );
});

ImageShimmer.displayName = 'ImageShimmer';

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Shimmer skeleton loading animation
 * - Lazy loading with loading states
 * - Graceful fallback to placeholder on error
 * - Optimized for mobile performance
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  uri,
  style,
  containerStyle,
  placeholderType = 'listing',
  placeholderSize = 'medium',
  showLoadingIndicator = true,
  resizeMode = 'cover',
  priority = 'normal',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // If no URI or error occurred, show placeholder
  if (!uri || hasError) {
    return (
      <View style={[styles.container, containerStyle, style]}>
        <ImagePlaceholder 
          type={placeholderType} 
          size={placeholderSize}
          showText={false}
        />
      </View>
    );
  }

  // Web-specific optimizations
  const webImageProps = Platform.OS === 'web' ? {
    loading: priority === 'high' ? 'eager' : 'lazy' as const,
    decoding: 'async' as const,
  } : {};

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...webImageProps}
      />
      {isLoading && showLoadingIndicator && (
        <ImageShimmer style={StyleSheet.absoluteFillObject} />
      )}
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#ECEFF1',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  shimmerContainer: {
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  shimmerGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 150,
    backgroundColor: '#F5F5F5',
    opacity: 0.5,
  },
});

export default OptimizedImage;
