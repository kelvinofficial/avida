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
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { favoritesApi } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { useResponsive } from '../../src/hooks/useResponsive';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

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
const SkeletonCard = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.skeletonCard, isDesktop && desktopStyles.skeletonCard]}>
    <View style={[styles.skeletonImage, isDesktop && desktopStyles.skeletonImage]} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '60%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
    </View>
  </View>
);

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return '';
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

// Listing Card
const ListingCard = ({ 
  item, 
  onPress, 
  onRemove,
  isDesktop,
}: { 
  item: any; 
  onPress: () => void; 
  onRemove: () => void;
  isDesktop?: boolean;
}) => {
  return (
    <TouchableOpacity 
      style={[styles.card, isDesktop && desktopStyles.card, Platform.OS === 'web' && { cursor: 'pointer' } as any]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.cardImageContainer, isDesktop && desktopStyles.cardImageContainer]}>
        <Image
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
          style={[styles.cardImage, isDesktop && desktopStyles.cardImage]}
        />
        {/* Badges - Just Listed, Featured & TOP */}
        <View style={styles.badgesContainer}>
          {isJustListed(item.created_at) && (
            <View style={styles.justListedBadge}>
              <Ionicons name="time" size={10} color="#fff" />
              <Text style={styles.badgeText}>Just Listed</Text>
            </View>
          )}
          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
          {item.is_top && (
            <View style={styles.topBadge}>
              <Ionicons name="arrow-up" size={10} color="#fff" />
              <Text style={styles.badgeText}>TOP</Text>
            </View>
          )}
        </View>
        {/* Heart Button */}
        <TouchableOpacity 
          style={[styles.heartBtn, isDesktop && desktopStyles.heartBtn]} 
          onPress={onRemove}
        >
          <Ionicons name="heart" size={isDesktop ? 22 : 20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
      <View style={[styles.cardContent, isDesktop && desktopStyles.cardContent]}>
        <Text style={[styles.cardPrice, isDesktop && desktopStyles.cardPrice]}>
          €{item.price?.toLocaleString()}
        </Text>
        <Text style={[styles.cardTitle, isDesktop && desktopStyles.cardTitle]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="location-outline" size={isDesktop ? 14 : 12} color={COLORS.textSecondary} />
          <Text style={[styles.cardLocation, isDesktop && desktopStyles.cardLocation]} numberOfLines={1}>
            {item.location?.city || item.location || 'Unknown'}
          </Text>
        </View>
        {/* Time Posted */}
        <Text style={[styles.timePosted, isDesktop && desktopStyles.timePosted]}>
          {formatTimeAgo(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Empty State for authenticated users with no items
const EmptyState = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.emptyContainer, isDesktop && desktopStyles.emptyContainer]}>
    <View style={[styles.emptyIcon, isDesktop && desktopStyles.emptyIcon]}>
      <Ionicons name="heart-outline" size={isDesktop ? 72 : 64} color={COLORS.textSecondary} />
    </View>
    <Text style={[styles.emptyTitle, isDesktop && desktopStyles.emptyTitle]}>No saved items</Text>
    <Text style={[styles.emptySubtitle, isDesktop && desktopStyles.emptySubtitle]}>
      Items you save will appear here. Tap the heart icon on any listing to save it.
    </Text>
  </View>
);

export default function SavedScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
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
                <TouchableOpacity style={desktopStyles.signInBtn} onPress={() => router.push('/login')}>
                  <Text style={desktopStyles.signInBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={desktopStyles.signUpBtn} onPress={() => router.push('/login')}>
                  <Text style={desktopStyles.signUpBtnText}>Sign Up</Text>
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
  const renderDesktopUnauthenticated = () => (
    <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
      {renderGlobalHeader()}
      
      <View style={desktopStyles.splitContainer}>
        {/* Left side - Promo */}
        <View style={desktopStyles.unauthLeftPanel}>
          <View style={desktopStyles.unauthPromoContent}>
            <View style={desktopStyles.unauthIconBgLarge}>
              <Ionicons name="heart" size={80} color={COLORS.error} />
            </View>
            <Text style={desktopStyles.unauthPromoTitle}>Your Saved Collection</Text>
            <Text style={desktopStyles.unauthPromoText}>
              Keep track of your favorite listings, get price alerts, and never miss a deal.
            </Text>
            
            {/* Features grid */}
            <View style={desktopStyles.featuresGrid}>
              <View style={desktopStyles.featureCard}>
                <View style={[desktopStyles.featureIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="bookmark" size={24} color={COLORS.error} />
                </View>
                <Text style={desktopStyles.featureTitle}>Save Unlimited</Text>
                <Text style={desktopStyles.featureDesc}>Keep all your favorites in one place</Text>
              </View>
              <View style={desktopStyles.featureCard}>
                <View style={[desktopStyles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="sync" size={24} color="#1976D2" />
                </View>
                <Text style={desktopStyles.featureTitle}>Sync Devices</Text>
                <Text style={desktopStyles.featureDesc}>Access anywhere, anytime</Text>
              </View>
              <View style={desktopStyles.featureCard}>
                <View style={[desktopStyles.featureIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="notifications" size={24} color={COLORS.primary} />
                </View>
                <Text style={desktopStyles.featureTitle}>Price Alerts</Text>
                <Text style={desktopStyles.featureDesc}>Get notified on price drops</Text>
              </View>
              <View style={desktopStyles.featureCard}>
                <View style={[desktopStyles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="trending-down" size={24} color="#F57C00" />
                </View>
                <Text style={desktopStyles.featureTitle}>Track Deals</Text>
                <Text style={desktopStyles.featureDesc}>Monitor price history</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right side - Sign in form */}
        <View style={desktopStyles.unauthRightPanel}>
          <View style={desktopStyles.unauthFormCard}>
            <Text style={desktopStyles.unauthFormTitle}>Sign in to Saved</Text>
            <Text style={desktopStyles.unauthFormSubtitle}>
              Access your saved items and start building your collection
            </Text>

            <TouchableOpacity 
              style={desktopStyles.unauthPrimaryBtn} 
              onPress={() => router.push('/login')}
            >
              <Ionicons name="log-in-outline" size={22} color="#fff" />
              <Text style={desktopStyles.unauthPrimaryBtnText}>Sign In</Text>
            </TouchableOpacity>

            <View style={desktopStyles.unauthDivider}>
              <View style={desktopStyles.unauthDividerLine} />
              <Text style={desktopStyles.unauthDividerText}>or</Text>
              <View style={desktopStyles.unauthDividerLine} />
            </View>

            <TouchableOpacity 
              style={desktopStyles.unauthSecondaryBtn} 
              onPress={() => router.push('/register')}
            >
              <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
              <Text style={desktopStyles.unauthSecondaryBtnText}>Create New Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );

  // Desktop authenticated view with 3-column grid
  const renderDesktopAuthenticated = () => (
    <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
      {renderGlobalHeader()}
      
      <View style={desktopStyles.pageWrapper}>
        {/* Page Header */}
        <View style={desktopStyles.pageHeader}>
          <View style={desktopStyles.pageHeaderLeft}>
            <Text style={desktopStyles.pageTitle}>Saved Items</Text>
            {items.length > 0 && (
              <View style={desktopStyles.itemCountBadge}>
                <Text style={desktopStyles.itemCountText}>{items.length}</Text>
              </View>
            )}
          </View>
          {items.length > 0 && (
            <TouchableOpacity style={desktopStyles.browseMoreBtn} onPress={() => router.push('/')}>
              <Ionicons name="search-outline" size={18} color={COLORS.primary} />
              <Text style={desktopStyles.browseMoreBtnText}>Browse More</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View style={desktopStyles.gridContainer}>
            <View style={desktopStyles.grid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={desktopStyles.gridItem}>
                  <SkeletonCard isDesktop />
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
                  <ListingCard
                    item={item}
                    onPress={() => handlePress(item)}
                    onRemove={() => handleRemove(item)}
                    isDesktop
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );

  // Desktop Layout
  if (isLargeScreen) {
    if (!isAuthenticated) {
      return renderDesktopUnauthenticated();
    }
    return renderDesktopAuthenticated();
  }

  // Mobile Layout
  const renderMobileItem = ({ item, index }: { item: any; index: number }) => (
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
      ) : !isAuthenticated ? (
        <ScrollView 
          style={styles.unauthScrollView}
          contentContainerStyle={styles.unauthContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Illustration */}
          <View style={styles.unauthIllustration}>
            <View style={styles.unauthIconBg}>
              <Ionicons name="heart" size={48} color={COLORS.error} />
            </View>
            <View style={[styles.floatingHeart, styles.floatingHeart1]}>
              <Ionicons name="heart" size={16} color={COLORS.error} />
            </View>
            <View style={[styles.floatingHeart, styles.floatingHeart2]}>
              <Ionicons name="heart-outline" size={14} color={COLORS.primary} />
            </View>
          </View>

          <Text style={styles.unauthTitle}>Save Your Favorites</Text>
          <Text style={styles.unauthSubtitle}>
            Sign in to save items you love and access them anytime, anywhere
          </Text>

          {/* Benefits */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="bookmark" size={18} color={COLORS.error} />
              </View>
              <Text style={styles.benefitText}>Save unlimited items</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="sync" size={18} color="#1976D2" />
              </View>
              <Text style={styles.benefitText}>Sync across all devices</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="notifications" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.benefitText}>Get price drop alerts</Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity style={styles.unauthSignInBtn} onPress={() => router.push('/login')}>
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.unauthSignInBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.unauthSignUpBtn} onPress={() => router.push('/register')}>
            <Text style={styles.unauthSignUpBtnText}>Create Account</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderMobileItem}
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
  cardImageContainer: {
    position: 'relative',
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.border,
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: '70%',
  },
  justListedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
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
  timePosted: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
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
  // Unauthenticated State Styles
  unauthScrollView: { flex: 1 },
  unauthContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingBottom: 100,
  },
  unauthIllustration: { position: 'relative', marginBottom: 24 },
  unauthIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingHeart: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingHeart1: { top: -5, right: -10 },
  floatingHeart2: { bottom: 10, left: -15 },
  unauthTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  benefitsList: { width: '100%', gap: 12, marginBottom: 28 },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  unauthSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  unauthSignInBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  unauthSignUpBtn: { paddingVertical: 14, paddingHorizontal: 48 },
  unauthSignUpBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
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
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  signInBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  signUpBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
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
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  itemCountBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemCountText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  browseMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  browseMoreBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  
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
  
  // Desktop Card Styles
  card: {
    borderRadius: 16,
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
  cardImage: { height: 180 },
  heartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    top: 10,
    right: 10,
  },
  cardContent: { padding: 14 },
  cardPrice: { fontSize: 18 },
  cardTitle: { fontSize: 15, lineHeight: 20 },
  cardLocation: { fontSize: 13 },
  timePosted: { fontSize: 11, marginTop: 6 },
  
  // Skeleton
  skeletonCard: { borderRadius: 16 },
  skeletonImage: { height: 180 },
  
  // Empty State
  emptyContainer: { paddingVertical: 80 },
  emptyIcon: { width: 140, height: 140, borderRadius: 70, marginBottom: 28 },
  emptyTitle: { fontSize: 24 },
  emptySubtitle: { fontSize: 16, maxWidth: 400 },
  
  // Unauthenticated Desktop
  splitContainer: { flex: 1, flexDirection: 'row' },
  unauthLeftPanel: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  unauthPromoContent: { maxWidth: 500, alignItems: 'center' },
  unauthIconBgLarge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  unauthPromoTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  unauthPromoText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  featureCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  featureDesc: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  unauthRightPanel: {
    width: 480,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  unauthFormCard: { width: '100%', maxWidth: 360, alignItems: 'center' },
  unauthFormTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthFormSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  unauthPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 10,
    width: '100%',
  },
  unauthPrimaryBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  unauthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  unauthDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  unauthDividerText: { paddingHorizontal: 16, fontSize: 13, color: COLORS.textMuted },
  unauthSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unauthSecondaryBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
});
