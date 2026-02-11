import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/services/api';
import { useResponsive } from '../src/hooks/useResponsive';
import { DesktopHeader } from '../src/components/layout';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  star: '#FFB800',
};

interface Business {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  logo_url?: string;
  cover_url?: string;
  category: string;
  location: string;
  rating: number;
  review_count: number;
  listings_count: number;
  is_verified: boolean;
  is_featured: boolean;
  created_at: string;
}

export default function BusinessDirectoryScreen() {
  const router = useRouter();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const { width } = useWindowDimensions();
  const isLargeScreen = isDesktop || isTablet;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    'All',
    'Electronics',
    'Fashion',
    'Home & Garden',
    'Vehicles',
    'Real Estate',
    'Services',
    'Other'
  ];

  const fetchBusinesses = useCallback(async () => {
    try {
      const params: any = { limit: 50 };
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      
      const res = await api.get('/business/directory', { params });
      setBusinesses(res.data.businesses || []);
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
      // Fallback to mock data if API doesn't exist
      setBusinesses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBusinesses();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
          size={14}
          color={COLORS.star}
        />
      );
    }
    return stars;
  };

  const renderBusinessCard = ({ item: business }: { item: Business }) => (
    <TouchableOpacity
      style={[styles.businessCard, isLargeScreen && styles.businessCardDesktop]}
      onPress={() => router.push(`/business/${business.id}`)}
      activeOpacity={0.7}
    >
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {business.cover_url ? (
          <Image source={{ uri: business.cover_url }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder]}>
            <Ionicons name="storefront" size={32} color={COLORS.textLight} />
          </View>
        )}
        {business.is_featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
      </View>

      {/* Business Info */}
      <View style={styles.businessInfo}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          {business.logo_url ? (
            <Image source={{ uri: business.logo_url }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder]}>
              <Text style={styles.logoInitial}>{business.business_name.charAt(0)}</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.businessDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.businessName} numberOfLines={1}>{business.business_name}</Text>
            {business.is_verified && (
              <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
            )}
          </View>
          
          <Text style={styles.category}>{business.category}</Text>
          
          <View style={styles.ratingRow}>
            <View style={styles.stars}>{renderStars(business.rating)}</View>
            <Text style={styles.ratingText}>
              {business.rating.toFixed(1)} ({business.review_count} reviews)
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.statText} numberOfLines={1}>{business.location || 'Location not set'}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="pricetags-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{business.listings_count} listings</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const content = (
    <>
      {/* Search Bar */}
      <View style={[styles.searchContainer, isLargeScreen && styles.searchContainerDesktop]}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={[styles.categoriesContent, isLargeScreen && styles.categoriesContentDesktop]}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              (selectedCategory === cat || (!selectedCategory && cat === 'All')) && styles.categoryChipActive
            ]}
            onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
          >
            <Text style={[
              styles.categoryChipText,
              (selectedCategory === cat || (!selectedCategory && cat === 'All')) && styles.categoryChipTextActive
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Business List */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : businesses.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No businesses found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery || selectedCategory
              ? 'Try adjusting your search or filters'
              : 'Be the first to create a business profile!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={businesses}
          renderItem={renderBusinessCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, isLargeScreen && styles.listContentDesktop]}
          numColumns={isLargeScreen ? 2 : 1}
          key={isLargeScreen ? 'desktop' : 'mobile'}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );

  // Desktop Layout
  if (isLargeScreen) {
    return (
      <View style={styles.container}>
        <DesktopHeader />
        <View style={styles.desktopWrapper}>
          <View style={styles.desktopContent}>
            {/* Page Header */}
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Business Directory</Text>
              <Text style={styles.pageSubtitle}>Discover trusted sellers and businesses</Text>
            </View>
            {content}
          </View>
        </View>
      </View>
    );
  }

  // Mobile Layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Mobile Header */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>Business Directory</Text>
        <View style={{ width: 40 }} />
      </View>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  // Mobile Header
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Desktop
  desktopWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  desktopContent: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 24,
    flex: 1,
  },
  pageHeader: {
    paddingVertical: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainerDesktop: {
    paddingHorizontal: 0,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },

  // Categories
  categoriesScroll: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoriesContentDesktop: {
    paddingHorizontal: 0,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
  },

  // List
  listContent: {
    padding: 16,
    gap: 16,
  },
  listContentDesktop: {
    padding: 0,
    paddingTop: 16,
  },

  // Business Card
  businessCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  businessCardDesktop: {
    flex: 1,
    marginHorizontal: 8,
    maxWidth: 'calc(50% - 16px)',
  },
  coverContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 120,
  },
  coverPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  businessInfo: {
    flexDirection: 'row',
    padding: 16,
  },
  logoContainer: {
    marginRight: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  logoPlaceholder: {
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  businessDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  category: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
