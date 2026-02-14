/**
 * Deep Linking Service for Mobile App
 * Provides utilities for handling and generating deep links
 */
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://localhost:8001';

// App URL scheme
export const APP_SCHEME = 'localmarket';

// Deep link configuration
export const DEEP_LINK_CONFIG = {
  scheme: APP_SCHEME,
  prefixes: [
    `${APP_SCHEME}://`,
    'https://localmarket.app',
    `${API_BASE_URL}/api/l/`,
  ],
  paths: {
    listing: 'listing/:id',
    profile: 'profile/public/:id',
    category: 'category/:id',
    search: 'search',
    chat: 'chat/:id',
    business: 'business/:slug',
    home: '',
    offers: 'offers',
    saved: 'profile/saved',
    messages: 'messages',
    post: 'post',
  }
};

/**
 * Build a deep link URL for a given route
 */
export const buildDeepLink = (
  targetType: string,
  targetId?: string,
  params?: Record<string, any>
): string => {
  const routes: Record<string, string> = {
    listing: `listing/${targetId}`,
    profile: `profile/public/${targetId}`,
    category: `category/${targetId}`,
    search: 'search',
    chat: `chat/${targetId}`,
    business: `business/${targetId}`,
    home: '',
    offers: 'offers',
    saved: 'profile/saved',
    messages: 'messages',
    post: 'post',
  };

  const route = routes[targetType] || '';
  let deepLink = `${APP_SCHEME}://${route}`;

  // Add query params
  if (params && Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    if (queryString) {
      deepLink += `?${queryString}`;
    }
  }

  return deepLink;
};

/**
 * Build a web fallback URL
 */
export const buildWebUrl = (
  targetType: string,
  targetId?: string,
  params?: Record<string, any>
): string => {
  const routes: Record<string, string> = {
    listing: `/listing/${targetId}`,
    profile: `/profile/public/${targetId}`,
    category: `/category/${targetId}`,
    search: '/search',
    chat: `/chat/${targetId}`,
    business: `/business/${targetId}`,
    home: '/',
    offers: '/offers',
    saved: '/profile/saved',
    messages: '/messages',
    post: '/post',
  };

  const route = routes[targetType] || '/';
  let webUrl = `${API_BASE_URL}${route}`;

  // Add query params
  if (params && Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    if (queryString) {
      webUrl += `?${queryString}`;
    }
  }

  return webUrl;
};

/**
 * Create a shareable link for a listing
 */
export const createListingShareLink = async (
  listingId: string,
  campaign?: string
): Promise<{
  shortUrl: string;
  deepLink: string;
  webUrl: string;
} | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/deep-links/listing/${listingId}${campaign ? `?campaign=${campaign}` : ''}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to create share link');
    }
    
    const data = await response.json();
    
    return {
      shortUrl: data.short_url,
      deepLink: data.deep_link,
      webUrl: data.web_url,
    };
  } catch (error) {
    console.error('Error creating share link:', error);
    return null;
  }
};

/**
 * Create a generic deep link via API
 */
export const createDeepLink = async (
  targetType: string,
  targetId?: string,
  params?: Record<string, any>,
  tracking?: { campaign?: string; source?: string; medium?: string }
): Promise<{
  shortCode: string;
  shortUrl: string;
  deepLink: string;
  webUrl: string;
} | null> => {
  try {
    const token = await AsyncStorage.getItem('session_token');
    
    const response = await fetch(`${API_BASE_URL}/api/deep-links/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        target_type: targetType,
        target_id: targetId,
        params,
        ...tracking
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create deep link');
    }
    
    const data = await response.json();
    
    return {
      shortCode: data.short_code,
      shortUrl: data.short_url,
      deepLink: data.deep_link,
      webUrl: data.web_url,
    };
  } catch (error) {
    console.error('Error creating deep link:', error);
    return null;
  }
};

/**
 * Parse a deep link URL to extract target info
 */
export const parseDeepLink = (url: string): {
  targetType: string;
  targetId?: string;
  params: Record<string, string>;
} | null => {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path || '';
    const queryParams = parsed.queryParams || {};

    // Extract target type and ID from path
    const pathParts = path.split('/').filter(Boolean);
    
    let targetType = 'home';
    let targetId: string | undefined;

    if (pathParts.length === 0) {
      targetType = 'home';
    } else if (pathParts[0] === 'listing' && pathParts[1]) {
      targetType = 'listing';
      targetId = pathParts[1];
    } else if (pathParts[0] === 'profile' && pathParts[1] === 'public' && pathParts[2]) {
      targetType = 'profile';
      targetId = pathParts[2];
    } else if (pathParts[0] === 'category' && pathParts[1]) {
      targetType = 'category';
      targetId = pathParts[1];
    } else if (pathParts[0] === 'chat' && pathParts[1]) {
      targetType = 'chat';
      targetId = pathParts[1];
    } else if (pathParts[0] === 'business' && pathParts[1]) {
      targetType = 'business';
      targetId = pathParts[1];
    } else if (pathParts[0] === 'search') {
      targetType = 'search';
    } else if (pathParts[0] === 'offers') {
      targetType = 'offers';
    } else if (pathParts[0] === 'messages') {
      targetType = 'messages';
    } else if (pathParts[0] === 'post') {
      targetType = 'post';
    }

    return {
      targetType,
      targetId,
      params: queryParams as Record<string, string>
    };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
};

/**
 * Open URL with appropriate handler (app or browser)
 */
export const openUrl = async (url: string): Promise<boolean> => {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error opening URL:', error);
    return false;
  }
};

/**
 * Share content using native share sheet
 */
export const shareContent = async (options: {
  title: string;
  message?: string;
  url?: string;
}): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({
          title: options.title,
          text: options.message,
          url: options.url
        });
        return true;
      } else if (navigator.clipboard && options.url) {
        await navigator.clipboard.writeText(options.url);
        return true;
      }
      return false;
    }

    // Native share
    const { Share } = require('react-native');
    const result = await Share.share({
      title: options.title,
      message: options.message ? `${options.message}\n${options.url}` : options.url,
      url: options.url
    });

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Error sharing:', error);
    return false;
  }
};

/**
 * Share a listing
 */
export const shareListing = async (listing: {
  id: string;
  title: string;
  price?: number;
  currency?: string;
}): Promise<boolean> => {
  try {
    // Create a trackable share link
    const linkData = await createListingShareLink(listing.id, 'share');
    
    if (!linkData) {
      // Fallback to basic web URL
      const webUrl = buildWebUrl('listing', listing.id);
      return await shareContent({
        title: listing.title,
        message: listing.price 
          ? `Check out ${listing.title} for ${listing.currency || '$'}${listing.price}`
          : `Check out ${listing.title}`,
        url: webUrl
      });
    }

    return await shareContent({
      title: listing.title,
      message: listing.price 
        ? `Check out ${listing.title} for ${listing.currency || '$'}${listing.price}`
        : `Check out ${listing.title}`,
      url: linkData.shortUrl
    });
  } catch (error) {
    console.error('Error sharing listing:', error);
    return false;
  }
};

/**
 * Get the initial deep link when app was opened from a link
 */
export const getInitialDeepLink = async (): Promise<string | null> => {
  try {
    const url = await Linking.getInitialURL();
    return url;
  } catch (error) {
    console.error('Error getting initial URL:', error);
    return null;
  }
};

export default {
  buildDeepLink,
  buildWebUrl,
  createListingShareLink,
  createDeepLink,
  parseDeepLink,
  openUrl,
  shareContent,
  shareListing,
  getInitialDeepLink,
  DEEP_LINK_CONFIG,
  APP_SCHEME
};
