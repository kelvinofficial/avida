/**
 * ListingsGrid Component
 * Responsive grid layout for displaying listings with banner injection
 */

import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Listing } from '../../types';
import { EmptyState } from '../EmptyState';
import { FeedBanner } from '../BannerSlot';
import { ListingCard } from './ListingCard';
import { styles } from './homeStyles';

// Layout constants
const MAX_WIDTH = 1280;
const BANNER_INTERVAL = 5; // Show banner after every 5 rows

interface ListingsGridProps {
  listings: Listing[];
  initialLoadDone: boolean;
  expandedSearch: boolean;
  selectedCategory: string | null;
  favorites: Set<string>;
  toggleFavorite: (listingId: string) => void;
  selectedCity: { lat: number; lng: number } | null;
  // Responsive props
  isDesktop: boolean;
  isTablet: boolean;
  columns: number;
  gridPadding: number;
  gridGap: number;
  cardWidth: number;
}

export const ListingsGrid: React.FC<ListingsGridProps> = ({
  listings,
  initialLoadDone,
  expandedSearch,
  selectedCategory,
  favorites,
  toggleFavorite,
  selectedCity,
  isDesktop,
  isTablet,
  columns,
  gridPadding,
  gridGap,
  cardWidth,
}) => {
  const router = useRouter();

  // Don't show empty state until initial load is complete
  if (!initialLoadDone) {
    return null;
  }

  // Show empty state only when initial load is done and no listings
  if (listings.length === 0) {
    return (
      <EmptyState 
        icon="pricetags-outline" 
        title={expandedSearch ? "Showing nearby listings" : "No listings yet"} 
        description={expandedSearch ? "Try adjusting your location or search settings." : "Be the first to post an ad in your area!"} 
      />
    );
  }

  // Create rows based on column count
  const rows: (Listing[] | { type: 'banner'; position: number })[] = [];
  let rowCount = 0;

  for (let i = 0; i < listings.length; i += columns) {
    rows.push(listings.slice(i, i + columns));
    rowCount++;

    // Inject banner after every BANNER_INTERVAL rows
    if (rowCount % BANNER_INTERVAL === 0 && i + columns < listings.length) {
      rows.push({ type: 'banner', position: rowCount * columns });
    }
  }

  // Get user location for distance calculation
  const userLocation = selectedCity?.lat && selectedCity?.lng && 
    !isNaN(selectedCity.lat) && !isNaN(selectedCity.lng) 
    ? { lat: selectedCity.lat, lng: selectedCity.lng } 
    : null;

  return (
    <View 
      style={[
        (isDesktop || isTablet) && { 
          paddingHorizontal: gridPadding, 
          maxWidth: MAX_WIDTH, 
          alignSelf: 'center', 
          width: '100%' 
        }
      ]}
      data-testid="listings-grid"
    >
      {rows.map((row, rowIndex) => {
        // Check if this is a banner row
        if ('type' in row && row.type === 'banner') {
          return (
            <FeedBanner
              key={`banner-${row.position}`}
              position={row.position}
              category={selectedCategory || undefined}
            />
          );
        }

        // Regular listing row
        return (
          <View 
            key={rowIndex} 
            style={[styles.gridRow, { gap: gridGap }]}
            data-testid={`listing-row-${rowIndex}`}
          >
            {(row as Listing[]).map((item) => (
              <View 
                key={item.id} 
                style={[styles.cardWrapper, { width: cardWidth }]}
              >
                <ListingCard
                  listing={item}
                  onPress={() => router.push(`/listing/${item.id}`)}
                  onFavorite={() => toggleFavorite(item.id)}
                  isFavorited={favorites.has(item.id)}
                  userLocation={userLocation}
                />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};

export default ListingsGrid;
