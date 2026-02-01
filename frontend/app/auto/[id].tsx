import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
  Share,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { AutoListing } from '../../src/types/auto';
import { api } from '../../src/utils/api';
import { ImageViewerModal } from '../../src/components/auto/ImageViewerModal';

const { width } = Dimensions.get('window');

export default function AutoListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<AutoListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/auto/listings/${id}`);
      setListing(response.data);
    } catch (err: any) {
      console.error('Error fetching listing:', err);
      setError(err.response?.data?.detail || 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat('de-DE').format(mileage) + ' km';
  };

  const handleToggleFavorite = async () => {
    if (!listing) return;
    
    const wasiFavorited = isFavorited;
    setIsFavorited(!isFavorited); // Optimistic update
    
    try {
      if (wasiFavorited) {
        await api.delete(`/auto/favorites/${listing.id}`);
      } else {
        await api.post(`/auto/favorites/${listing.id}`);
        Alert.alert('Saved!', 'This listing has been added to your favorites.');
      }
    } catch (error: any) {
      setIsFavorited(wasiFavorited); // Revert on error
      if (error.response?.status === 401) {
        Alert.alert('Login Required', 'Please login to save favorites.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') },
        ]);
      } else {
        console.error('Error toggling favorite:', error);
      }
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out this ${listing.title} for ${formatPrice(listing.price)}!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCall = () => {
    if (!listing) return;
    const phone = listing.seller?.phone || '+4912345678';
    Linking.openURL(`tel:${phone}`);
  };

  const handleChat = async () => {
    if (!listing) return;
    
    Alert.alert(
      'Start Conversation',
      `Send a message to ${listing.seller?.name} about this ${listing.make} ${listing.model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Chat',
          onPress: async () => {
            try {
              // Create a new conversation
              const response = await api.post('/auto/conversations', {
                listing_id: listing.id,
                message: `Hi, I'm interested in your ${listing.title} listed for ${formatPrice(listing.price)}. Is it still available?`,
              });
              
              // Navigate to auto chat screen
              router.push({
                pathname: '/auto/chat/[id]',
                params: { 
                  id: response.data.id,
                  title: listing.seller?.name || 'Chat',
                  listingId: listing.id,
                }
              });
            } catch (err) {
              console.error('Error creating conversation:', err);
              Alert.alert('Error', 'Failed to start conversation. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleWhatsApp = () => {
    if (!listing) return;
    const phone = listing.seller?.phone?.replace(/[^0-9]/g, '') || '4912345678';
    const message = encodeURIComponent(
      `Hi, I'm interested in your "${listing.title}" listed for ${formatPrice(listing.price)}. Is it still available?`
    );
    Linking.openURL(`https://wa.me/${phone}?text=${message}`);
  };

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading listing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="car-outline" size={64} color={theme.colors.outline} />
          <Text style={styles.errorText}>{error || 'Listing not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchListing}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const SpecItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={styles.specItem}>
      <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
      <View>
        <Text style={styles.specLabel}>{label}</Text>
        <Text style={styles.specValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggleFavorite}
            style={styles.headerButton}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorited ? theme.colors.error : theme.colors.onSurface}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <TouchableOpacity 
          style={styles.imageGallery}
          activeOpacity={0.9}
          onPress={() => openImageViewer(currentImageIndex)}
        >
          <FlatList
            data={listing.images || []}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => openImageViewer(index)}
              >
                <Image source={{ uri: item }} style={styles.mainImage} resizeMode="cover" />
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
            ListEmptyComponent={
              <View style={[styles.mainImage, styles.placeholderImage]}>
                <Ionicons name="car" size={64} color={theme.colors.outline} />
              </View>
            }
          />
          
          {/* Tap to zoom hint */}
          <View style={styles.zoomHint}>
            <Ionicons name="expand" size={16} color="#fff" />
            <Text style={styles.zoomHintText}>Tap to zoom</Text>
          </View>
          
          {listing.images && listing.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {listing.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageIndicator,
                    currentImageIndex === index && styles.imageIndicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
          
          {/* Badges */}
          <View style={styles.badgeContainer}>
            {listing.featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={14} color="#fff" />
                <Text style={styles.badgeText}>Featured</Text>
              </View>
            )}
            {listing.boosted && (
              <View style={styles.boostedBadge}>
                <Ionicons name="rocket" size={14} color="#fff" />
                <Text style={styles.badgeText}>Boosted</Text>
              </View>
            )}
          </View>
          
          {/* Image count */}
          {listing.images && listing.images.length > 0 && (
            <View style={styles.imageCountBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
              <Text style={styles.imageCountText}>{listing.images.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Price & Title */}
        <View style={styles.mainInfo}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            {listing.negotiable && (
              <View style={styles.negotiableBadge}>
                <Text style={styles.negotiableText}>Negotiable</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.location}>
              {listing.city} • {listing.distance} km away
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.statText}>{listing.views} views</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.statText}>{listing.favorites_count} favorites</Text>
            </View>
          </View>
        </View>

        {/* Key Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          <View style={styles.specsGrid}>
            <SpecItem icon="calendar-outline" label="Year" value={listing.year?.toString() || 'N/A'} />
            <SpecItem icon="speedometer-outline" label="Mileage" value={formatMileage(listing.mileage || 0)} />
            <SpecItem icon="flash-outline" label="Fuel" value={listing.fuelType || 'N/A'} />
            <SpecItem icon="cog-outline" label="Transmission" value={listing.transmission || 'N/A'} />
            <SpecItem icon="car-outline" label="Body Type" value={listing.bodyType || 'N/A'} />
            <SpecItem icon="checkmark-circle-outline" label="Condition" value={listing.condition === 'new' ? 'New' : 'Used'} />
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features & Trust</Text>
          <View style={styles.featuresGrid}>
            {listing.accidentFree && (
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Accident Free</Text>
              </View>
            )}
            {listing.inspectionAvailable && (
              <View style={styles.featureItem}>
                <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Inspection Available</Text>
              </View>
            )}
            {listing.exchangePossible && (
              <View style={styles.featureItem}>
                <Ionicons name="repeat" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Exchange Possible</Text>
              </View>
            )}
            {listing.financingAvailable && (
              <View style={styles.featureItem}>
                <Ionicons name="card" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Financing Available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Seller Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Ionicons name="person" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>{listing.seller?.name}</Text>
                {listing.seller?.verified && (
                  <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
                )}
              </View>
              <View style={styles.sellerBadges}>
                {listing.seller?.sellerType === 'dealer' && (
                  <View style={styles.dealerBadge}>
                    <Text style={styles.dealerBadgeText}>Dealer</Text>
                  </View>
                )}
                {listing.seller?.sellerType === 'certified' && (
                  <View style={styles.certifiedBadge}>
                    <Ionicons name="ribbon" size={12} color="#fff" />
                    <Text style={styles.certifiedBadgeText}>Certified</Text>
                  </View>
                )}
              </View>
              <View style={styles.sellerRating}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.ratingText}>{listing.seller?.rating} rating</Text>
              </View>
              <Text style={styles.memberSince}>
                Member since {listing.seller?.memberSince?.split('-')[0]}
              </Text>
            </View>
          </View>
        </View>

        {/* Safety Tips */}
        <View style={styles.safetySection}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
            <Text style={styles.safetyTitle}>Safety Tips</Text>
          </View>
          <Text style={styles.safetyText}>
            • Meet in a public place{'\n'}
            • Verify vehicle documents{'\n'}
            • Get a professional inspection{'\n'}
            • Use secure payment methods
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <Ionicons name="call" size={20} color={theme.colors.primary} />
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Ionicons name="chatbubble" size={20} color="#fff" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={showImageViewer}
        images={listing.images || []}
        initialIndex={selectedImageIndex}
        onClose={() => setShowImageViewer(false)}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  headerButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  imageGallery: {
    position: 'relative',
    height: 280,
    backgroundColor: theme.colors.surfaceVariant,
  },
  mainImage: {
    width: width,
    height: 280,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
  },
  zoomHint: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  zoomHintText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: theme.spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imageIndicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  badgeContainer: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  boostedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageCountBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  mainInfo: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  negotiableBadge: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  negotiableText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  location: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  section: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  specLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  featureText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sellerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sellerBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dealerBadge: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealerBadgeText: {
    fontSize: 11,
    color: theme.colors.onSecondaryContainer,
    fontWeight: '600',
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  certifiedBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  memberSince: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  safetySection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primaryContainer,
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  safetyText: {
    fontSize: 13,
    color: theme.colors.onPrimaryContainer,
    lineHeight: 20,
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    gap: theme.spacing.sm,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  chatButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  whatsappButton: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#25D366',
  },
});
