import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform, Dimensions } from 'react-native';

// Constants matching ListingCard
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 8;
const NUM_COLUMNS = 2;
export const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
export const CARD_IMAGE_HEIGHT = 160;
export const BORDER_RADIUS = 12;

export interface SkeletonCardProps {
  compact?: boolean;
}

export const SkeletonCard = memo<SkeletonCardProps>(({ compact = false }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // For web, use CSS animation
  if (Platform.OS === 'web') {
    return (
      <View style={styles.card} data-testid="skeleton-card">
        <View 
          style={[styles.image, compact && styles.imageCompact]}
          // @ts-ignore - web specific
          dataSet={{ shimmer: true }}
        />
        <View style={styles.content}>
          <View 
            style={styles.location}
            // @ts-ignore - web specific
            dataSet={{ shimmer: true }}
          />
          <View 
            style={styles.title}
            // @ts-ignore - web specific
            dataSet={{ shimmer: true }}
          />
          <View 
            style={styles.price}
            // @ts-ignore - web specific
            dataSet={{ shimmer: true }}
          />
        </View>
        <style>
          {`
            [data-shimmer="true"] {
              animation: shimmer 1.5s ease-in-out infinite;
            }
            @keyframes shimmer {
              0%, 100% { opacity: 0.3; background-color: #E0E0E0; }
              50% { opacity: 0.6; background-color: #F0F0F0; }
            }
          `}
        </style>
      </View>
    );
  }

  return (
    <View style={styles.card} data-testid="skeleton-card">
      <Animated.View style={[styles.image, compact && styles.imageCompact, { opacity }]} />
      <View style={styles.content}>
        <Animated.View style={[styles.location, { opacity }]} />
        <Animated.View style={[styles.title, { opacity }]} />
        <Animated.View style={[styles.price, { opacity }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { 
    width: '100%', 
    backgroundColor: '#fff', 
    borderRadius: BORDER_RADIUS, 
    overflow: 'hidden' 
  },
  image: { 
    width: '100%', 
    height: CARD_IMAGE_HEIGHT, 
    backgroundColor: '#E8E8E8' 
  },
  imageCompact: {
    height: 140,
  },
  content: { 
    padding: 12 
  },
  location: { 
    width: '50%', 
    height: 10, 
    backgroundColor: '#E8E8E8', 
    borderRadius: 4, 
    marginBottom: 8 
  },
  title: { 
    width: '80%', 
    height: 14, 
    backgroundColor: '#E8E8E8', 
    borderRadius: 4, 
    marginBottom: 8 
  },
  price: { 
    width: '40%', 
    height: 16, 
    backgroundColor: '#E8E8E8', 
    borderRadius: 4 
  },
});

export default SkeletonCard;
