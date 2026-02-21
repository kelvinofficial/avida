import { useState, useEffect, useLayoutEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  screenSize: ScreenSize;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  columns: number;
  isReady: boolean;
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
};

// Get initial dimensions properly for web
const getInitialDimensions = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

export const getScreenSize = (width: number): ScreenSize => {
  if (width <= BREAKPOINTS.mobile) return 'mobile';
  if (width <= BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
};

export const getColumns = (screenSize: ScreenSize): number => {
  switch (screenSize) {
    case 'mobile': return 2;
    case 'tablet': return 3;
    case 'desktop': return 4;
  }
};

export const useResponsive = (): ResponsiveInfo => {
  // Initialize with actual window dimensions on web (works during hydration)
  const [dimensions, setDimensions] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });
  
  // CRITICAL: Always start as false to prevent layout flash during hydration
  // This ensures we don't render conditional layouts until dimensions are confirmed
  const [isReady, setIsReady] = useState(false);

  // Use useLayoutEffect on web to prevent flash (runs synchronously before paint)
  const useIsomorphicLayoutEffect = Platform.OS === 'web' ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    // Set dimensions and mark ready synchronously before first paint
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const actualDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setDimensions(actualDimensions);
    }
    // Mark as ready - this runs synchronously before browser paints
    setIsReady(true);
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    // Also listen to window resize on web for more responsive updates
    const handleResize = () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      subscription?.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const screenSize = getScreenSize(dimensions.width);
  const isWeb = Platform.OS === 'web';

  return {
    screenSize,
    width: dimensions.width,
    height: dimensions.height,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
    isWeb,
    columns: getColumns(screenSize),
    isReady,
  };
};

export default useResponsive;
