/**
 * Global Layout Constants for Avida Mobile App
 * Standardized spacing, colors, and layout values for production-level consistency
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// SPACING SCALE (Standard 8-point grid)
// =============================================================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// =============================================================================
// COLORS (Avida Brand)
// =============================================================================
export const COLORS = {
  // Primary brand colors
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  
  // Background colors
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceSecondary: '#FAFAFA',
  
  // Text colors
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  textLight: '#CCCCCC',
  
  // Border colors
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  divider: '#EBEBEB',
  
  // Semantic colors
  error: '#D32F2F',
  errorLight: '#FFEBEE',
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#F57C00',
  warningLight: '#FFF3E0',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
} as const;

// =============================================================================
// LAYOUT DIMENSIONS
// =============================================================================
export const LAYOUT = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  
  // Horizontal padding for all screens
  horizontalPadding: SPACING.base,
  
  // Bottom sheet configurations
  bottomSheet: {
    maxHeight: SCREEN_HEIGHT * 0.95,
    minHeight: SCREEN_HEIGHT * 0.4,
    borderRadius: 24,
    headerHeight: 64,
  },
  
  // Safe area minimum values
  safeArea: {
    minBottomPadding: 16,
    minTopPadding: 8,
  },
  
  // Sticky CTA button
  stickyCTA: {
    height: 56,
    bottomPadding: 16,
  },
  
  // Grid configurations
  grid: {
    columns: SCREEN_WIDTH < 380 ? 2 : 2,
    gap: SPACING.base,
    cardMinWidth: 160,
  },
  
  // Content scroll padding (to avoid CTA overlap)
  scrollContentPadding: 120,
  
  // Small device breakpoint
  smallDeviceWidth: 360,
  mediumDeviceWidth: 390,
  largeDeviceWidth: 428,
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================
export const TYPOGRAPHY = {
  // Font sizes
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 28,
  },
  
  // Font weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================
export const RADIUS = {
  sm: 6,
  md: 8,
  base: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
  sheet: 24,
} as const;

// =============================================================================
// SHADOWS
// =============================================================================
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// =============================================================================
// ANIMATION DURATIONS
// =============================================================================
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

// =============================================================================
// Z-INDEX LAYERS
// =============================================================================
export const Z_INDEX = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  overlay: 400,
  toast: 500,
} as const;

// =============================================================================
// DEVICE HELPERS
// =============================================================================
export const isSmallDevice = SCREEN_WIDTH <= LAYOUT.smallDeviceWidth;
export const isMediumDevice = SCREEN_WIDTH > LAYOUT.smallDeviceWidth && SCREEN_WIDTH <= LAYOUT.mediumDeviceWidth;
export const isLargeDevice = SCREEN_WIDTH > LAYOUT.mediumDeviceWidth;
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';
export const isWeb = Platform.OS === 'web';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate bottom padding including safe area
 */
export const getBottomPadding = (insetBottom: number, additionalPadding: number = SPACING.base): number => {
  return Math.max(insetBottom, LAYOUT.safeArea.minBottomPadding) + additionalPadding;
};

/**
 * Calculate scroll content padding to avoid sticky CTA overlap
 */
export const getScrollContentPadding = (insetBottom: number): number => {
  return getBottomPadding(insetBottom, LAYOUT.stickyCTA.height + SPACING.xl);
};

/**
 * Get responsive grid columns based on screen width
 */
export const getGridColumns = (width: number = SCREEN_WIDTH): number => {
  if (width < 360) return 2;
  if (width < 600) return 2;
  if (width < 900) return 3;
  return 4;
};

/**
 * Get card width for grid layouts
 */
export const getCardWidth = (columns: number, gap: number = SPACING.base): number => {
  const totalGap = gap * (columns - 1);
  const availableWidth = SCREEN_WIDTH - (LAYOUT.horizontalPadding * 2) - totalGap;
  return Math.floor(availableWidth / columns);
};

export default {
  SPACING,
  COLORS,
  LAYOUT,
  TYPOGRAPHY,
  RADIUS,
  SHADOWS,
  ANIMATION,
  Z_INDEX,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isAndroid,
  isIOS,
  isWeb,
  getBottomPadding,
  getScrollContentPadding,
  getGridColumns,
  getCardWidth,
};
