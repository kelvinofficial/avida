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
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { useResponsive } from '../../src/hooks/useResponsive';
import { DesktopHeader } from '../../src/components/layout';
import { useLoginRedirect } from '../../src/hooks/useLoginRedirect';
import { Footer } from '../../src/components/layout';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  textMuted: '#9E9E9E',
  border: '#E0E0E0',
  error: '#D32F2F',
};

// Skeleton Loader
const SkeletonItem = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.skeletonItem, isDesktop && desktopStyles.skeletonItem]}>
    <View style={[styles.skeletonImage, isDesktop && desktopStyles.skeletonImage]} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
    </View>
  </View>
);

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return 'Just now';
  if (diffInMins < 60) return `${diffInMins} min ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
  return date.toLocaleDateString();
};

// Desktop Card Component
const DesktopListingCard = ({
  item,
  onPress,
  onRemove,
}: {
  item: any;
  onPress: () => void;
  onRemove: () => void;
}) => (
  <TouchableOpacity 
    style={[desktopStyles.card, Platform.OS === 'web' && { cursor: 'pointer' } as any]} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={desktopStyles.cardImageContainer}>
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200' }}
        style={desktopStyles.cardImage}
      />
      {/* Badges */}
      <View style={desktopStyles.cardBadges}>
        {item.is_featured && (
          <View style={desktopStyles.featuredBadge}>
            <Ionicons name="star" size={10} color="#fff" />
            <Text style={desktopStyles.badgeText}>Featured</Text>
          </View>
        )}
        {item.is_top && (
          <View style={desktopStyles.topBadge}>
            <Ionicons name="arrow-up" size={10} color="#fff" />
            <Text style={desktopStyles.badgeText}>TOP</Text>
          </View>
        )}
      </View>
      {/* Heart Button */}
      <TouchableOpacity style={desktopStyles.heartBtn} onPress={onRemove}>
        <Ionicons name="heart" size={22} color={COLORS.error} />
      </TouchableOpacity>
    </View>
    
    <View style={desktopStyles.cardContent}>
      <Text style={desktopStyles.cardPrice}>€{item.price?.toLocaleString()}</Text>
      <Text style={desktopStyles.cardTitle} numberOfLines={2}>{item.title}</Text>
      
      <View style={desktopStyles.cardMeta}>
        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
        <Text style={desktopStyles.cardLocation} numberOfLines={1}>
          {item.location?.city || item.location || 'Unknown'}
        </Text>
      </View>
      
      <Text style={desktopStyles.cardTime}>
        {formatTimeAgo(item.created_at)}
      </Text>
    </View>
  </TouchableOpacity>
);

// Mobile Listing Item
const ListingItem = ({ 
  item, 
  onPress, 
  onRemove 
}: { 
  item: any; 
  onPress: () => void; 
  onRemove: () => void;
}) => (
  <TouchableOpacity style={styles.listingItem} onPress={onPress}>
    <Image
      source={{ uri: item.images?.[0] || 'https://via.placeholder.com/80' }}
      style={styles.itemImage}
    />
    <View style={styles.itemContent}>
      <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.itemPrice}>€{item.price?.toLocaleString()}</Text>
      <View style={styles.itemMeta}>
        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.itemLocation} numberOfLines={1}>{item.location}</Text>
      </View>
      <Text style={styles.savedDate}>
        Saved {item.saved_at ? new Date(item.saved_at).toLocaleDateString() : 'recently'}
      </Text>
    </View>
    <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
      <Ionicons name="heart" size={24} color={COLORS.error} />
    </TouchableOpacity>
  </TouchableOpacity>
);

// Empty State
const EmptyState = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.emptyContainer, isDesktop && desktopStyles.emptyContainer]}>
    <View style={[styles.emptyIcon, isDesktop && desktopStyles.emptyIcon]}>
      <Ionicons name="heart-outline" size={isDesktop ? 64 : 48} color={COLORS.textSecondary} />
    </View>
    <Text style={[styles.emptyTitle, isDesktop && desktopStyles.emptyTitle]}>No saved items</Text>
    <Text style={[styles.emptySubtitle, isDesktop && desktopStyles.emptySubtitle]}>
      Items you save will appear here. Tap the heart icon on any listing to save it.
    </Text>
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

  // Show loading state until responsive layout is ready
  if (!isReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F0F2F5' }]} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Render global desktop header
  const renderGlobalHeader = () => (
    <View style={desktopStyles.globalHeader}>
      {/* Row 1: Logo + Auth + Post Listing */}
      <View style={desktopStyles.globalHeaderRow1}>
        <View style={desktopStyles.globalHeaderInner}>
          {/* Logo */}
          <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
            <View style={desktopStyles.logoIcon}>
              <Ionicons name="storefront" size={20} color="#fff" />
            </View>
            <Text style={desktopStyles.logoText}>avida</Text>
          </TouchableOpacity>
          
          {/* Header Actions */}
          <View style={desktopStyles.globalHeaderActions}>
            {isAuthenticated ? (
              <>
                <TouchableOpacity 
                  style={desktopStyles.headerIconBtn} 
                  onPress={() => router.push('/notifications')}
                >
                  <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={desktopStyles.headerIconBtn} 
                  onPress={() => router.push('/profile')}
                >
                  <Ionicons name="person-circle-outline" size={26} color={COLORS.text} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={desktopStyles.signInHeaderBtn} onPress={() => goToLogin()}>
                  <Text style={desktopStyles.signInHeaderBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={desktopStyles.signUpHeaderBtn} onPress={() => goToLogin()}>
                  <Text style={desktopStyles.signUpHeaderBtnText}>Sign Up</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={desktopStyles.postListingBtn} onPress={() => router.push('/post')}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={desktopStyles.postListingBtnText}>Post Listing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Row 2: Search + Location */}
      <View style={desktopStyles.globalHeaderRow2}>
        <View style={desktopStyles.globalHeaderInner}>
          <TouchableOpacity 
            style={desktopStyles.searchField} 
            onPress={() => router.push('/search')} 
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <Text style={desktopStyles.searchPlaceholder}>Search for anything...</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={desktopStyles.locationChip} 
            activeOpacity={0.7} 
            onPress={() => router.push('/')}
          >
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <Text style={desktopStyles.locationText} numberOfLines={1}>All Locations</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Desktop unauthenticated view
  if (isLargeScreen && !isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
        <DesktopHeader />
        
        <View style={desktopStyles.pageWrapper}>
          <View style={desktopStyles.unauthContainer}>
            <View style={desktopStyles.unauthIcon}>
              <Ionicons name="heart-outline" size={64} color={COLORS.error} />
            </View>
            <Text style={desktopStyles.unauthTitle}>Sign in to view saved items</Text>
            <Text style={desktopStyles.unauthSubtitle}>
              Keep track of your favorite listings and access them anytime
            </Text>
            <TouchableOpacity style={desktopStyles.unauthSignInBtn} onPress={() => goToLogin()}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={desktopStyles.unauthSignInBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Desktop authenticated view
  if (isLargeScreen) {
    return (
      <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
        <DesktopHeader />
        
        <View style={desktopStyles.pageWrapper}>
          {/* Page Header */}
          <View style={desktopStyles.pageHeader}>
            <View style={desktopStyles.pageHeaderLeft}>
              <TouchableOpacity 
                style={desktopStyles.backBtn} 
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={desktopStyles.pageTitle}>Saved Items</Text>
              {total > 0 && (
                <View style={desktopStyles.totalBadge}>
                  <Text style={desktopStyles.totalBadgeText}>{total}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={desktopStyles.browseBtn} onPress={() => router.push('/')}>
              <Ionicons name="search-outline" size={18} color={COLORS.primary} />
              <Text style={desktopStyles.browseBtnText}>Browse More</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading && !refreshing ? (
            <View style={desktopStyles.gridContainer}>
              <View style={desktopStyles.grid}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={desktopStyles.gridItem}>
                    <SkeletonItem isDesktop />
                  </View>
                ))}
              </View>
            </View>
          ) : items.length === 0 ? (
            <EmptyState isDesktop />
          ) : (
            <ScrollView 
              style={desktopStyles.scrollView}
              contentContainerStyle={desktopStyles.gridContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
            >
              <View style={desktopStyles.grid}>
                {items.map((item) => (
                  <View key={item.id} style={desktopStyles.gridItem}>
                    <DesktopListingCard
                      item={item}
                      onPress={() => router.push(`/listing/${item.id}`)}
                      onRemove={() => handleRemove(item)}
                    />
                  </View>
                ))}
              </View>
              {hasMore && items.length > 0 && (
                <TouchableOpacity style={desktopStyles.loadMoreBtn} onPress={handleLoadMore}>
                  <Text style={desktopStyles.loadMoreBtnText}>Load More</Text>
                </TouchableOpacity>
              )}
              {/* Footer */}
              <Footer isTablet={isTablet && !isDesktop} />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Mobile unauthenticated view
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Items</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginMessage}>Please sign in to view saved items</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => goToLogin()}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Mobile authenticated view
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Items ({total})</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !refreshing ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <SkeletonItem />}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingItem
              item={item}
              onPress={() => router.push(`/listing/${item.id}`)}
              onRemove={() => handleRemove(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={
            hasMore && items.length > 0 ? (
              <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loginMessage: { fontSize: 15, color: COLORS.textSecondary },
  signInBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  signInBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  list: { padding: 16 },
  listingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  itemContent: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemLocation: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  savedDate: { fontSize: 12, color: COLORS.border },
  removeBtn: {
    padding: 8,
  },
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  skeletonContent: { flex: 1, gap: 8 },
  skeletonLine: {
    height: 14,
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});

// Desktop-specific styles
const desktopStyles = StyleSheet.create({
  container: { backgroundColor: '#1A1A1A' }, // Dark footer background
  
  // Global Header
  globalHeader: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  globalHeaderRow1: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  globalHeaderRow2: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  globalHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  globalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  signInHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  signInHeaderBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  signUpHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  signUpHeaderBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  postListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  postListingBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    gap: 10,
  },
  searchPlaceholder: { fontSize: 15, color: COLORS.textSecondary },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  locationText: { fontSize: 14, fontWeight: '500', color: COLORS.text, maxWidth: 120 },
  
  // Page Wrapper
  pageWrapper: {
    flex: 1,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Page Header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  totalBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  browseBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  
  // Grid
  scrollView: { flex: 1 },
  gridContainer: { padding: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '25%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  
  // Desktop Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.border,
  },
  cardBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { padding: 14 },
  cardPrice: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  cardTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text, marginTop: 4, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  cardLocation: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  cardTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  
  // Skeleton
  skeletonItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  skeletonImage: { width: '100%', height: 180 },
  
  // Empty State
  emptyContainer: { paddingVertical: 80 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 22 },
  emptySubtitle: { fontSize: 15, maxWidth: 400 },
  
  // Unauthenticated
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  unauthIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  unauthTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  unauthSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 24,
    marginBottom: 24,
  },
  unauthSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  unauthSignInBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  
  // Load More
  loadMoreBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    marginTop: 8,
  },
  loadMoreBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
