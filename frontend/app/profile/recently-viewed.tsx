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
};

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
  return date.toLocaleDateString();
};

const DesktopCard = ({ item, onPress }: { item: any; onPress: () => void }) => (
  <TouchableOpacity 
    style={styles.desktopCard} 
    onPress={onPress}
    data-testid={`recent-item-${item.id}`}
  >
    <View style={styles.cardImageContainer}>
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300' }}
        style={styles.cardImage}
      />
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
      <Text style={styles.cardTime}>Viewed {formatTimeAgo(item.viewed_at || item.created_at)}</Text>
    </View>
  </TouchableOpacity>
);

const MobileCard = ({ item, onPress }: { item: any; onPress: () => void }) => (
  <TouchableOpacity style={styles.mobileCard} onPress={onPress}>
    <Image
      source={{ uri: item.images?.[0] || 'https://via.placeholder.com/80' }}
      style={styles.mobileCardImage}
    />
    <View style={styles.mobileCardContent}>
      <Text style={styles.mobileCardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.mobileCardPrice}>€{item.price?.toLocaleString()}</Text>
      <Text style={styles.mobileCardTime}>Viewed {formatTimeAgo(item.viewed_at || item.created_at)}</Text>
    </View>
  </TouchableOpacity>
);

const EmptyState = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.emptyContainer, isDesktop && styles.emptyContainerDesktop]}>
    <View style={[styles.emptyIcon, isDesktop && styles.emptyIconDesktop]}>
      <Ionicons name="time-outline" size={isDesktop ? 64 : 48} color={COLORS.textSecondary} />
    </View>
    <Text style={[styles.emptyTitle, isDesktop && styles.emptyTitleDesktop]}>No recently viewed items</Text>
    <Text style={[styles.emptySubtitle, isDesktop && styles.emptySubtitleDesktop]}>
      Items you view will appear here for easy access.
    </Text>
  </View>
);

const Skeleton = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.skeleton, isDesktop && styles.skeletonDesktop]}>
    <View style={[styles.skeletonImage, isDesktop && styles.skeletonImageDesktop]} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '60%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
    </View>
  </View>
);

export default function RecentlyViewedScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const { goToLogin } = useLoginRedirect();
  const isLargeScreen = isDesktop || isTablet;
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecentlyViewed = useCallback(async (refresh: boolean = false) => {
    try {
      const response = await api.get('/profile/activity/recently-viewed', {
        params: { limit: 50 },
      });
      setItems(response.data.items || response.data || []);
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentlyViewed();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchRecentlyViewed]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecentlyViewed(true);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Clear all recently viewed items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/profile/activity/recently-viewed');
              setItems([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
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
    const rightAction = items.length > 0 ? (
      <TouchableOpacity 
        style={styles.clearButton} 
        onPress={handleClearHistory}
        data-testid="clear-history-btn"
      >
        <Ionicons name="trash-outline" size={18} color={COLORS.textSecondary} />
        <Text style={styles.clearButtonText}>Clear History</Text>
      </TouchableOpacity>
    ) : null;

    if (!isAuthenticated) {
      return (
        <DesktopPageLayout title="Recently Viewed" icon="time-outline">
          <View style={styles.unauthContainer}>
            <View style={styles.unauthIcon}>
              <Ionicons name="time-outline" size={64} color={COLORS.primary} />
            </View>
            <Text style={styles.unauthTitle}>Sign in to view history</Text>
            <Text style={styles.unauthSubtitle}>
              Keep track of items you've viewed and find them easily
            </Text>
            <TouchableOpacity style={styles.signInButton} onPress={() => goToLogin()}>
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </DesktopPageLayout>
      );
    }

    return (
      <DesktopPageLayout
        title="Recently Viewed"
        subtitle={`${items.length} items`}
        icon="time-outline"
        rightAction={rightAction}
      >
        {loading ? (
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} isDesktop />
            ))}
          </View>
        ) : items.length === 0 ? (
          <EmptyState isDesktop />
        ) : (
          <View style={styles.gridContainer}>
            {items.map((item) => (
              <DesktopCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/listing/${item.id}`)}
              />
            ))}
          </View>
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
          <Text style={styles.mobileHeaderTitle}>Recently Viewed</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.mobileAuthPrompt}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.mobileAuthText}>Please sign in to view history</Text>
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
        <Text style={styles.mobileHeaderTitle}>Recently Viewed</Text>
        {items.length > 0 ? (
          <TouchableOpacity onPress={handleClearHistory}>
            <Ionicons name="trash-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <FlatList
        data={loading ? [] : items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MobileCard item={item} onPress={() => router.push(`/listing/${item.id}`)} />
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },

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
    aspectRatio: 4 / 3,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
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

  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  unauthContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  unauthIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
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
  mobileCardTime: {
    fontSize: 12,
    color: COLORS.textLight,
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
