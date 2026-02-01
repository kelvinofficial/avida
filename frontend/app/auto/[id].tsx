import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Linking,
  Share,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/utils/api';
import { AutoListing } from '../../src/types/auto';
import { ImageViewerModal } from '../../src/components/auto/ImageViewerModal';
import SimilarListings from '../../src/components/property/SimilarListings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#F57C00',
  verified: '#1565C0',
  gold: '#FFB800',
};

// Generate highlights from listing data
const generateHighlights = (listing: AutoListing) => {
  const highlights: { id: string; icon: string; label: string }[] = [];
  
  if (listing.condition === 'new') {
    highlights.push({ id: 'new', icon: 'sparkles', label: 'Brand New' });
  }
  if (listing.accidentFree) {
    highlights.push({ id: 'accident_free', icon: 'shield-checkmark', label: 'Accident Free' });
  }
  if (listing.inspectionAvailable) {
    highlights.push({ id: 'inspection', icon: 'document-text', label: 'Inspection Report' });
  }
  if (listing.financingAvailable) {
    highlights.push({ id: 'financing', icon: 'card', label: 'Financing Available' });
  }
  if (listing.exchangePossible) {
    highlights.push({ id: 'exchange', icon: 'repeat', label: 'Exchange OK' });
  }
  if (listing.seller?.verified) {
    highlights.push({ id: 'verified', icon: 'checkmark-circle', label: 'Verified Seller' });
  }
  
  return highlights.slice(0, 6);
};

// ============ IMAGE CAROUSEL ============
const ImageCarousel = memo(({ 
  images, 
  onImagePress, 
  badges 
}: { 
  images: string[]; 
  onImagePress: (index: number) => void; 
  badges: { featured?: boolean; boosted?: boolean };
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <View style={carouselStyles.container}>
      <FlatList
        data={images.length > 0 ? images : ['placeholder']}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        renderItem={({ item, index }) => (
          <TouchableOpacity activeOpacity={0.95} onPress={() => onImagePress(index)}>
            {item === 'placeholder' ? (
              <View style={[carouselStyles.image, carouselStyles.placeholder]}>
                <Ionicons name="car" size={64} color={COLORS.textSecondary} />
              </View>
            ) : (
              <Image source={{ uri: item }} style={carouselStyles.image} resizeMode="cover" />
            )}
          </TouchableOpacity>
        )}
        keyExtractor={(_, index) => index.toString()}
      />
      
      {/* Badges */}
      <View style={carouselStyles.badgeRow}>
        {badges.featured && (
          <View style={[carouselStyles.badge, { backgroundColor: COLORS.gold }]}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={carouselStyles.badgeText}>Featured</Text>
          </View>
        )}
        {badges.boosted && (
          <View style={[carouselStyles.badge, { backgroundColor: COLORS.primary }]}>
            <Ionicons name="rocket" size={12} color="#fff" />
            <Text style={carouselStyles.badgeText}>Boosted</Text>
          </View>
        )}
      </View>
      
      {/* Image Count */}
      {images.length > 0 && (
        <View style={carouselStyles.imageCount}>
          <Ionicons name="camera" size={14} color="#fff" />
          <Text style={carouselStyles.imageCountText}>{currentIndex + 1}/{images.length}</Text>
        </View>
      )}
      
      {/* Zoom Hint */}
      <View style={carouselStyles.zoomHint}>
        <Ionicons name="expand" size={14} color="#fff" />
        <Text style={carouselStyles.zoomHintText}>Tap to zoom</Text>
      </View>
      
      {/* Indicators */}
      {images.length > 1 && (
        <View style={carouselStyles.indicators}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[carouselStyles.indicator, currentIndex === index && carouselStyles.indicatorActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const carouselStyles = StyleSheet.create({
  container: { position: 'relative', height: 280, backgroundColor: COLORS.background },
  image: { width: SCREEN_WIDTH, height: 280 },
  placeholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  badgeRow: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  imageCount: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  imageCountText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  zoomHint: { position: 'absolute', bottom: 40, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  zoomHintText: { fontSize: 11, color: '#fff' },
  indicators: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  indicatorActive: { backgroundColor: '#fff', width: 20 },
});

// ============ HIGHLIGHTS SECTION ============
const HighlightsSection = memo(({ highlights }: { highlights: { id: string; icon: string; label: string }[] }) => {
  if (highlights.length === 0) return null;
  
  return (
    <View style={highlightStyles.container}>
      <Text style={highlightStyles.title}>Vehicle Highlights</Text>
      <View style={highlightStyles.grid}>
        {highlights.map((item) => (
          <View key={item.id} style={highlightStyles.item}>
            <View style={highlightStyles.iconContainer}>
              <Ionicons name={item.icon as any} size={18} color={COLORS.primary} />
            </View>
            <Text style={highlightStyles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const highlightStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, padding: HORIZONTAL_PADDING, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  iconContainer: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
});

// ============ KEY DETAILS SECTION ============
const KeyDetailsSection = memo(({ listing }: { listing: AutoListing }) => {
  const formatMileage = (mileage: number) => new Intl.NumberFormat('de-DE').format(mileage) + ' km';
  
  const details = [
    { label: 'Make', value: listing.make, icon: 'car-sport-outline' },
    { label: 'Model', value: listing.model, icon: 'car-outline' },
    { label: 'Year', value: listing.year?.toString(), icon: 'calendar-outline' },
    { label: 'Mileage', value: formatMileage(listing.mileage || 0), icon: 'speedometer-outline' },
    { label: 'Fuel Type', value: listing.fuelType, icon: 'flash-outline' },
    { label: 'Transmission', value: listing.transmission, icon: 'cog-outline' },
    { label: 'Body Type', value: listing.bodyType, icon: 'cube-outline' },
    { label: 'Condition', value: listing.condition === 'new' ? 'New' : 'Used', icon: 'checkmark-circle-outline' },
    { label: 'Color', value: listing.color || 'Not specified', icon: 'color-palette-outline' },
    { label: 'Doors', value: listing.doors?.toString() || 'N/A', icon: 'enter-outline' },
  ].filter(d => d.value);

  return (
    <View style={detailStyles.container}>
      <Text style={detailStyles.title}>Vehicle Details</Text>
      <View style={detailStyles.grid}>
        {details.map((item, index) => (
          <View key={index} style={detailStyles.item}>
            <View style={detailStyles.iconBox}>
              <Ionicons name={item.icon as any} size={18} color={COLORS.primary} />
            </View>
            <View style={detailStyles.textBox}>
              <Text style={detailStyles.label}>{item.label}</Text>
              <Text style={detailStyles.value}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const detailStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, padding: HORIZONTAL_PADDING, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingRight: 8 },
  iconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  textBox: { flex: 1 },
  label: { fontSize: 11, color: COLORS.textSecondary },
  value: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 1 },
});

// ============ DESCRIPTION SECTION ============
const DescriptionSection = memo(({ description }: { description: string }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > 200;

  return (
    <View style={descStyles.container}>
      <Text style={descStyles.title}>Description</Text>
      <Text style={descStyles.text} numberOfLines={expanded ? undefined : 4}>
        {description}
      </Text>
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={descStyles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const descStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, padding: HORIZONTAL_PADDING, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  text: { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary },
  readMore: { marginTop: 8, fontSize: 14, fontWeight: '600', color: COLORS.primary },
});

// ============ SELLER SECTION ============
const SellerSection = memo(({ listing }: { listing: AutoListing }) => (
  <View style={sellerStyles.container}>
    <Text style={sellerStyles.title}>Listed by</Text>
    <View style={sellerStyles.card}>
      <View style={sellerStyles.avatar}>
        <Ionicons name="person" size={28} color={COLORS.primary} />
      </View>
      <View style={sellerStyles.info}>
        <View style={sellerStyles.nameRow}>
          <Text style={sellerStyles.name}>{listing.seller?.name || 'Private Seller'}</Text>
          {listing.seller?.verified && (
            <View style={sellerStyles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={sellerStyles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        <View style={sellerStyles.badges}>
          {listing.seller?.sellerType === 'dealer' && (
            <View style={[sellerStyles.typeBadge, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[sellerStyles.typeBadgeText, { color: COLORS.verified }]}>Dealer</Text>
            </View>
          )}
          {listing.seller?.sellerType === 'certified' && (
            <View style={[sellerStyles.typeBadge, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="ribbon" size={12} color={COLORS.primary} />
              <Text style={[sellerStyles.typeBadgeText, { color: COLORS.primary }]}>Certified</Text>
            </View>
          )}
        </View>
        {listing.seller?.rating && (
          <View style={sellerStyles.ratingRow}>
            <Ionicons name="star" size={14} color={COLORS.gold} />
            <Text style={sellerStyles.rating}>{listing.seller.rating}</Text>
            <Text style={sellerStyles.ratingLabel}>rating</Text>
          </View>
        )}
        <Text style={sellerStyles.memberSince}>
          Member since {listing.seller?.memberSince?.split('-')[0] || '2023'}
        </Text>
      </View>
    </View>
  </View>
));

const sellerStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, padding: HORIZONTAL_PADDING, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  card: { flexDirection: 'row', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  verifiedText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  badges: { flexDirection: 'row', gap: 8, marginTop: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  rating: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  ratingLabel: { fontSize: 13, color: COLORS.textSecondary },
  memberSince: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});

// ============ SAFETY SECTION ============
const SafetySection = memo(() => (
  <View style={safetyStyles.container}>
    <View style={safetyStyles.header}>
      <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
      <Text style={safetyStyles.title}>Safety Tips</Text>
    </View>
    <View style={safetyStyles.tips}>
      <View style={safetyStyles.tip}>
        <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
        <Text style={safetyStyles.tipText}>Meet in a public place</Text>
      </View>
      <View style={safetyStyles.tip}>
        <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
        <Text style={safetyStyles.tipText}>Verify vehicle documents</Text>
      </View>
      <View style={safetyStyles.tip}>
        <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
        <Text style={safetyStyles.tipText}>Get a professional inspection</Text>
      </View>
      <View style={safetyStyles.tip}>
        <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
        <Text style={safetyStyles.tipText}>Use secure payment methods</Text>
      </View>
    </View>
    <TouchableOpacity style={safetyStyles.reportBtn}>
      <Ionicons name="flag-outline" size={16} color={COLORS.error} />
      <Text style={safetyStyles.reportText}>Report this listing</Text>
    </TouchableOpacity>
  </View>
));

const safetyStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, padding: HORIZONTAL_PADDING, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  tips: { gap: 8 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipText: { fontSize: 13, color: COLORS.textSecondary },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.error },
  reportText: { fontSize: 14, fontWeight: '600', color: COLORS.error },
});

// ============ MAIN SCREEN ============
export default function AutoListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<AutoListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const fetchListing = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    if (id) fetchListing();
  }, [id, fetchListing]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(price);
  };

  const handleToggleFavorite = async () => {
    if (!listing) return;
    const wasFavorited = isFavorited;
    setIsFavorited(!isFavorited);
    
    try {
      if (wasFavorited) await api.delete(`/auto/favorites/${listing.id}`);
      else await api.post(`/auto/favorites/${listing.id}`);
    } catch (error: any) {
      setIsFavorited(wasFavorited);
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({ message: `Check out this ${listing.title} for ${formatPrice(listing.price)}!` });
    } catch (error) {}
  };

  const handleCall = () => {
    if (!listing) return;
    Linking.openURL(`tel:${listing.seller?.phone || '+4912345678'}`);
  };

  const handleChat = async () => {
    if (!listing) return;
    try {
      const response = await api.post('/auto/conversations', {
        listing_id: listing.id,
        message: `Hi, I'm interested in your ${listing.title} listed for ${formatPrice(listing.price)}. Is it still available?`,
      });
      router.push({ pathname: '/auto/chat/[id]', params: { id: response.data.id, title: listing.seller?.name || 'Chat', listingId: listing.id } });
    } catch (err) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const handleWhatsApp = () => {
    if (!listing) return;
    const phone = listing.seller?.phone?.replace(/[^0-9]/g, '') || '4912345678';
    const message = encodeURIComponent(`Hi, I'm interested in your "${listing.title}" listed for ${formatPrice(listing.price)}. Is it still available?`);
    Linking.openURL(`https://wa.me/${phone}?text=${message}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading vehicle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Ionicons name="car-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loadingText}>{error || 'Listing not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const highlights = generateHighlights(listing);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <ImageCarousel
          images={listing.images || []}
          onImagePress={(index) => { setSelectedImageIndex(index); setShowImageViewer(true); }}
          badges={{ featured: listing.featured, boosted: listing.boosted }}
        />

        {/* Header Actions (floating) */}
        <View style={styles.floatingHeader}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={handleToggleFavorite}>
              <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={22} color={isFavorited ? COLORS.error : COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Price & Title */}
        <View style={styles.mainInfo}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            {listing.negotiable && <Text style={styles.negotiable}>Negotiable</Text>}
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.location}>{listing.city} • {listing.distance || 0} km away</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{listing.views || 0} views</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{listing.favorites_count || 0} saves</Text>
            </View>
          </View>
        </View>

        {/* Highlights */}
        <HighlightsSection highlights={highlights} />

        {/* Key Details */}
        <KeyDetailsSection listing={listing} />

        {/* Description */}
        {listing.description && <DescriptionSection description={listing.description} />}

        {/* Seller */}
        <SellerSection listing={listing} />

        {/* Safety */}
        <SafetySection />

        {/* Similar Listings - Two column layout for auto category */}
        <SimilarListings propertyId={listing.id} category="other" />

        {/* Spacer for bottom actions */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleChat}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff' }]}>WhatsApp</Text>
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
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  mainInfo: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.primary,
  },
  negotiable: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 6,
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  location: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
