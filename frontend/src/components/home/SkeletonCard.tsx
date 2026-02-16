import React, { memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

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

/**
 * SkeletonCard - ZERO LOADER VERSION
 * 
 * Static placeholder card without shimmer animation.
 * Used as a fallback when no data is available yet.
 * CACHE-FIRST architecture means this is rarely shown.
 */
export const SkeletonCard = memo<SkeletonCardProps>(({ compact = false }) => {
  return (
    <View style={styles.card} data-testid="skeleton-card">
      <View style={[styles.image, compact && styles.imageCompact]} />
      <View style={styles.content}>
        <View style={styles.location} />
        <View style={styles.title} />
        <View style={styles.price} />
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
