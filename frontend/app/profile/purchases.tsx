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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  success: '#388E3C',
  warning: '#F57C00',
  info: '#1976D2',
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending': return { color: COLORS.warning, icon: 'time-outline', label: 'Pending' };
    case 'paid': return { color: COLORS.info, icon: 'card-outline', label: 'Paid' };
    case 'delivered': return { color: COLORS.success, icon: 'checkmark-circle-outline', label: 'Delivered' };
    case 'cancelled': return { color: COLORS.textSecondary, icon: 'close-circle-outline', label: 'Cancelled' };
    default: return { color: COLORS.textSecondary, icon: 'help-outline', label: status };
  }
};

// Skeleton Loader
const SkeletonItem = () => (
  <View style={styles.skeletonItem}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
      <View style={[styles.skeletonLine, { width: '50%' }]} />
    </View>
  </View>
);

// Purchase Item
const PurchaseItem = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const listing = item.listing || {};
  const statusConfig = getStatusConfig(item.status || 'pending');
  
  return (
    <TouchableOpacity style={styles.purchaseItem} onPress={onPress}>
      <Image
        source={{ uri: listing.images?.[0] || 'https://via.placeholder.com/80' }}
        style={styles.itemImage}
      />
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={2}>{listing.title || 'Item'}</Text>
        <Text style={styles.itemPrice}>€{listing.price?.toLocaleString()}</Text>
        <View style={styles.statusRow}>
          <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
        <Text style={styles.itemDate}>
          Purchased {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

// Empty State
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Ionicons name="bag-outline" size={48} color={COLORS.textSecondary} />
    </View>
    <Text style={styles.emptyTitle}>No purchases yet</Text>
    <Text style={styles.emptySubtitle}>Items you buy will appear here</Text>
  </View>
);

export default function PurchasesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPurchases = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const response = await api.get('/profile/activity/purchases', {
        params: { page: pageNum, limit: 20 },
      });
      
      const newPurchases = response.data.purchases || [];
      
      if (refresh || pageNum === 1) {
        setPurchases(newPurchases);
      } else {
        setPurchases(prev => [...prev, ...newPurchases]);
      }
      
      setHasMore(newPurchases.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases(1, true);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchPurchases]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPurchases(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchPurchases(page + 1);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Purchases</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginMessage}>Please sign in to view purchases</Text>
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
        <Text style={styles.headerTitle}>Purchases</Text>
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
          data={purchases}
          keyExtractor={(item, index) => item.conversation_id || index.toString()}
          renderItem={({ item }) => (
            <PurchaseItem
              item={item}
              onPress={() => router.push(`/chat/${item.conversation_id}`)}
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
            hasMore && purchases.length > 0 ? (
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
  purchaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  itemContent: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  itemDate: { fontSize: 12, color: COLORS.textSecondary },
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  skeletonImage: {
    width: 70,
    height: 70,
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
