/**
 * JSON-LD Structured Data Component
 * Provides structured data for search engines (Google Rich Results)
 */

import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://avida.com';
const SITE_NAME = 'Avida Marketplace';

interface OrganizationSchemaProps {
  name?: string;
  logo?: string;
  url?: string;
}

interface ProductSchemaProps {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
  sku?: string;
  brand?: string;
  seller?: {
    name: string;
    url?: string;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface LocalBusinessSchemaProps {
  name: string;
  description: string;
  address: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  telephone?: string;
  openingHours?: string[];
  priceRange?: string;
  image?: string;
  geo?: {
    latitude: number;
    longitude: number;
  };
}

// Organization Schema (for the site)
export const OrganizationSchema: React.FC<OrganizationSchemaProps> = ({
  name = SITE_NAME,
  logo = `${BASE_URL}/logo.png`,
  url = BASE_URL,
}) => {
  if (Platform.OS !== 'web') return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    sameAs: [
      // Add social media URLs when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English'],
    },
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
};

// Product Schema (for listings)
export const ProductSchema: React.FC<ProductSchemaProps> = ({
  name,
  description,
  image,
  price,
  currency = 'EUR',
  availability = 'InStock',
  condition = 'UsedCondition',
  sku,
  brand,
  seller,
  aggregateRating,
}) => {
  if (Platform.OS !== 'web') return null;

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    offers: {
      '@type': 'Offer',
      price: price.toString(),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      itemCondition: `https://schema.org/${condition}`,
    },
  };

  if (sku) schema.sku = sku;
  if (brand) schema.brand = { '@type': 'Brand', name: brand };
  if (seller) {
    schema.offers.seller = {
      '@type': 'Person',
      name: seller.name,
      ...(seller.url && { url: seller.url }),
    };
  }
  if (aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount,
    };
  }

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
};

// Breadcrumb Schema
export const BreadcrumbSchema: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  if (Platform.OS !== 'web') return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
};

// Local Business Schema (for seller profiles with business info)
export const LocalBusinessSchema: React.FC<LocalBusinessSchemaProps> = ({
  name,
  description,
  address,
  telephone,
  openingHours,
  priceRange,
  image,
  geo,
}) => {
  if (Platform.OS !== 'web') return null;

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    description,
    address: {
      '@type': 'PostalAddress',
      ...address,
    },
  };

  if (telephone) schema.telephone = telephone;
  if (openingHours) schema.openingHoursSpecification = openingHours;
  if (priceRange) schema.priceRange = priceRange;
  if (image) schema.image = image;
  if (geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
  }

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
};

// Item List Schema (for category/search results)
export const ItemListSchema: React.FC<{
  name: string;
  description: string;
  items: Array<{
    name: string;
    url: string;
    image?: string;
    price?: number;
    currency?: string;
  }>;
}> = ({ name, description, items }) => {
  if (Platform.OS !== 'web') return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 10).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: item.name,
        url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
        ...(item.image && { image: item.image }),
        ...(item.price && {
          offers: {
            '@type': 'Offer',
            price: item.price.toString(),
            priceCurrency: item.currency || 'EUR',
          },
        }),
      },
    })),
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
};

// Website Search Schema (enables site search in Google)
export const WebsiteSearchSchema: React.FC = () => {
  if (Platform.OS !== 'web') return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </Head>
  );
};

export default {
  OrganizationSchema,
  ProductSchema,
  BreadcrumbSchema,
  LocalBusinessSchema,
  ItemListSchema,
  WebsiteSearchSchema,
};
