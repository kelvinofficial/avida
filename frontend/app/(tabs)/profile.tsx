import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { useAuthStore } from '../../src/store/authStore';
import { listingsApi, favoritesApi, authApi } from '../../src/utils/api';
import { Listing } from '../../src/types';
import { EmptyState } from '../../src/components/EmptyState';

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'listings' | 'favorites'>('listings');
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const [listingsData, favoritesData] = await Promise.all([
        listingsApi.getMy(),
        favoritesApi.getAll(),
      ]);
      setListings(listingsData);
      setFavorites(favoritesData);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.logout();
            } catch (e) {
              // ignore
            }
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderListingItem = (item: Listing) => {
    const imageSource = item.images?.[0]
      ? item.images[0].startsWith('data:')
        ? { uri: item.images[0] }
        : { uri: `data:image/jpeg;base64,${item.images[0]}` }
      : null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.listingItem}
        onPress={() => router.push(`/listing/${item.id}`)}
      >
        {imageSource ? (
          <Image source={imageSource} style={styles.listingImage} />
        ) : (
          <View style={styles.listingImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={theme.colors.outline} />
          </View>
        )}
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.listingPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.listingStatus}>
            <View style={[
              styles.statusBadge,
              item.status === 'sold' && styles.statusBadgeSold,
            ]}>
              <Text style={[
                styles.statusText,
                item.status === 'sold' && styles.statusTextSold,
              ]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.listingViews}>
              <Ionicons name="eye-outline" size={12} /> {item.views}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <EmptyState
          icon="person-outline"
          title="Sign in to your account"
          description="Manage your listings, favorites, and profile"
          action={
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={32} color={theme.colors.onSurfaceVariant} />
              </View>
            )}
            <View style={styles.profileDetails}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {user?.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{listings.filter(l => l.status === 'active').length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{listings.filter(l => l.status === 'sold').length}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{favorites.length}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'listings' && styles.tabActive]}
            onPress={() => setActiveTab('listings')}
          >
            <Ionicons
              name="pricetags-outline"
              size={20}
              color={activeTab === 'listings' ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.tabText, activeTab === 'listings' && styles.tabTextActive]}>
              My Listings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            onPress={() => setActiveTab('favorites')}
          >
            <Ionicons
              name="heart-outline"
              size={20}
              color={activeTab === 'favorites' ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>
              Favorites
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : (
          <View style={styles.listingsContainer}>
            {activeTab === 'listings' ? (
              listings.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="pricetags-outline" size={48} color={theme.colors.outline} />
                  <Text style={styles.emptyText}>No listings yet</Text>
                  <TouchableOpacity
                    style={styles.postButton}
                    onPress={() => router.push('/post/category')}
                  >
                    <Text style={styles.postButtonText}>Post Your First Ad</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                listings.map(renderListingItem)
              )
            ) : favorites.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="heart-outline" size={48} color={theme.colors.outline} />
                <Text style={styles.emptyText}>No favorites yet</Text>
                <Text style={styles.emptySubtext}>Save listings you like to find them easily</Text>
              </View>
            ) : (
              favorites.map(renderListingItem)
            )}
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.elevation.level1,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.outlineVariant,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  listingsContainer: {
    backgroundColor: theme.colors.surface,
    minHeight: 200,
  },
  listingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  listingImage: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.sm,
  },
  listingImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  listingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  statusBadge: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  statusBadgeSold: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  statusText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  statusTextSold: {
    color: theme.colors.secondary,
  },
  listingViews: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  emptyTab: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  postButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.md,
  },
  postButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '500',
  },
  loader: {
    padding: theme.spacing.xl,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  loginButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
});
