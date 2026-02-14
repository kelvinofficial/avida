import React, { useState, memo } from 'react';
import { View, Image, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageWithSkeletonProps {
  source: { uri: string } | null;
  style?: any;
  containerStyle?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  placeholderIcon?: string;
  placeholderIconSize?: number;
  placeholderIconColor?: string;
  testID?: string;
}

/**
 * ImageWithSkeleton - Shows a shimmer skeleton while image is loading
 * Falls back to placeholder icon if image fails to load or is null
 */
export const ImageWithSkeleton = memo<ImageWithSkeletonProps>(({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
  placeholderIcon = 'image-outline',
  placeholderIconSize = 32,
  placeholderIconColor = '#CCC',
  testID,
}) => {
  const [isLoading, setIsLoading] = useState(!!source);
  const [hasError, setHasError] = useState(false);

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Show placeholder if no source or error
  if (!source || hasError) {
    return (
      <View style={[styles.container, containerStyle]} testID={testID}>
        <View style={[styles.placeholder, style]}>
          <Ionicons name={placeholderIcon as any} size={placeholderIconSize} color={placeholderIconColor} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {/* Shimmer skeleton - shown while loading */}
      {isLoading && (
        <View 
          style={[styles.skeleton, style]}
          // @ts-ignore - data attribute for CSS styling on web
          dataSet={Platform.OS === 'web' ? { shimmer: true } : undefined}
        >
          {/* Native shimmer effect */}
          {Platform.OS !== 'web' && <ShimmerOverlay />}
        </View>
      )}
      
      {/* Actual image */}
      <Image
        source={source}
        style={[
          styles.image,
          style,
          isLoading && styles.hiddenImage,
        ]}
        resizeMode={resizeMode}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
    </View>
  );
});

/**
 * Native shimmer overlay with animated gradient effect
 */
const ShimmerOverlay = memo(() => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <Animated.View
      style={[
        styles.shimmerOverlay,
        { transform: [{ translateX }, { skewX: '-20deg' }] },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E8E8E8',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hiddenImage: {
    opacity: 0,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});

export default ImageWithSkeleton;
