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
  error: '#D32F2F',
};

// Skeleton Loader
const SkeletonItem = () => (
  <View style={styles.skeletonItem}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
    </View>
  </View>
);

// Listing Item
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
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Ionicons name="heart-outline" size={48} color={COLORS.textSecondary} />
    </View>
    <Text style={styles.emptyTitle}>No saved items</Text>
    <Text style={styles.emptySubtitle}>
      Items you save will appear here
    </Text>
  </View>
);

export default function SavedItemsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
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
