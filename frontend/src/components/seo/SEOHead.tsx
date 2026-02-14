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

export const CategorySEO: React.FC<{ categoryName: string; categorySlug: string; listingCount?: number }> = ({
  categoryName,
  categorySlug,
  listingCount,
}) => (
  <SEOHead
    title={`${categoryName} for Sale`}
    description={`Browse ${listingCount ? `${listingCount}+ ` : ''}${categoryName.toLowerCase()} listings on Avida. Find great deals on ${categoryName.toLowerCase()} near you.`}
    url={`/category/${categorySlug}`}
    keywords={[categoryName.toLowerCase(), 'buy', 'sell', 'local', categorySlug]}
    type="website"
  />
);

export const ListingSEO: React.FC<{
  title: string;
  description: string;
  price: number;
  currency?: string;
  image?: string;
  listingId: string;
  category?: string;
  location?: string;
}> = ({ title, description, price, currency = 'EUR', image, listingId, category, location }) => {
  const keywords = [title.toLowerCase()];
  if (category) keywords.push(category.toLowerCase());
  if (location) keywords.push(location.toLowerCase());
  
  return (
    <SEOHead
      title={title}
      description={`${description.slice(0, 100)}${location ? ` - Located in ${location}` : ''}`}
      url={`/listing/${listingId}`}
      image={image}
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
