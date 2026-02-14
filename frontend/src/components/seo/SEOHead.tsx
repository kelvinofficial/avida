/**
 * SEOHead Component
 * Provides SEO meta tags for web platform
 * Uses direct DOM manipulation as fallback for expo-router/head issues
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  // Product-specific (for listings)
  price?: number;
  currency?: string;
  availability?: 'in_stock' | 'out_of_stock';
  // Profile-specific
  profileName?: string;
  // Article-specific
  publishedTime?: string;
  author?: string;
  // Additional
  keywords?: string[];
  noIndex?: boolean;
}

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://avida.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'Avida Marketplace';

// Helper to set/update meta tags directly in DOM
const setMetaTag = (name: string, content: string, isProperty = false) => {
  if (typeof document === 'undefined') return;
  
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let element = document.querySelector(selector) as HTMLMetaElement;
  
  if (!element) {
    element = document.createElement('meta');
    if (isProperty) {
      element.setAttribute('property', name);
    } else {
      element.setAttribute('name', name);
    }
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

// Helper to set canonical link
const setCanonicalLink = (url: string) => {
  if (typeof document === 'undefined') return;
  
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
};

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
  price,
  currency = 'EUR',
  availability = 'in_stock',
  profileName,
  publishedTime,
  author,
  keywords = [],
  noIndex = false,
}) => {
  // Only render on web platform
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const fullUrl = url ? (url.startsWith('http') ? url : `${BASE_URL}${url}`) : BASE_URL;
    const ogImage = image || DEFAULT_IMAGE;
    const truncatedDescription = description.length > 160 ? description.slice(0, 157) + '...' : description;

    // Set document title
    document.title = fullTitle;

    // Primary Meta Tags
    setMetaTag('title', fullTitle);
    setMetaTag('description', truncatedDescription);
    if (keywords.length > 0) {
      setMetaTag('keywords', keywords.join(', '));
    }
    if (noIndex) {
      setMetaTag('robots', 'noindex, nofollow');
    }

    // Open Graph / Facebook
    setMetaTag('og:type', type === 'product' ? 'product' : type, true);
    setMetaTag('og:url', fullUrl, true);
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', truncatedDescription, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:site_name', SITE_NAME, true);
    setMetaTag('og:locale', 'en_US', true);

    // Twitter
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:url', fullUrl);
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', truncatedDescription);
    setMetaTag('twitter:image', ogImage);

    // Product-specific meta (for listings)
    if (type === 'product' && price) {
      setMetaTag('product:price:amount', price.toString(), true);
      setMetaTag('product:price:currency', currency, true);
      setMetaTag('product:availability', availability === 'in_stock' ? 'instock' : 'oos', true);
    }

    // Profile-specific meta
    if (type === 'profile' && profileName) {
      setMetaTag('profile:username', profileName, true);
    }

    // Article-specific meta
    if (type === 'article') {
      if (publishedTime) setMetaTag('article:published_time', publishedTime, true);
      if (author) setMetaTag('article:author', author, true);
    }

    // Canonical URL
    setCanonicalLink(fullUrl);

  }, [title, description, image, url, type, price, currency, availability, profileName, publishedTime, author, keywords, noIndex]);

  return null; // Direct DOM manipulation, no JSX needed
};

// Pre-configured SEO components for common pages
export const HomeSEO: React.FC = () => (
  <SEOHead
    title="Buy & Sell Locally"
    description="Avida is your local marketplace to buy and sell vehicles, properties, electronics, fashion, and more. Find great deals near you!"
    keywords={['marketplace', 'buy', 'sell', 'local', 'classifieds', 'vehicles', 'properties', 'electronics']}
    type="website"
  />
);

export const CategorySEO: React.FC<{ 
  categoryName: string; 
  categorySlug: string; 
  listingCount?: number;
  subcategory?: string;
  subcategoryName?: string;
  locationData?: {
    city_name?: string;
    region_name?: string;
    country_name?: string;
  };
}> = ({
  categoryName,
  categorySlug,
  listingCount,
  subcategory,
  subcategoryName,
  locationData,
}) => {
  // Build enhanced title with subcategory
  const displayName = subcategoryName 
    ? `${subcategoryName} (${categoryName})` 
    : categoryName;
  
  // Build keywords
  const keywords = [categoryName.toLowerCase(), 'buy', 'sell', 'local', categorySlug];
  if (subcategory) keywords.push(subcategory.toLowerCase());
  if (subcategoryName) keywords.push(subcategoryName.toLowerCase());
  if (locationData?.country_name) keywords.push(locationData.country_name.toLowerCase());
  if (locationData?.region_name) keywords.push(locationData.region_name.toLowerCase());
  
  // Build location suffix for description
  let locationSuffix = '';
  if (locationData) {
    const parts = [];
    if (locationData.city_name) parts.push(locationData.city_name);
    if (locationData.region_name) parts.push(locationData.region_name);
    if (locationData.country_name) parts.push(locationData.country_name);
    if (parts.length > 0) locationSuffix = ` in ${parts.slice(0, 2).join(', ')}`;
  }
  
  // Build URL
  const url = subcategory 
    ? `/category/${categorySlug}/${subcategory}`
    : `/category/${categorySlug}`;
  
  return (
    <SEOHead
      title={`${displayName} for Sale`}
      description={`Browse ${listingCount ? `${listingCount}+ ` : ''}${displayName.toLowerCase()} listings on Avida${locationSuffix}. Find great deals on ${categoryName.toLowerCase()} near you.`}
      url={url}
      keywords={keywords}
      type="website"
    />
  );
};

export const ListingSEO: React.FC<{
  title: string;
  description: string;
  price: number;
  currency?: string;
  image?: string;
  listingId: string;
  category?: string;
  location?: string;
  locationData?: {
    city_name?: string;
    district_name?: string;
    region_name?: string;
    country_name?: string;
  };
}> = ({ title, description, price, currency = 'EUR', image, listingId, category, location, locationData }) => {
  const keywords = [title.toLowerCase()];
  if (category) keywords.push(category.toLowerCase());
  if (location) keywords.push(location.toLowerCase());
  
  // Build enhanced location string with full hierarchy
  let locationStr = location || '';
  if (locationData) {
    const parts = [];
    if (locationData.city_name) parts.push(locationData.city_name);
    if (locationData.district_name) parts.push(locationData.district_name);
    if (locationData.region_name) parts.push(locationData.region_name);
    if (locationData.country_name) {
      parts.push(locationData.country_name);
      keywords.push(locationData.country_name.toLowerCase());
    }
    if (parts.length > 0) locationStr = parts.join(', ');
  }
  
  // Format description with location
  const enhancedDescription = locationStr 
    ? `${description.slice(0, 100)}${locationStr ? ` - Located in ${locationStr}` : ''}`
    : description.slice(0, 160);
  
  // Process image URL - ensure it's a full URL for social sharing
  let ogImage = image;
  if (image) {
    if (image.startsWith('data:')) {
      // Base64 images work for og:image in modern browsers
      ogImage = image;
    } else if (!image.startsWith('http')) {
      // Convert relative URLs to absolute
      ogImage = `${BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
    }
  }
  
  return (
    <SEOHead
      title={title}
      description={enhancedDescription}
      url={`/listing/${listingId}`}
      image={ogImage}
      type="product"
      price={price}
      currency={currency}
      keywords={keywords}
    />
  );
};

export const ProfileSEO: React.FC<{
  name: string;
  bio?: string;
  profileId: string;
  avatar?: string;
  listingCount?: number;
}> = ({ name, bio, profileId, avatar, listingCount }) => (
  <SEOHead
    title={`${name}'s Profile`}
    description={bio || `Check out ${name}'s listings on Avida. ${listingCount ? `${listingCount} items for sale.` : ''}`}
    url={`/profile/${profileId}`}
    image={avatar}
    type="profile"
    profileName={name}
    keywords={[name.toLowerCase(), 'seller', 'profile']}
  />
);

export const SearchResultsSEO: React.FC<{ query: string; resultCount?: number }> = ({
  query,
  resultCount,
}) => (
  <SEOHead
    title={`Search: ${query}`}
    description={`${resultCount ? `${resultCount} results for ` : 'Search results for '}"${query}" on Avida marketplace.`}
    url={`/search?q=${encodeURIComponent(query)}`}
    keywords={[query.toLowerCase(), 'search', 'buy', 'sell']}
    type="website"
  />
);

export default SEOHead;
