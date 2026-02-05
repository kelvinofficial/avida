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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { favoritesApi } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/utils/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

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
const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '60%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
    </View>
  </View>
);

// Listing Card
const ListingCard = ({ 
  item, 
  onPress, 
  onRemove 
}: { 
  item: any; 
  onPress: () => void; 
  onRemove: () => void;
}) => {
  const getRoute = () => {
    if (item.type === 'property') return `/property/${item.id}`;
    if (item.type === 'auto') return `/auto/${item.id}`;
    return `/listing/${item.id}`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
        style={styles.cardImage}
      />
      <TouchableOpacity style={styles.heartBtn} onPress={onRemove}>
        <Ionicons name="heart" size={20} color={COLORS.error} />
      </TouchableOpacity>
      <View style={styles.cardContent}>
        <Text style={styles.cardPrice}>€{item.price?.toLocaleString()}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.cardLocation} numberOfLines={1}>
            {item.location?.city || item.location || 'Unknown'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Empty State
const EmptyState = ({ isAuthenticated, onSignIn }: { isAuthenticated: boolean; onSignIn: () => void }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Ionicons name="heart-outline" size={64} color={COLORS.textSecondary} />
    </View>
    {isAuthenticated ? (
      <>
        <Text style={styles.emptyTitle}>No saved items</Text>
        <Text style={styles.emptySubtitle}>
          Items you save will appear here. Tap the heart icon on any listing to save it.
        </Text>
      </>
    ) : (
      <>
        <Text style={styles.emptyTitle}>Sign in to save items</Text>
        <Text style={styles.emptySubtitle}>
          Create an account or sign in to save your favorite listings.
        </Text>
        <TouchableOpacity style={styles.signInBtn} onPress={onSignIn}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </>
    )}
  </View>
);

export default function SavedScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSavedItems = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/profile/activity/favorites', {
        params: { page: 1, limit: 100 },
      });
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching saved items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSavedItems();
  }, [fetchSavedItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSavedItems();
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
              await favoritesApi.remove(item.id);
              setItems(prev => prev.filter(i => i.id !== item.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const handlePress = (item: any) => {
    if (item.type === 'property') {
      router.push(`/property/${item.id}`);
    } else if (item.type === 'auto') {
      router.push(`/auto/${item.id}`);
    } else {
      router.push(`/listing/${item.id}`);
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.cardWrapper, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}>
      <ListingCard
        item={item}
        onPress={() => handlePress(item)}
        onRemove={() => handleRemove(item)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
        {items.length > 0 && (
          <Text style={styles.headerCount}>{items.length} items</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonRow}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
          <View style={styles.skeletonRow}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      ) : items.length === 0 ? (
        <EmptyState 
          isAuthenticated={isAuthenticated} 
          onSignIn={() => router.push('/login')} 
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
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
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  headerCount: { fontSize: 14, color: COLORS.textSecondary },
  list: { padding: 16, paddingBottom: 100 },
  cardWrapper: { width: '50%' },
  cardLeft: { paddingRight: 6 },
  cardRight: { paddingLeft: 6 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.border,
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { padding: 10 },
  cardPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  cardTitle: { fontSize: 13, color: COLORS.text, marginTop: 4, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  cardLocation: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
  skeletonContainer: { padding: 16 },
  skeletonRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  skeletonCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  skeletonImage: { width: '100%', height: 140, backgroundColor: COLORS.border },
  skeletonContent: { padding: 10, gap: 8 },
  skeletonLine: { height: 14, backgroundColor: COLORS.border, borderRadius: 4 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { 
    fontSize: 15, 
    color: COLORS.textSecondary, 
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  signInBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  signInBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
