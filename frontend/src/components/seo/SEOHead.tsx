/**
 * SEOHead Component
 * Provides SEO meta tags for web platform using expo-router/head
 */

import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';

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
  if (Platform.OS !== 'web') {
    return null;
  }

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const fullUrl = url ? (url.startsWith('http') ? url : `${BASE_URL}${url}`) : BASE_URL;
  const ogImage = image || DEFAULT_IMAGE;
  const truncatedDescription = description.length > 160 ? description.slice(0, 157) + '...' : description;

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={truncatedDescription} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type === 'product' ? 'product' : type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={truncatedDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={truncatedDescription} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Product-specific meta (for listings) */}
      {type === 'product' && price && (
        <>
          <meta property="product:price:amount" content={price.toString()} />
          <meta property="product:price:currency" content={currency} />
          <meta property="product:availability" content={availability === 'in_stock' ? 'instock' : 'oos'} />
        </>
      )}
      
      {/* Profile-specific meta */}
      {type === 'profile' && profileName && (
        <>
          <meta property="profile:username" content={profileName} />
        </>
      )}
      
      {/* Article-specific meta */}
      {type === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {author && <meta property="article:author" content={author} />}
        </>
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
    </Head>
  );
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
