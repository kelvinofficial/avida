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
  const [dimensions, setDimensions] = useState(getInitialDimensions);
  const [isReady, setIsReady] = useState(Platform.OS !== 'web');

  // Use useLayoutEffect on web to prevent flash
  const useIsomorphicLayoutEffect = Platform.OS === 'web' ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    // On web, get the actual window dimensions immediately
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const actualDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setDimensions(actualDimensions);
    }
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
