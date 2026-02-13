import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { useResponsive } from '../../src/hooks/useResponsive';
import { DesktopPageLayout } from '../../src/components/layout';
import { useLoginRedirect } from '../../src/hooks/useLoginRedirect';
import { ImagePlaceholder } from '../../src/components/common/ImagePlaceholder';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
};

// Format time helper
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return 'Just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
  return date.toLocaleDateString();
};

// Desktop Card Component - proper grid card
const DesktopCard = ({
  item,
  onPress,
  onRemove,
}: {
  item: any;
  onPress: () => void;
  onRemove: () => void;
}) => (
  <TouchableOpacity 
    style={styles.desktopCard} 
    onPress={onPress}
    activeOpacity={0.8}
    data-testid={`saved-item-${item.id}`}
  >
    <View style={styles.cardImageContainer}>
      {item.images?.[0] ? (
        <Image
          source={{ uri: item.images[0] }}
          style={styles.cardImage}
        />
      ) : (
        <ImagePlaceholder size="large" />
      )}
      {item.is_featured && (
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={10} color="#fff" />
          <Text style={styles.badgeText}>Featured</Text>
        </View>
      )}
      <TouchableOpacity 
        style={styles.heartButton} 
        onPress={(e) => { e.stopPropagation(); onRemove(); }}
        data-testid={`remove-saved-${item.id}`}
      >
        <Ionicons name="heart" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
    
    <View style={styles.cardContent}>
      <Text style={styles.cardPrice}>€{item.price?.toLocaleString()}</Text>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.cardMeta}>
        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.cardLocation} numberOfLines={1}>
          {item.location?.city || item.location || 'Unknown'}
        </Text>
      </View>
      <Text style={styles.cardTime}>{formatTimeAgo(item.created_at)}</Text>
    </View>
  </TouchableOpacity>
);

// Mobile Card Component
const MobileCard = ({
  item,
  onPress,
  onRemove,
}: {
  item: any;
  onPress: () => void;
  onRemove: () => void;
}) => (
  <TouchableOpacity style={styles.mobileCard} onPress={onPress}>
    {item.images?.[0] ? (
      <Image
        source={{ uri: item.images[0] }}
        style={styles.mobileCardImage}
      />
    ) : (
      <View style={styles.mobileCardImage}>
        <ImagePlaceholder size="small" showText={false} />
      </View>
    )}
    <View style={styles.mobileCardContent}>
      <Text style={styles.mobileCardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.mobileCardPrice}>€{item.price?.toLocaleString()}</Text>
      <View style={styles.mobileCardMeta}>
        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.mobileCardLocation} numberOfLines={1}>{item.location}</Text>
      </View>
    </View>
    <TouchableOpacity style={styles.mobileHeartBtn} onPress={onRemove}>
      <Ionicons name="heart" size={24} color={COLORS.error} />
    </TouchableOpacity>
  </TouchableOpacity>
);

// Empty State
const EmptyState = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.emptyContainer, isDesktop && styles.emptyContainerDesktop]}>
    <View style={[styles.emptyIcon, isDesktop && styles.emptyIconDesktop]}>
      <Ionicons name="heart-outline" size={isDesktop ? 64 : 48} color={COLORS.textSecondary} />
    </View>
    <Text style={[styles.emptyTitle, isDesktop && styles.emptyTitleDesktop]}>No saved items</Text>
    <Text style={[styles.emptySubtitle, isDesktop && styles.emptySubtitleDesktop]}>
      Items you save will appear here. Tap the heart icon on any listing to save it.
    </Text>
  </View>
);

// Loading Skeleton
const Skeleton = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.skeleton, isDesktop && styles.skeletonDesktop]}>
    <View style={[styles.skeletonImage, isDesktop && styles.skeletonImageDesktop]} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '60%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
    </View>
  </View>
);

export default function SavedItemsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const { goToLogin } = useLoginRedirect();
  const isLargeScreen = isDesktop || isTablet;
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchSavedItems = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const response = await api.get('/profile/activity/favorites', {
        params: { page: pageNum, limit: 20 },
      });
      
      const newItems = response.data.items || [];
      setTotal(response.data.total || 0);
      
      if (refresh || pageNum === 1) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
      
      setHasMore(newItems.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching saved items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSavedItems(1, true);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchSavedItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSavedItems(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchSavedItems(page + 1);
    }
  };

  const handleRemove = (item: any) => {
    Alert.alert(
      'Remove from Saved',
      `Remove "${item.title}" from your saved items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/favorites/${item.id}`);
              setItems(prev => prev.filter(i => i.id !== item.id));
              setTotal(prev => prev - 1);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // Desktop Layout
  if (isLargeScreen) {
    const rightAction = (
      <TouchableOpacity 
        style={styles.browseButton} 
        onPress={() => router.push('/')}
        data-testid="browse-more-btn"
      >
        <Ionicons name="search-outline" size={18} color={COLORS.primary} />
        <Text style={styles.browseButtonText}>Browse More</Text>
      </TouchableOpacity>
    );

    // Unauthenticated state
    if (!isAuthenticated) {
      return (
        <DesktopPageLayout
          title="Saved Items"
          icon="heart-outline"
          rightAction={rightAction}
        >
          <View style={styles.unauthContainer}>
            <View style={styles.unauthIcon}>
              <Ionicons name="heart-outline" size={64} color={COLORS.error} />
            </View>
            <Text style={styles.unauthTitle}>Sign in to view saved items</Text>
            <Text style={styles.unauthSubtitle}>
              Keep track of your favorite listings and access them anytime
            </Text>
            <TouchableOpacity 
              style={styles.signInButton} 
              onPress={() => goToLogin()}
              data-testid="sign-in-btn"
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </DesktopPageLayout>
      );
    }

    // Authenticated state
    return (
      <DesktopPageLayout
        title="Saved Items"
        subtitle={`${total} items saved`}
        icon="heart-outline"
        rightAction={rightAction}
      >
        {loading && !refreshing ? (
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} isDesktop />
            ))}
          </View>
        ) : items.length === 0 ? (
          <EmptyState isDesktop />
        ) : (
          <>
            <View style={styles.gridContainer}>
              {items.map((item) => (
                <DesktopCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/listing/${item.id}`)}
                  onRemove={() => handleRemove(item)}
                />
              ))}
            </View>
            {hasMore && items.length > 0 && (
              <TouchableOpacity 
                style={styles.loadMoreButton} 
                onPress={handleLoadMore}
                data-testid="load-more-btn"
              >
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </DesktopPageLayout>
    );
  }

  // Mobile Layout
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.mobileContainer} edges={['top']}>
        <View style={styles.mobileHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Saved Items</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.mobileAuthPrompt}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.mobileAuthText}>Please sign in to view saved items</Text>
          <TouchableOpacity style={styles.mobileSignInBtn} onPress={() => goToLogin()}>
            <Text style={styles.mobileSignInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mobileContainer} edges={['top']}>
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>Saved Items ({total})</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={loading ? [] : items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MobileCard
            item={item}
            onPress={() => router.push(`/listing/${item.id}`)}
            onRemove={() => handleRemove(item)}
          />
        )}
        ListEmptyComponent={loading ? null : <EmptyState />}
        contentContainerStyle={styles.mobileList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  // Desktop Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },

  // Desktop Card
  desktopCard: {
    width: 'calc(33.333% - 14px)' as any,
    minWidth: 280,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  cardImageContainer: {
    position: 'relative',
    aspectRatio: 4 / 3,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 14,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  // Browse Button
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Load More
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },

  // Unauthenticated
  unauthContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  unauthIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  unauthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  unauthSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 24,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainerDesktop: {
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconDesktop: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyTitleDesktop: {
    fontSize: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptySubtitleDesktop: {
    maxWidth: 360,
  },

  // Skeleton
  skeleton: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
  },
  skeletonDesktop: {
    width: 'calc(33.333% - 14px)' as any,
    minWidth: 280,
    flexDirection: 'column',
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  skeletonImageDesktop: {
    width: '100%',
    height: 180,
    borderRadius: 0,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 8,
  },

  // Mobile Styles
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  mobileList: {
    padding: 16,
  },
  mobileCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mobileCardImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  mobileCardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  mobileCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  mobileCardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  mobileCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mobileCardLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  mobileHeartBtn: {
    padding: 8,
    alignSelf: 'center',
  },
  mobileAuthPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mobileAuthText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  mobileSignInBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  mobileSignInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
