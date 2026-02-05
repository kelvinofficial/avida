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
  Share,
  Modal,
  FlatList,
  ActivityIndicator,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { listingsApi, favoritesApi, conversationsApi, reportsApi, categoriesApi } from '../../src/utils/api';
import api from '../../src/utils/api';
import { Listing, Category } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { formatDistanceToNow } from 'date-fns';
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

// ============ IMAGE CAROUSEL ============
const ImageCarousel = memo(({ 
  images, 
  onImagePress, 
  featured 
}: { 
  images: string[]; 
  onImagePress: (index: number) => void; 
  featured?: boolean;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const getImageUri = (img: string) => {
    if (img.startsWith('data:') || img.startsWith('http')) return img;
    return `data:image/jpeg;base64,${img}`;
  };

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
                <Ionicons name="image-outline" size={64} color={COLORS.textSecondary} />
              </View>
            ) : (
              <Image source={{ uri: getImageUri(item) }} style={carouselStyles.image} resizeMode="cover" />
            )}
          </TouchableOpacity>
        )}
        keyExtractor={(_, index) => index.toString()}
      />
      
      {/* Featured Badge */}
      {featured && (
        <View style={carouselStyles.featuredBadge}>
          <Ionicons name="star" size={12} color="#fff" />
          <Text style={carouselStyles.featuredText}>Featured</Text>
        </View>
      )}
      
      {/* Image Count */}
      {images.length > 0 && (
        <View style={carouselStyles.imageCount}>
          <Ionicons name="camera" size={14} color="#fff" />
          <Text style={carouselStyles.imageCountText}>{currentIndex + 1}/{images.length}</Text>
        </View>
      )}
      
      {/* Tap to zoom */}
      <View style={carouselStyles.zoomHint}>
        <Ionicons name="expand" size={14} color="#fff" />
        <Text style={carouselStyles.zoomHintText}>Tap to zoom</Text>
      </View>
      
      {/* Indicators */}
      {images.length > 1 && (
        <View style={carouselStyles.indicators}>
          {images.map((_, index) => (
            <View key={index} style={[carouselStyles.indicator, currentIndex === index && carouselStyles.indicatorActive]} />
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
  featuredBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.gold, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  featuredText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  imageCount: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  imageCountText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  zoomHint: { position: 'absolute', bottom: 40, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  zoomHintText: { fontSize: 11, color: '#fff' },
  indicators: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  indicatorActive: { backgroundColor: '#fff', width: 20 },
});

// ============ KEY DETAILS SECTION ============
const KeyDetailsSection = memo(({ listing, category }: { listing: Listing; category: Category | null }) => {
  const attributes = listing.attributes || {};
  const details = Object.entries(attributes).map(([key, value]) => ({
    label: key.replace(/_/g, ' '),
    value: String(value),
  }));

  if (category) {
    details.unshift({ label: 'Category', value: category.name });
  }
  if (listing.condition) {
    details.push({ label: 'Condition', value: listing.condition });
  }

  if (details.length === 0) return null;

  return (
    <View style={detailStyles.container}>
      <Text style={detailStyles.title}>Details</Text>
      <View style={detailStyles.grid}>
        {details.map((item, index) => (
          <View key={index} style={detailStyles.item}>
            <View style={detailStyles.iconBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
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
  label: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'capitalize' },
  value: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 1 },
});

// ============ DESCRIPTION SECTION ============
const DescriptionSection = memo(({ description }: { description: string }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > 200;

  return (
    <View style={descStyles.container}>
      <Text style={descStyles.title}>Description</Text>
      <Text style={descStyles.text} numberOfLines={expanded ? undefined : 4}>{description}</Text>
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
const SellerSection = memo(({ listing, onPress }: { listing: Listing; onPress: () => void }) => {
  if (!listing.seller) return null;
  
  return (
    <View style={sellerStyles.container}>
      <Text style={sellerStyles.title}>Listed by</Text>
      <TouchableOpacity style={sellerStyles.card} onPress={onPress} activeOpacity={0.7}>
        {listing.seller.picture ? (
          <Image source={{ uri: listing.seller.picture }} style={sellerStyles.avatar} />
        ) : (
          <View style={sellerStyles.avatarPlaceholder}>
            <Ionicons name="person" size={28} color={COLORS.primary} />
          </View>
        )}
        <View style={sellerStyles.info}>
          <View style={sellerStyles.nameRow}>
            <Text style={sellerStyles.name}>{listing.seller.name}</Text>
            {listing.seller.verified && (
              <View style={sellerStyles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={sellerStyles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <View style={sellerStyles.ratingRow}>
            {listing.seller.rating && (
              <>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={sellerStyles.ratingText}>{listing.seller.rating.toFixed(1)}</Text>
              </>
            )}
            <Text style={sellerStyles.memberSince}>
              Member since {new Date(listing.seller.created_at).getFullYear()}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
});

const sellerStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, padding: HORIZONTAL_PADDING, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  card: { flexDirection: 'row', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  verifiedText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  memberSince: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});

// ============ SAFETY SECTION ============
const SafetySection = memo(({ onReport }: { onReport: () => void }) => (
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
        <Text style={safetyStyles.tipText}>Don't send money before seeing the item</Text>
      </View>
      <View style={safetyStyles.tip}>
        <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
        <Text style={safetyStyles.tipText}>Check the item thoroughly before paying</Text>
      </View>
    </View>
    <TouchableOpacity style={safetyStyles.reportBtn} onPress={onReport}>
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

// ============ HIGHLIGHTS SECTION ============
const generateHighlights = (listing: Listing, category: Category | null) => {
  const highlights: { id: string; icon: string; label: string }[] = [];
  
  if (listing.condition === 'new') {
    highlights.push({ id: 'new', icon: 'sparkles', label: 'Brand New' });
  }
  if (listing.condition === 'like_new') {
    highlights.push({ id: 'like_new', icon: 'star', label: 'Like New' });
  }
  if (listing.negotiable) {
    highlights.push({ id: 'negotiable', icon: 'pricetag', label: 'Negotiable' });
  }
  if (listing.featured) {
    highlights.push({ id: 'featured', icon: 'ribbon', label: 'Featured' });
  }
  if (listing.seller?.verified) {
    highlights.push({ id: 'verified', icon: 'shield-checkmark', label: 'Verified Seller' });
  }
  if (category) {
    highlights.push({ id: 'category', icon: 'grid', label: category.name });
  }
  
  return highlights.slice(0, 6);
};

const HighlightsSection = memo(({ highlights }: { highlights: { id: string; icon: string; label: string }[] }) => {
  if (highlights.length === 0) return null;
  
  return (
    <View style={highlightStyles.container}>
      <Text style={highlightStyles.title}>Highlights</Text>
      <View style={highlightStyles.grid}>
        {highlights.map((item) => (
          <View key={item.id} style={highlightStyles.item}>
            <View style={highlightStyles.iconContainer}>
              <Ionicons name={item.icon as any} size={16} color={COLORS.primary} />
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

// ============ LOCATION SECTION ============
const LocationSection = memo(({ listing }: { listing: Listing }) => (
  <View style={locationStyles.container}>
    <Text style={locationStyles.title}>Location</Text>
    
    {/* Map Placeholder */}
    <View style={locationStyles.mapPlaceholder}>
      <View style={locationStyles.mapContent}>
        <Ionicons name="map" size={40} color={COLORS.primary} />
        <Text style={locationStyles.mapText}>{listing.location}</Text>
      </View>
      
      {/* Map Pin Overlay */}
      <View style={locationStyles.pinOverlay}>
        <View style={locationStyles.pin}>
          <Ionicons name="location" size={24} color="#fff" />
        </View>
      </View>
      
      {/* Fake Map Grid Lines */}
      <View style={locationStyles.gridLines}>
        {[...Array(5)].map((_, i) => (
          <View key={`h-${i}`} style={[locationStyles.gridLine, { top: `${(i + 1) * 20}%` }]} />
        ))}
        {[...Array(5)].map((_, i) => (
          <View key={`v-${i}`} style={[locationStyles.gridLineVertical, { left: `${(i + 1) * 20}%` }]} />
        ))}
      </View>
    </View>
    
    {/* Address Details */}
    <View style={locationStyles.addressBox}>
      <Ionicons name="location-outline" size={20} color={COLORS.primary} />
      <View style={locationStyles.addressText}>
        <Text style={locationStyles.addressMain}>{listing.location}</Text>
      </View>
    </View>
    
    {/* Action Buttons */}
    <View style={locationStyles.actions}>
      <TouchableOpacity style={locationStyles.actionBtn}>
        <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />
        <Text style={locationStyles.actionText}>Get Directions</Text>
      </TouchableOpacity>
      <TouchableOpacity style={locationStyles.actionBtn}>
        <Ionicons name="share-outline" size={18} color={COLORS.primary} />
        <Text style={locationStyles.actionText}>Share Location</Text>
      </TouchableOpacity>
    </View>
  </View>
));

const locationStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, padding: HORIZONTAL_PADDING, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  mapPlaceholder: {
    height: 160,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapContent: { alignItems: 'center', zIndex: 10 },
  mapText: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginTop: 8, textAlign: 'center', paddingHorizontal: 16 },
  pinOverlay: { position: 'absolute', top: '30%', alignSelf: 'center' },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  gridLines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(46, 125, 50, 0.1)' },
  gridLineVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(46, 125, 50, 0.1)' },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    padding: 14,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  addressText: { flex: 1 },
  addressMain: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
});

// ============ REPORT MODAL ============
const ReportModal = memo(({ visible, onClose, onReport }: { visible: boolean; onClose: () => void; onReport: (reason: string) => void }) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <TouchableOpacity style={reportStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={reportStyles.modal}>
        <Text style={reportStyles.title}>Report Listing</Text>
        <Text style={reportStyles.subtitle}>Why are you reporting this listing?</Text>
        
        {['Spam or scam', 'Prohibited item', 'Wrong category', 'Misleading information', 'Offensive content', 'Other'].map((reason) => (
          <TouchableOpacity key={reason} style={reportStyles.option} onPress={() => onReport(reason)}>
            <Text style={reportStyles.optionText}>{reason}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={reportStyles.cancelBtn} onPress={onClose}>
          <Text style={reportStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
));

const reportStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: COLORS.surface, borderRadius: 16, width: '100%', maxWidth: 360, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  optionText: { fontSize: 15, color: COLORS.text },
  cancelBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: COLORS.error, fontWeight: '600', fontSize: 16 },
});

// ============ MAIN SCREEN ============
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');

  const fetchListing = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listingsApi.getOne(id!);
      setListing(data);
      setIsFavorited(data.is_favorited || false);
      
      // Track recently viewed (don't await, fire and forget)
      if (isAuthenticated) {
        api.post(`/profile/activity/recently-viewed/${id}`).catch(() => {});
      }
      
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
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (id) fetchListing();
  }, [id, fetchListing]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(price);
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const wasFavorited = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      if (wasFavorited) await favoritesApi.remove(id!);
      else await favoritesApi.add(id!);
    } catch (error) {
      setIsFavorited(wasFavorited);
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({ message: `Check out: ${listing.title} - ${formatPrice(listing.price)}` });
    } catch (error) {}
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
      Alert.alert('Error', 'Failed to start chat');
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
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const handleCall = () => {
    if (!listing?.seller?.phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    Linking.openURL(`tel:${listing.seller.phone}`);
  };

  const handleWhatsApp = () => {
    if (!listing) return;
    const phone = listing.seller?.whatsapp || listing.seller?.phone || '';
    if (!phone) {
      Alert.alert('Error', 'WhatsApp number not available');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hi, I'm interested in your "${listing.title}" listed for ${formatPrice(listing.price)}. Is it still available?`);
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`);
  };

  const handleSubmitOffer = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (!offerPrice) {
      Alert.alert('Error', 'Please enter an offer amount');
      return;
    }

    try {
      // Start a conversation with the offer message
      const conversation = await conversationsApi.create(id!);
      // Navigate to chat with the offer
      router.push(`/chat/${conversation.id}`);
      Alert.alert('Offer Sent', `Your offer of ${formatPrice(parseInt(offerPrice))} has been sent to the seller.`);
      setShowOfferModal(false);
      setOfferPrice('');
      setOfferMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send offer');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading listing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loadingText}>Listing not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = listing.images || [];
  const highlights = generateHighlights(listing, category);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <ImageCarousel
          images={images}
          onImagePress={() => {}}
          featured={listing.featured}
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
            <Text style={styles.location}>{listing.location}</Text>
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
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{getTimeAgo(listing.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Highlights */}
        <HighlightsSection highlights={highlights} />

        {/* Key Details */}
        <KeyDetailsSection listing={listing} category={category} />

        {/* Description */}
        {listing.description && <DescriptionSection description={listing.description} />}

        {/* Seller */}
        <SellerSection listing={listing} />

        {/* Location */}
        <LocationSection listing={listing} />

        {/* Safety */}
        <SafetySection onReport={() => setShowReportModal(true)} />

        {/* Similar Listings - Two column layout for general listings */}
        <SimilarListings propertyId={id!} category="other" />

        {/* Spacer for bottom actions */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions - Dynamic based on seller preferences */}
      {listing.user_id !== user?.user_id && (
        <View style={styles.bottomActions}>
          {/* Chat button - Always shown */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleChat}>
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          
          {/* Make Offer button - Only if seller allows offers */}
          {listing.seller?.allowsOffers && (
            <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={() => setShowOfferModal(true)}>
              <Ionicons name="pricetag" size={20} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Make Offer</Text>
            </TouchableOpacity>
          )}
          
          {/* Contact button - WhatsApp OR Call based on preference */}
          {listing.seller?.preferredContact === 'call' ? (
            <TouchableOpacity style={styles.iconOnlyBtn} onPress={handleCall}>
              <Ionicons name="call" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.iconOnlyBtn, { backgroundColor: '#25D366', borderColor: '#25D366' }]} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onReport={handleReport}
      />

      {/* Offer Modal */}
      <Modal visible={showOfferModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowOfferModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Make an Offer</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Your Offer</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={offerPrice}
                onChangeText={setOfferPrice}
              />
            </View>
            <Text style={styles.priceHint}>Listed price: {formatPrice(listing.price)}</Text>

            <Text style={[styles.modalLabel, { marginTop: 20 }]}>Message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Add a message to the seller..."
              multiline
              numberOfLines={4}
              value={offerMessage}
              onChangeText={setOfferMessage}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.submitBtn, !offerPrice && styles.submitBtnDisabled]}
              onPress={handleSubmitOffer}
              disabled={!offerPrice}
            >
              <Text style={styles.submitBtnText}>Submit Offer</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  iconOnlyBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: HORIZONTAL_PADDING,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    height: 56,
    fontSize: 24,
    fontWeight: '600',
  },
  priceHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
