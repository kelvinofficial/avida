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
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { useResponsive } from '../../src/hooks/useResponsive';

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
  success: '#388E3C',
  warning: '#F57C00',
};

const TABS = [
  { key: 'all', label: 'All', icon: 'list-outline' },
  { key: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
  { key: 'reserved', label: 'Reserved', icon: 'time-outline' },
  { key: 'sold', label: 'Sold', icon: 'bag-check-outline' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return COLORS.success;
    case 'reserved': return COLORS.warning;
    case 'sold': return COLORS.primary;
    default: return COLORS.textSecondary;
  }
};

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

// Helper function to check if listing is less than 24 hours old
const isJustListed = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  return diffInHours < 24;
};

// Skeleton Loader
const SkeletonItem = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.skeletonItem, isDesktop && desktopStyles.skeletonItem]}>
    <View style={[styles.skeletonImage, isDesktop && desktopStyles.skeletonImage]} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
      <View style={[styles.skeletonLine, { width: '30%' }]} />
    </View>
  </View>
);

// Desktop Card Component
const DesktopListingCard = ({
  item,
  onPress,
  onEdit,
  onMarkSold,
  onDelete,
}: {
  item: any;
  onPress: () => void;
  onEdit: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
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
      {/* Top Left Badges */}
      <View style={desktopStyles.cardBadges}>
        {isJustListed(item.created_at) && (
          <View style={desktopStyles.justListedBadge}>
            <Ionicons name="time" size={10} color="#fff" />
            <Text style={desktopStyles.badgeText}>Just Listed</Text>
          </View>
        )}
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
      {/* Status Badge */}
      <View style={[desktopStyles.statusOverlay, { backgroundColor: getStatusColor(item.status) + 'E6' }]}>
        <Text style={desktopStyles.statusOverlayText}>
          {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
        </Text>
      </View>
      {/* Views Counter - Bottom Right */}
      <View style={desktopStyles.viewsOverlay}>
        <Ionicons name="eye-outline" size={11} color="#fff" />
        <Text style={desktopStyles.viewsOverlayText}>{item.views || 0}</Text>
      </View>
    </View>
    
    {/* Actions Menu */}
    <View style={desktopStyles.cardActions}>
      <TouchableOpacity style={desktopStyles.cardActionBtn} onPress={onEdit}>
        <Ionicons name="pencil" size={16} color={COLORS.primary} />
      </TouchableOpacity>
      {item.status === 'active' && (
        <TouchableOpacity style={desktopStyles.cardActionBtn} onPress={onMarkSold}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
        </TouchableOpacity>
      )}
      <TouchableOpacity style={desktopStyles.cardActionBtn} onPress={onDelete}>
        <Ionicons name="trash" size={16} color={COLORS.error} />
      </TouchableOpacity>
    </View>
    
    <View style={desktopStyles.cardContent}>
      <Text style={desktopStyles.cardPrice}>€{item.price?.toLocaleString()}</Text>
      <Text style={desktopStyles.cardTitle} numberOfLines={2}>{item.title}</Text>
      
      {/* Location */}
      {item.location && (
        <View style={desktopStyles.cardLocation}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text style={desktopStyles.cardLocationText} numberOfLines={1}>
            {item.location?.city || item.location}
          </Text>
        </View>
      )}
      
      {/* Time Posted */}
      <Text style={desktopStyles.cardDate}>
        {formatTimeAgo(item.created_at)}
      </Text>
      
      <View style={desktopStyles.cardStats}>
        <View style={desktopStyles.cardStat}>
          <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
          <Text style={desktopStyles.cardStatText}>{item.views || 0}</Text>
        </View>
        <View style={desktopStyles.cardStat}>
          <Ionicons name="heart-outline" size={14} color={COLORS.textSecondary} />
          <Text style={desktopStyles.cardStatText}>{item.favorites_count || 0}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

// Mobile Listing Item
const ListingItem = ({
  item,
  onPress,
  onEdit,
  onMarkSold,
  onDelete,
}: {
  item: any;
  onPress: () => void;
  onEdit: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
}) => (
  <TouchableOpacity style={styles.listingItem} onPress={onPress}>
    <Image
      source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }}
      style={styles.listingImage}
    />
    <View style={styles.listingContent}>
      <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.listingPrice}>€{item.price?.toLocaleString()}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
          </Text>
        </View>
        <Text style={styles.listingDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.statText}>{item.views || 0}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="heart-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.statText}>{item.favorites_count || 0}</Text>
        </View>
      </View>
    </View>
    <View style={styles.actions}>
      <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
        <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
      </TouchableOpacity>
      {item.status === 'active' && (
        <TouchableOpacity style={styles.actionBtn} onPress={onMarkSold}>
          <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

// Empty State
const EmptyState = ({ status, isDesktop }: { status: string; isDesktop?: boolean }) => (
  <View style={[styles.emptyContainer, isDesktop && desktopStyles.emptyContainer]}>
    <View style={[styles.emptyIcon, isDesktop && desktopStyles.emptyIcon]}>
      <Ionicons name="list-outline" size={isDesktop ? 64 : 48} color={COLORS.textSecondary} />
    </View>
    <Text style={[styles.emptyTitle, isDesktop && desktopStyles.emptyTitle]}>
      No {status === 'all' ? '' : status} listings
    </Text>
    <Text style={[styles.emptySubtitle, isDesktop && desktopStyles.emptySubtitle]}>
      {status === 'all'
        ? "You haven't created any listings yet"
        : `You don't have any ${status} listings`}
    </Text>
  </View>
);

export default function MyListingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  const [activeTab, setActiveTab] = useState(params.tab as string || 'all');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchListings = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const response = await api.get('/profile/activity/listings', {
        params: { page: pageNum, limit: 20, status },
      });
      
      const newListings = response.data.listings || [];
      setTotal(response.data.total || 0);
      
      if (refresh || pageNum === 1) {
        setListings(newListings);
      } else {
        setListings(prev => [...prev, ...newListings]);
      }
      
      setHasMore(newListings.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetchListings(1, true);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, activeTab, fetchListings]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchListings(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchListings(page + 1);
    }
  };

  const handleMarkSold = (item: any) => {
    Alert.alert(
      'Mark as Sold',
      `Mark "${item.title}" as sold?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Sold',
          onPress: async () => {
            try {
              await api.put(`/listings/${item.id}`, { status: 'sold' });
              fetchListings(1, true);
              Alert.alert('Success', 'Listing marked as sold');
            } catch (error) {
              Alert.alert('Error', 'Failed to update listing');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/listings/${item.id}`);
              fetchListings(1, true);
              Alert.alert('Success', 'Listing deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete listing');
            }
          },
        },
      ]
    );
  };

  // Show instant render without loading spinner
  if (!isReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F0F2F5' }]} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: '#F0F2F5' }} />
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
                <TouchableOpacity style={desktopStyles.signInHeaderBtn} onPress={() => router.push('/login')}>
                  <Text style={desktopStyles.signInHeaderBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={desktopStyles.signUpHeaderBtn} onPress={() => router.push('/login')}>
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
        {renderGlobalHeader()}
        
        <View style={desktopStyles.pageWrapper}>
          <View style={desktopStyles.unauthContainer}>
            <View style={desktopStyles.unauthIcon}>
              <Ionicons name="lock-closed-outline" size={64} color={COLORS.textSecondary} />
            </View>
            <Text style={desktopStyles.unauthTitle}>Sign in to view your listings</Text>
            <Text style={desktopStyles.unauthSubtitle}>
              Manage your listings, track views, and see how your items are performing
            </Text>
            <TouchableOpacity style={desktopStyles.unauthSignInBtn} onPress={() => router.push('/login')}>
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
        {renderGlobalHeader()}
        
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
              <Text style={desktopStyles.pageTitle}>My Listings</Text>
              <View style={desktopStyles.totalBadge}>
                <Text style={desktopStyles.totalBadgeText}>{total}</Text>
              </View>
            </View>
            <TouchableOpacity style={desktopStyles.createBtn} onPress={() => router.push('/post')}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={desktopStyles.createBtnText}>Create Listing</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={desktopStyles.tabsContainer}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[desktopStyles.tab, activeTab === tab.key && desktopStyles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={16} 
                  color={activeTab === tab.key ? COLORS.primary : COLORS.textSecondary} 
                />
                <Text style={[desktopStyles.tabText, activeTab === tab.key && desktopStyles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content - Render immediately */}
          {listings.length === 0 && !loading ? (
            <EmptyState status={activeTab} isDesktop />
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
                {listings.map((item) => (
                  <View key={item.id} style={desktopStyles.gridItem}>
                    <DesktopListingCard
                      item={item}
                      onPress={() => router.push(`/listing/${item.id}`)}
                      onEdit={() => router.push(`/post?edit=${item.id}`)}
                      onMarkSold={() => handleMarkSold(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  </View>
                ))}
              </View>
              {hasMore && listings.length > 0 && (
                <TouchableOpacity style={desktopStyles.loadMoreBtn} onPress={handleLoadMore}>
                  <Text style={desktopStyles.loadMoreBtnText}>Load More</Text>
                </TouchableOpacity>
              )}
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
          <Text style={styles.headerTitle}>My Listings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginMessage}>Please sign in to view your listings</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
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
        <Text style={styles.headerTitle}>My Listings ({total})</Text>
        <TouchableOpacity onPress={() => router.push('/post')}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Render immediately without skeleton */}
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingItem
            item={item}
            onPress={() => router.push(`/listing/${item.id}`)}
            onEdit={() => router.push(`/post?edit=${item.id}`)}
            onMarkSold={() => handleMarkSold(item)}
            onDelete={() => handleDelete(item)}
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
        ListEmptyComponent={!loading ? <EmptyState status={activeTab} /> : null}
        ListFooterComponent={null}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  list: { padding: 16 },
  listingItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  listingContent: { flex: 1, gap: 4 },
  listingTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  listingPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  listingDate: { fontSize: 12, color: COLORS.textSecondary },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: COLORS.textSecondary },
  actions: { justifyContent: 'center', gap: 8 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  container: { backgroundColor: '#F0F2F5' },
  
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  createBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  
  // Grid
  scrollView: { flex: 1 },
  gridContainer: { padding: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '33.333%',
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
    width: '100%',
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
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: '70%',
    zIndex: 2,
  },
  justListedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  statusOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusOverlayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  viewsOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  viewsOverlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
  },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { padding: 14 },
  cardPrice: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  cardTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text, marginTop: 4, lineHeight: 20 },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  cardLocationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardMeta: { marginTop: 8 },
  cardDate: { fontSize: 12, color: COLORS.textSecondary },
  cardStats: { flexDirection: 'row', gap: 16, marginTop: 8 },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatText: { fontSize: 12, color: COLORS.textSecondary },
  
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
    backgroundColor: COLORS.background,
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
