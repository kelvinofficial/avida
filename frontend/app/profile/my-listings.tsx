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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'sold', label: 'Sold' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return COLORS.success;
    case 'reserved': return COLORS.warning;
    case 'sold': return COLORS.primary;
    default: return COLORS.textSecondary;
  }
};

// Skeleton Loader
const SkeletonItem = () => (
  <View style={styles.skeletonItem}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
      <View style={[styles.skeletonLine, { width: '30%' }]} />
    </View>
  </View>
);

// Listing Item
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
const EmptyState = ({ status }: { status: string }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Ionicons name="list-outline" size={48} color={COLORS.textSecondary} />
    </View>
    <Text style={styles.emptyTitle}>No {status === 'all' ? '' : status} listings</Text>
    <Text style={styles.emptySubtitle}>
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

      {loading && !refreshing ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <SkeletonItem />}
          contentContainerStyle={styles.list}
        />
      ) : (
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
          ListEmptyComponent={<EmptyState status={activeTab} />}
          ListFooterComponent={
            hasMore && listings.length > 0 ? (
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
