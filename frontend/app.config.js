/**
 * app.config.js - Dynamic Expo configuration
 * 
 * This file ensures the API URL is properly embedded in all builds:
 * - Development builds
 * - Preview APK builds  
 * - Production builds
 */

// Hardcoded production API URL - this MUST be set for APK builds
const PRODUCTION_API_URL = 'https://homepage-fix-8.preview.emergentagent.com';

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // Ensure apiUrl is always set - use env var if available, otherwise hardcode
      apiUrl: process.env.EXPO_PUBLIC_BACKEND_URL || PRODUCTION_API_URL,
      // Also provide as a backup key
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || PRODUCTION_API_URL,
    },
  };
};
