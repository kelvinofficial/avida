import React, { useEffect, useState, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, CATEGORY_COLORS, CATEGORY_ICON_COLORS } from '../../src/utils/theme';
import { listingsApi, favoritesApi, conversationsApi, reportsApi, categoriesApi } from '../../src/utils/api';
import { Listing, Category } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { formatDistanceToNow, format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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
      
      // Fetch category details
      try {
        const catData = await categoriesApi.getOne(data.category_id);
        setCategory(catData);
      } catch (e) {}
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
        message: `Check out: ${listing?.title} - €${listing?.price}\n\nOn LocalMarket`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReport = async (reason: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    try {
      await reportsApi.create({
        listing_id: id!,
        reason,
        description: `Reported listing: ${listing?.title}`,
      });
      setShowReportModal(false);
      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Error reporting:', error);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
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

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'MMM d, yyyy');
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
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.outline} />
          <Text style={styles.errorText}>Listing not found</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
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

  const categoryColor = CATEGORY_COLORS[listing.category_id] || theme.colors.surfaceVariant;
  const categoryIconColor = CATEGORY_ICON_COLORS[listing.category_id] || theme.colors.primary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
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
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <TouchableOpacity 
          style={styles.imageContainer}
          activeOpacity={0.95}
          onPress={() => setShowImageViewer(true)}
        >
          {imageSource ? (
            <Image source={imageSource} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={64} color={theme.colors.outline} />
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
          
          {/* Image counter */}
          {images.length > 0 && (
            <View style={styles.imageCounter}>
              <Ionicons name="camera" size={14} color="#fff" />
              <Text style={styles.imageCounterText}>{currentImageIndex + 1}/{images.length}</Text>
            </View>
          )}
          
          {/* Featured badge */}
          {listing.featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>TOP</Text>
            </View>
          )}

          {/* Navigation dots */}
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
        </TouchableOpacity>

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

        {/* Price Section */}
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            {listing.negotiable && (
              <View style={styles.negotiableBadge}>
                <Text style={styles.negotiableText}>Negotiable</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          
          {/* Meta info */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={16} color={theme.colors.primary} />
              <Text style={styles.metaText}>{listing.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.metaText}>{getTimeAgo(listing.created_at)}</Text>
            </View>
          </View>
          
          {/* Stats */}
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

        {/* Category & Condition */}
        <View style={styles.section}>
          <View style={styles.categoryConditionRow}>
            {category && (
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                <Ionicons name={category.icon as any} size={16} color={categoryIconColor} />
                <Text style={[styles.categoryText, { color: categoryIconColor }]}>
                  {category.name.split('&')[0].trim()}
                </Text>
              </View>
            )}
            {listing.condition && (
              <View style={styles.conditionBadge}>
                <Text style={styles.conditionText}>{listing.condition}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Attributes */}
        {Object.keys(listing.attributes || {}).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.attributesGrid}>
              {Object.entries(listing.attributes).map(([key, value]) => (
                <View key={key} style={styles.attributeItem}>
                  <Text style={styles.attributeKey}>{key.replace(/_/g, ' ')}</Text>
                  <Text style={styles.attributeValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Seller Info */}
        {listing.seller && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <View style={styles.sellerCard}>
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
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.sellerMeta}>
                    Member since {new Date(listing.seller.created_at).getFullYear()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.reportButton} onPress={() => setShowReportModal(true)}>
                <Ionicons name="flag-outline" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Safety Tips */}
        <View style={styles.safetySection}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
            <Text style={styles.safetyTitle}>Safety Tips</Text>
          </View>
          <Text style={styles.safetyText}>
            • Meet in public places for transactions{'\n'}
            • Don't send money before seeing the item{'\n'}
            • Check the item thoroughly before paying
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Bottom Actions */}
      {listing.user_id !== user?.user_id && (
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={20} color={theme.colors.primary} />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
            <Ionicons name="chatbubble" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.chatButtonText}>Send Message</Text>
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
              'Offensive content',
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.md,
  },
  backLink: {
    marginTop: theme.spacing.md,
  },
  backLinkText: {
    color: theme.colors.primary,
    fontWeight: '600',
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
  imageCounter: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  featuredBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  pagination: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  thumbnails: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  thumbnail: {
    width: 60,
    height: 60,
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
    borderRadius: 6,
  },
  negotiableText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
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
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  section: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  categoryConditionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  conditionBadge: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  conditionText: {
    fontSize: 13,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  attributesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  attributeItem: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    minWidth: '45%',
  },
  attributeKey: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  attributeValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    flex: 1,
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
  verifiedBadge: {
    // badge styling
  },
  sellerMeta: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  reportButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safetySection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primaryContainer,
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  safetyText: {
    fontSize: 12,
    color: theme.colors.onPrimaryContainer,
    lineHeight: 20,
  },
  spacer: {
    height: 100,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    gap: theme.spacing.md,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    gap: theme.spacing.sm,
  },
  callButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  chatButton: {
    flex: 2,
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
    fontWeight: '700',
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
    color: theme.colors.error,
    fontWeight: '600',
    fontSize: 16,
  },
});
