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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { useResponsive } from '../../src/hooks/useResponsive';
import { DesktopPageLayout } from '../../src/components/layout';
import { useLoginRedirect } from '../../src/hooks/useLoginRedirect';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#388E3C',
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

// Sale Item
const SaleItem = ({ item, onPress }: { item: any; onPress: () => void }) => (
  <TouchableOpacity style={styles.saleItem} onPress={onPress}>
    <Image
      source={{ uri: item.images?.[0] || 'https://via.placeholder.com/80' }}
      style={styles.itemImage}
    />
    <View style={styles.itemContent}>
      <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.itemPrice}>€{item.price?.toLocaleString()}</Text>
      <View style={styles.soldBadge}>
        <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
        <Text style={styles.soldText}>Sold</Text>
      </View>
      <Text style={styles.itemDate}>
        Sold on {new Date(item.updated_at).toLocaleDateString()}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
  </TouchableOpacity>
);

// Empty State
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Ionicons name="cash-outline" size={48} color={COLORS.textSecondary} />
    </View>
    <Text style={styles.emptyTitle}>No sales yet</Text>
    <Text style={styles.emptySubtitle}>Items you sell will appear here</Text>
  </View>
);

export default function SalesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchSales = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const response = await api.get('/profile/activity/sales', {
        params: { page: pageNum, limit: 20 },
      });
      
      const newSales = response.data.sales || [];
      setTotal(response.data.total || 0);
      
      if (refresh || pageNum === 1) {
        setSales(newSales);
      } else {
        setSales(prev => [...prev, ...newSales]);
      }
      
      setHasMore(newSales.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSales(1, true);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchSales]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSales(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchSales(page + 1);
    }
  };

  // Calculate total earnings
  const totalEarnings = sales.reduce((sum, item) => sum + (item.price || 0), 0);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginMessage}>Please sign in to view sales</Text>
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
        <Text style={styles.headerTitle}>Sales ({total})</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Earnings Summary */}
      {sales.length > 0 && (
        <View style={styles.earningsCard}>
          <View style={styles.earningsIcon}>
            <Ionicons name="trending-up" size={24} color={COLORS.success} />
          </View>
          <View>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <Text style={styles.earningsAmount}>€{totalEarnings.toLocaleString()}</Text>
          </View>
        </View>
      )}

      {loading && !refreshing ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <SkeletonItem />}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SaleItem
              item={item}
              onPress={() => router.push(`/listing/${item.id}`)}
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
            hasMore && sales.length > 0 ? (
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
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  earningsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsLabel: { fontSize: 13, color: COLORS.textSecondary },
  earningsAmount: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  list: { padding: 16 },
  saleItem: {
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
  soldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soldText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
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
