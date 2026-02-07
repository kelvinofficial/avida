import { useState, useEffect } from 'react';
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
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Mark as ready after first render to prevent layout flash
    setIsReady(true);
    
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
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
