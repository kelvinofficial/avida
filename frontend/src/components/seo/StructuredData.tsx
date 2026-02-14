/**
 * JSON-LD Structured Data Component
 * Provides structured data for search engines (Google Rich Results)
 * Uses direct DOM manipulation for expo-router compatibility
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://avida.com';
const SITE_NAME = 'Avida Marketplace';

// Helper to add/update JSON-LD script
const setJsonLd = (id: string, data: object) => {
  if (typeof document === 'undefined') return;
  
  let script = document.querySelector(`script#${id}`) as HTMLScriptElement;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
};

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
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      url,
      logo,
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['English'],
      },
    };

    setJsonLd('ld-organization', schema);
  }, [name, logo, url]);

  return null;
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
  useEffect(() => {
    if (Platform.OS !== 'web') return;

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

    setJsonLd('ld-product', schema);
  }, [name, description, image, price, currency, availability, condition, sku, brand, seller, aggregateRating]);

  return null;
};

// Breadcrumb Schema
export const BreadcrumbSchema: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

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

    setJsonLd('ld-breadcrumb', schema);
  }, [items]);

  return null;
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
  useEffect(() => {
    if (Platform.OS !== 'web') return;

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

    setJsonLd('ld-localbusiness', schema);
  }, [name, description, address, telephone, openingHours, priceRange, image, geo]);

  return null;
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
  useEffect(() => {
    if (Platform.OS !== 'web') return;

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

    setJsonLd('ld-itemlist', schema);
  }, [name, description, items]);

  return null;
};

// Website Search Schema (enables site search in Google)
export const WebsiteSearchSchema: React.FC = () => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

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

    setJsonLd('ld-website-search', schema);
  }, []);

  return null;
};

export default {
  OrganizationSchema,
  ProductSchema,
  BreadcrumbSchema,
  LocalBusinessSchema,
  ItemListSchema,
  WebsiteSearchSchema,
};
