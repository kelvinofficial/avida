import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { listingsApi, favoritesApi, conversationsApi, reportsApi } from '../../src/utils/api';
import { Listing } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    try {
      const data = await listingsApi.getOne(id!);
      setListing(data);
      setIsFavorited(data.is_favorited || false);
    } catch (error) {
      console.error('Error fetching listing:', error);
      Alert.alert('Error', 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      if (isFavorited) {
        await favoritesApi.remove(id!);
      } else {
        await favoritesApi.add(id!);
      }
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleChat = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (listing?.user_id === user?.user_id) {
      Alert.alert('Info', 'This is your own listing');
      return;
    }

    try {
      const conversation = await conversationsApi.create(id!);
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this listing: ${listing?.title} - $${listing?.price}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReport = async (reason: string) => {
    try {
      await reportsApi.create({
        listing_id: id!,
        reason,
        description: `Reported listing: ${listing?.title}`,
      });
      setShowReportModal(false);
      Alert.alert('Success', 'Report submitted. Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Error reporting:', error);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Listing not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const images = listing.images || [];
  const currentImage = images[currentImageIndex];
  const imageSource = currentImage
    ? currentImage.startsWith('data:')
      ? { uri: currentImage }
      : { uri: `data:image/jpeg;base64,${currentImage}` }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={toggleFavorite}>
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorited ? theme.colors.error : theme.colors.onSurface}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowReportModal(true)}>
            <Ionicons name="flag-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          {imageSource ? (
            <Image source={imageSource} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={64} color={theme.colors.outline} />
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
          
          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentImageIndex && styles.paginationDotActive,
                  ]}
                  onPress={() => setCurrentImageIndex(index)}
                />
              ))}
            </View>
          )}
          
          {listing.featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {images.length > 1 && (
          <ScrollView horizontal style={styles.thumbnails} showsHorizontalScrollIndicator={false}>
            {images.map((img, index) => {
              const thumbSource = img.startsWith('data:')
                ? { uri: img }
                : { uri: `data:image/jpeg;base64,${img}` };
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.thumbnail,
                    index === currentImageIndex && styles.thumbnailActive,
                  ]}
                  onPress={() => setCurrentImageIndex(index)}
                >
                  <Image source={thumbSource} style={styles.thumbnailImage} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Price and Title */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>
            {formatPrice(listing.price)}
            {listing.negotiable && <Text style={styles.negotiable}> VB</Text>}
          </Text>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.metaText}>{listing.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.metaText}>{getTimeAgo(listing.created_at)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.metaText}>{listing.views} views</Text>
            </View>
          </View>
        </View>

        {/* Condition */}
        {listing.condition && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Condition</Text>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{listing.condition}</Text>
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Attributes */}
        {Object.keys(listing.attributes || {}).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            {Object.entries(listing.attributes).map(([key, value]) => (
              <View key={key} style={styles.attributeRow}>
                <Text style={styles.attributeKey}>{key.replace(/_/g, ' ')}</Text>
                <Text style={styles.attributeValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Seller Info */}
        {listing.seller && (
          <TouchableOpacity
            style={styles.sellerCard}
            onPress={() => router.push(`/user/${listing.seller!.user_id}` as any)}
          >
            <View style={styles.sellerInfo}>
              {listing.seller.picture ? (
                <Image source={{ uri: listing.seller.picture }} style={styles.sellerAvatar} />
              ) : (
                <View style={styles.sellerAvatarPlaceholder}>
                  <Ionicons name="person" size={24} color={theme.colors.onSurfaceVariant} />
                </View>
              )}
              <View style={styles.sellerDetails}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{listing.seller.name}</Text>
                  {listing.seller.verified && (
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                  )}
                </View>
                <Text style={styles.sellerMeta}>
                  Member since {new Date(listing.seller.created_at).getFullYear()}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Bottom Actions */}
      {listing.user_id !== user?.user_id && (
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
            <Ionicons name="chatbubble" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.chatButtonText}>Chat with Seller</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Report Modal */}
      <Modal visible={showReportModal} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        >
          <View style={styles.reportModal}>
            <Text style={styles.reportTitle}>Report Listing</Text>
            <Text style={styles.reportSubtitle}>Why are you reporting this listing?</Text>
            
            {[
              'Spam or scam',
              'Prohibited item',
              'Wrong category',
              'Misleading information',
              'Other',
            ].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reportOption}
                onPress={() => handleReport(reason)}
              >
                <Text style={styles.reportOptionText}>{reason}</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowReportModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    ...theme.elevation.level1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: width,
    height: width * 0.75,
    backgroundColor: theme.colors.surfaceVariant,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.sm,
  },
  pagination: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    backgroundColor: theme.colors.primary,
    width: 24,
  },
  featuredBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  featuredText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  thumbnails: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: theme.colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  priceSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  negotiable: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.onSurfaceVariant,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
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
    marginBottom: theme.spacing.sm,
  },
  conditionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  conditionText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  attributeKey: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  attributeValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.sm,
  },
  sellerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerDetails: {
    marginLeft: theme.spacing.md,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sellerMeta: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  spacer: {
    height: 100,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  chatButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  reportModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxWidth: 360,
    padding: theme.spacing.lg,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  reportSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.md,
  },
  reportOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  reportOptionText: {
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  cancelButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
});
