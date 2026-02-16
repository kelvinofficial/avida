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
}

/**
 * ImageWithSkeleton - ZERO LOADER VERSION
 * 
 * CACHE-FIRST ARCHITECTURE:
 * - Shows placeholder icon immediately (no shimmer/skeleton animation)
 * - Image loads in background and appears when ready
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
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoadEnd = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
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
      {/* Static placeholder - shown until image loads (no animation) */}
      {!isLoaded && (
        <View style={[styles.placeholder, style]}>
          <Ionicons name={placeholderIcon as any} size={placeholderIconSize} color={placeholderIconColor} />
        </View>
      )}
      
      {/* Actual image */}
      <Image
        source={source}
        style={[
          styles.image,
          style,
          !isLoaded && styles.hiddenImage,
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
