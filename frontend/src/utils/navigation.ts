import { Router } from 'expo-router';

/**
 * Safe navigation helper that handles back button gracefully
 * Uses canGoBack() to check if there's navigation history
 * Falls back to home screen if there's no history
 */
export const safeGoBack = (router: Router, fallbackRoute: string = '/') => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackRoute as any);
  }
};

/**
 * Create a bound safeGoBack function for a specific router
 */
export const createSafeGoBack = (router: Router, fallbackRoute: string = '/') => {
  return () => safeGoBack(router, fallbackRoute);
};
