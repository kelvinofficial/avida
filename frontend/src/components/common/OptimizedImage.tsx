import React, { useState, useCallback, memo } from 'react';
import { 
  Image, 
  View, 
  StyleSheet, 
  ActivityIndicator,
  ImageStyle,
  ViewStyle,
  Platform
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
 * OptimizedImage Component
 * 
 * Features:
 * - Lazy loading with loading states
 * - Graceful fallback to placeholder on error
 * - Progressive loading indicator
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
    <View style={[styles.container, containerStyle]}>
      <Image
        source={{ uri }}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...webImageProps}
      />
      {isLoading && showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2E7D32" />
        </View>
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(236, 239, 241, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OptimizedImage;
