import React, { useState, useCallback, memo } from 'react';
import { 
  Image, 
  View, 
  StyleSheet, 
  ImageStyle,
  ViewStyle,
  Platform,
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
 * OptimizedImage Component - ZERO LOADER VERSION
 * 
 * CACHE-FIRST ARCHITECTURE:
 * - Shows placeholder immediately (no shimmer/skeleton)
 * - Image loads in background and fades in
 * - Graceful fallback to placeholder on error
 * - No loading spinners or skeleton animations
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  uri,
  style,
  containerStyle,
  placeholderType = 'listing',
  placeholderSize = 'medium',
  resizeMode = 'cover',
  priority = 'normal',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoadEnd = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
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
      {/* Show placeholder until image loads */}
      {!isLoaded && (
        <View style={StyleSheet.absoluteFillObject}>
          <ImagePlaceholder 
            type={placeholderType} 
            size={placeholderSize}
            showText={false}
          />
        </View>
      )}
      <Image
        source={{ uri }}
        style={[styles.image, !isLoaded && styles.hiddenImage]}
        resizeMode={resizeMode}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...webImageProps}
      />
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hiddenImage: {
    opacity: 0,
  },
});

export default OptimizedImage;
