/**
 * InstantFeedList Component
 * 
 * Production-ready feed list with:
 * - Cache-first instant rendering
 * - No skeleton loaders (ever)
 * - Smooth scrolling with virtualization
 * - Offline support indicator
 * - Pull-to-refresh with minimal indicator
 */

import React, { useCallback, memo, useMemo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  useInstantListingsFeed,
  getFeedFlatListProps,
  feedKeyExtractor,
  FeedParams,
} from '../../hooks/useInstantListingsFeed';
import { FeedItem } from '../../utils/feedCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = 240;

// Colors
const COLORS = {
  primary: '#2E7D32',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#FF9800',
};

// ============ Feed Card Component ============
interface FeedCardProps {
  item: FeedItem;
  onPress: () => void;
}

const FeedCard = memo(({ item, onPress }: FeedCardProps) => {
  // Format price
  const formatPrice = (price: number, currency: string) => {
    if (currency === 'TZS' || currency === 'TSh') {
      return `TSh ${price.toLocaleString()}`;
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {item.thumbUrl ? (
          <Image
            source={{ uri: item.thumbUrl }}
            style={styles.cardImage}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View style={[styles.cardImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={32} color={COLORS.textSecondary} />
          </View>
        )}
        
        {item.isBoosted && (
          <View style={styles.boostedBadge}>
            <Ionicons name="flash" size={12} color="#FFF" />
          </View>
        )}
        
        {item.isNegotiable && (
          <View style={styles.negotiableBadge}>
            <Text style={styles.negotiableText}>Negotiable</Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={styles.cardPrice}>
          {formatPrice(item.price, item.currency)}
        </Text>
        
        <View style={styles.cardLocation}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.cityName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============ Minimal Loading State ============
const MinimalLoader = memo(() => (
  <View style={styles.minimalLoader}>
    <ActivityIndicator size="small" color={COLORS.primary} />
    <Text style={styles.minimalLoaderText}>Loading listings...</Text>
  </View>
));

// ============ Empty State (only shown when confirmed empty) ============
const EmptyState = memo(({ onRetry }: { onRetry: () => void }) => (
  <View style={styles.emptyState}>
    <Ionicons name="search-outline" size={64} color={COLORS.textSecondary} />
    <Text style={styles.emptyTitle}>No listings found</Text>
    <Text style={styles.emptySubtitle}>
      Try adjusting your filters or search criteria
    </Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Refresh</Text>
    </TouchableOpacity>
  </View>
));

// ============ Offline Indicator ============
const OfflineIndicator = memo(() => (
  <View style={styles.offlineIndicator}>
    <Ionicons name="cloud-offline-outline" size={14} color="#FFF" />
    <Text style={styles.offlineText}>Offline</Text>
  </View>
));

// ============ Refresh Indicator ============
const RefreshIndicator = memo(({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  return (
    <View style={styles.refreshIndicator}>
      <ActivityIndicator size="small" color={COLORS.primary} />
    </View>
  );
});

// ============ Load More Indicator ============
const LoadMoreIndicator = memo(() => (
  <View style={styles.loadMoreIndicator}>
    <ActivityIndicator size="small" color={COLORS.primary} />
  </View>
));

// ============ Main Component ============
interface InstantFeedListProps {
  params: FeedParams;
  numColumns?: number;
  headerComponent?: React.ReactElement;
  ListHeaderComponent?: React.ReactElement;
  onItemPress?: (item: FeedItem) => void;
  contentContainerStyle?: any;
  showRefreshIndicator?: boolean;
}

export const InstantFeedList: React.FC<InstantFeedListProps> = ({
  params,
  numColumns = 2,
  headerComponent,
  ListHeaderComponent,
  onItemPress,
  contentContainerStyle,
  showRefreshIndicator = true,
}) => {
  const router = useRouter();
  
  const {
    items,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    isOffline,
    isInitialLoad,
    refresh,
    loadMore,
  } = useInstantListingsFeed(params);
  
  // Handle item press
  const handleItemPress = useCallback((item: FeedItem) => {
    if (onItemPress) {
      onItemPress(item);
    } else {
      router.push(`/listing/${item.id}`);
    }
  }, [onItemPress, router]);
  
  // Render item
  const renderItem = useCallback(({ item }: { item: FeedItem }) => (
    <FeedCard
      item={item}
      onPress={() => handleItemPress(item)}
    />
  ), [handleItemPress]);
  
  // FlatList optimized props
  const flatListProps = useMemo(() => getFeedFlatListProps(CARD_HEIGHT), []);
  
  // Determine what to show
  const showMinimalLoader = isInitialLoad && items.length === 0;
  const showEmptyState = !isInitialLoad && items.length === 0 && !isRefreshing;
  
  // Header with refresh indicator
  const ListHeader = useMemo(() => (
    <>
      {showRefreshIndicator && <RefreshIndicator visible={isRefreshing && items.length > 0} />}
      {isOffline && <OfflineIndicator />}
      {ListHeaderComponent || headerComponent}
    </>
  ), [showRefreshIndicator, isRefreshing, items.length, isOffline, ListHeaderComponent, headerComponent]);
  
  // Footer with load more indicator
  const ListFooter = useMemo(() => {
    if (isLoadingMore) return <LoadMoreIndicator />;
    return <View style={{ height: 100 }} />;
  }, [isLoadingMore]);
  
  // Show minimal loader only on true initial load
  if (showMinimalLoader) {
    return (
      <View style={[styles.container, contentContainerStyle]}>
        {ListHeader}
        <MinimalLoader />
      </View>
    );
  }
  
  // Show empty state only when confirmed empty
  if (showEmptyState) {
    return (
      <View style={[styles.container, contentContainerStyle]}>
        {ListHeader}
        <EmptyState onRetry={refresh} />
      </View>
    );
  }
  
  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={feedKeyExtractor}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      refreshControl={
        <RefreshControl
          refreshing={false} // We handle our own indicator
          onRefresh={refresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      {...flatListProps}
    />
  );
};

// ============ Styles ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  
  // Card styles
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.background,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.warning,
    borderRadius: 12,
    padding: 4,
  },
  negotiableBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  negotiableText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
    height: 36,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  
  // Minimal loader
  minimalLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  minimalLoaderText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Offline indicator
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warning,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    gap: 6,
  },
  offlineText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Refresh indicator
  refreshIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  
  // Load more indicator
  loadMoreIndicator: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default InstantFeedList;
