import React, { useState, memo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
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
  showPlaceholder?: boolean;
}

/**
 * ImageWithSkeleton - INSTANT LOAD VERSION
 * 
 * OPTIMIZED FOR PERFORMANCE:
 * - NO placeholder/skeleton by default - image appears when ready
 * - Set showPlaceholder=true only where explicitly needed
 * - Falls back to placeholder icon if image fails to load
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
  showPlaceholder = false, // Default: NO placeholder
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoadEnd = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  // Show placeholder ONLY on error, not during loading
  if (hasError) {
    return (
      <View style={[styles.container, containerStyle]} testID={testID}>
        <View style={[styles.placeholder, style]}>
          <Ionicons name={placeholderIcon as any} size={placeholderIconSize} color={placeholderIconColor} />
        </View>
      </View>
    );
  }

  // If no source, show nothing (not a placeholder)
  if (!source) {
    return <View style={[styles.container, containerStyle]} testID={testID} />;
  }

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {/* Show placeholder while loading ONLY if explicitly requested */}
      {showPlaceholder && !isLoaded && (
        <View style={[styles.placeholder, style]}>
          <Ionicons name={placeholderIcon as any} size={placeholderIconSize} color={placeholderIconColor} />
        </View>
      )}
      
      {/* Actual image - loads in background */}
      <Image
        source={source}
        style={[
          styles.image,
          style,
          // Only hide if showing placeholder AND not loaded
          (showPlaceholder && !isLoaded) && styles.hiddenImage,
        ]}
        resizeMode={resizeMode}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hiddenImage: {
    opacity: 0,
    position: 'absolute',
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
