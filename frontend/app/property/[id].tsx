import React, { useState, useEffect, memo, useCallback } from 'react';
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
import { Property, FACILITIES_LIST } from '../../src/types/property';
import SimilarListings from '../../src/components/property/SimilarListings';

// Generate highlights from property data
const generateHighlights = (property: Property) => {
  const highlights: { id: string; icon: string; label: string }[] = [];
  
  if (property.condition === 'new') {
    highlights.push({ id: 'new', icon: 'sparkles', label: 'Newly Built' });
  }
  if (property.condition === 'renovated') {
    highlights.push({ id: 'renovated', icon: 'hammer', label: 'Renovated' });
  }
  if (property.furnishing === 'furnished') {
    highlights.push({ id: 'furnished', icon: 'bed', label: 'Furnished' });
  }
  if (property.facilities?.gatedEstate) {
    highlights.push({ id: 'gated', icon: 'shield-checkmark', label: 'Gated Estate' });
  }
  if (property.facilities?.parking) {
    highlights.push({ id: 'parking', icon: 'car', label: 'Parking' });
  }
  if (property.facilities?.security) {
    highlights.push({ id: 'security', icon: 'lock-closed', label: '24hr Security' });
  }
  if (property.facilities?.swimmingPool) {
    highlights.push({ id: 'pool', icon: 'water', label: 'Swimming Pool' });
  }
  if (property.facilities?.gym) {
    highlights.push({ id: 'gym', icon: 'fitness', label: 'Gym Access' });
  }
  if (property.verification?.isVerified) {
    highlights.push({ id: 'verified', icon: 'checkmark-circle', label: 'Verified' });
  }
  
  return highlights.slice(0, 6);
};

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;

// Colors
const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  secondary: '#1565C0',
  secondaryLight: '#E3F2FD',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#333333',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#FF9800',
  verified: '#4CAF50',
};

// ============ IMAGE CAROUSEL ============
const ImageCarousel = memo<{ images: string[]; videoUrl?: string }>(({ images, videoUrl }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <View style={carouselStyles.container}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={carouselStyles.image} resizeMode="cover" />
        )}
        keyExtractor={(_, i) => i.toString()}
      />
      {/* Indicators */}
      <View style={carouselStyles.indicators}>
        {images.map((_, i) => (
          <View key={i} style={[carouselStyles.dot, i === currentIndex && carouselStyles.dotActive]} />
        ))}
      </View>
      {/* Video badge */}
      {videoUrl && (
        <TouchableOpacity style={carouselStyles.videoBadge}>
          <Ionicons name="videocam" size={20} color="#fff" />
          <Text style={carouselStyles.videoText}>Video Tour</Text>
        </TouchableOpacity>
      )}
      {/* Image count */}
      <View style={carouselStyles.countBadge}>
        <Text style={carouselStyles.countText}>{currentIndex + 1}/{images.length}</Text>
      </View>
    </View>
  );
});

const carouselStyles = StyleSheet.create({
  container: { width, height: 280, backgroundColor: '#F0F0F0' },
  image: { width, height: 280 },
  indicators: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 20 },
  videoBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  videoText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  countBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

// ============ HIGHLIGHTS SECTION ============
const HighlightsSection = memo<{ property: Property }>(({ property }) => {
  const highlights = generateHighlights(property);
  if (highlights.length === 0) return null;

  return (
    <View style={highlightStyles.container}>
      <Text style={highlightStyles.title}>Property Highlights</Text>
      <View style={highlightStyles.grid}>
        {highlights.map((h) => (
          <View key={h.id} style={highlightStyles.chip}>
            <Ionicons name={h.icon as any} size={16} color={COLORS.primary} />
            <Text style={highlightStyles.label}>{h.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const highlightStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

// ============ KEY DETAILS SECTION ============
const KeyDetailsSection = memo<{ property: Property }>(({ property }) => {
  const details = [
    { icon: 'home', label: 'Type', value: property.type.replace('_', ' ') },
    property.bedrooms && { icon: 'bed', label: 'Bedrooms', value: property.bedrooms.toString() },
    property.bathrooms && { icon: 'water', label: 'Bathrooms', value: property.bathrooms.toString() },
    property.size && { icon: 'resize', label: 'Size', value: `${property.size} ${property.sizeUnit}` },
    { icon: 'construct', label: 'Condition', value: property.condition },
    { icon: 'shirt', label: 'Furnishing', value: property.furnishing.replace('_', ' ') },
    property.yearBuilt && { icon: 'calendar', label: 'Year Built', value: property.yearBuilt.toString() },
    property.floorNumber && { icon: 'layers', label: 'Floor', value: `${property.floorNumber} of ${property.totalFloors}` },
  ].filter(Boolean);

  return (
    <View style={detailsStyles.container}>
      <Text style={detailsStyles.title}>Key Details</Text>
      <View style={detailsStyles.grid}>
        {details.map((d: any, i) => (
          <View key={i} style={detailsStyles.item}>
            <Ionicons name={d.icon as any} size={20} color={COLORS.primary} />
            <Text style={detailsStyles.label}>{d.label}</Text>
            <Text style={detailsStyles.value}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const detailsStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    width: '50%',
    paddingVertical: 12,
    paddingRight: 16,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});

// ============ FACILITIES SECTION ============
const FacilitiesSection = memo<{ property: Property }>(({ property }) => {
  const activeFacilities = FACILITIES_LIST.filter(
    (f) => property.facilities[f.id as keyof typeof property.facilities]
  );

  if (activeFacilities.length === 0) return null;

  const grouped = {
    utilities: activeFacilities.filter((f) => f.category === 'utilities'),
    interior: activeFacilities.filter((f) => f.category === 'interior'),
    security: activeFacilities.filter((f) => f.category === 'security'),
    outdoor: activeFacilities.filter((f) => f.category === 'outdoor'),
  };

  return (
    <View style={facilitiesStyles.container}>
      <Text style={facilitiesStyles.title}>Facilities & Amenities</Text>
      {Object.entries(grouped).map(([category, items]) =>
        items.length > 0 ? (
          <View key={category} style={facilitiesStyles.group}>
            <Text style={facilitiesStyles.categoryLabel}>{category}</Text>
            <View style={facilitiesStyles.chips}>
              {items.map((f) => (
                <View key={f.id} style={facilitiesStyles.chip}>
                  <Ionicons name={f.icon as any} size={16} color={COLORS.text} />
                  <Text style={facilitiesStyles.chipText}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null
      )}
    </View>
  );
});

const facilitiesStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  group: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.text,
  },
});

// ============ DESCRIPTION SECTION ============
const DescriptionSection = memo<{ property: Property }>(({ property }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={descStyles.container}>
      <Text style={descStyles.title}>Description</Text>
      <Text style={descStyles.text} numberOfLines={expanded ? undefined : 4}>
        {property.description}
      </Text>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Text style={descStyles.toggle}>{expanded ? 'Show less' : 'Read more'}</Text>
      </TouchableOpacity>
    </View>
  );
});

const descStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  toggle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 8,
  },
});

// ============ SELLER SECTION ============
const SellerSection = memo<{ property: Property }>(({ property }) => (
  <View style={sellerStyles.container}>
    <Text style={sellerStyles.title}>Listed by</Text>
    <View style={sellerStyles.card}>
      <View style={sellerStyles.avatar}>
        <Ionicons name={property.seller.type === 'agent' ? 'business' : 'person'} size={24} color={COLORS.primary} />
      </View>
      <View style={sellerStyles.info}>
        <View style={sellerStyles.nameRow}>
          <Text style={sellerStyles.name}>{property.seller.name}</Text>
          {property.seller.isVerified && (
            <View style={sellerStyles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>
        <Text style={sellerStyles.type}>{property.seller.type === 'agent' ? 'Verified Agent' : 'Property Owner'}</Text>
        {property.seller.rating && (
          <View style={sellerStyles.ratingRow}>
            <Ionicons name="star" size={14} color={COLORS.warning} />
            <Text style={sellerStyles.rating}>{property.seller.rating}</Text>
            <Text style={sellerStyles.listings}>• {property.seller.listingsCount} listings</Text>
          </View>
        )}
      </View>
    </View>
  </View>
));

const sellerStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  verifiedBadge: {
    backgroundColor: COLORS.verified,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  type: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  listings: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

// ============ VERIFICATION STATUS ============
const VerificationSection = memo<{ property: Property }>(({ property }) => (
  <View style={verifyStyles.container}>
    <Text style={verifyStyles.title}>Trust & Safety</Text>
    <View style={verifyStyles.items}>
      <View style={verifyStyles.item}>
        <Ionicons
          name={property.verification.docsChecked ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={property.verification.docsChecked ? COLORS.verified : COLORS.textSecondary}
        />
        <Text style={verifyStyles.label}>Documents Verified</Text>
      </View>
      <View style={verifyStyles.item}>
        <Ionicons
          name={property.verification.addressConfirmed ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={property.verification.addressConfirmed ? COLORS.verified : COLORS.textSecondary}
        />
        <Text style={verifyStyles.label}>Address Confirmed</Text>
      </View>
      <View style={verifyStyles.item}>
        <Ionicons
          name={property.verification.ownerVerified ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={property.verification.ownerVerified ? COLORS.verified : COLORS.textSecondary}
        />
        <Text style={verifyStyles.label}>Owner Verified</Text>
      </View>
    </View>
    <TouchableOpacity style={verifyStyles.reportBtn}>
      <Ionicons name="flag-outline" size={18} color={COLORS.error} />
      <Text style={verifyStyles.reportText}>Report this listing</Text>
    </TouchableOpacity>
  </View>
));

const verifyStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  items: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 8,
    gap: 8,
  },
  reportText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
});

// ============ MAP PLACEHOLDER SECTION ============
const MapSection = memo<{ property: Property }>(({ property }) => (
  <View style={mapStyles.container}>
    <Text style={mapStyles.title}>Location</Text>
    
    {/* Map Placeholder */}
    <View style={mapStyles.mapPlaceholder}>
      <View style={mapStyles.mapContent}>
        <Ionicons name="map" size={40} color={COLORS.primary} />
        <Text style={mapStyles.mapText}>{property.location.area}, {property.location.city}</Text>
        <Text style={mapStyles.mapSubtext}>{property.location.country}</Text>
      </View>
      
      {/* Map Pin Overlay */}
      <View style={mapStyles.pinOverlay}>
        <View style={mapStyles.pin}>
          <Ionicons name="location" size={24} color="#fff" />
        </View>
      </View>
      
      {/* Fake Map Grid Lines */}
      <View style={mapStyles.gridLines}>
        {[...Array(5)].map((_, i) => (
          <View key={`h-${i}`} style={[mapStyles.gridLine, { top: `${(i + 1) * 20}%` }]} />
        ))}
        {[...Array(5)].map((_, i) => (
          <View key={`v-${i}`} style={[mapStyles.gridLineVertical, { left: `${(i + 1) * 20}%` }]} />
        ))}
      </View>
    </View>
    
    {/* Address Details */}
    <View style={mapStyles.addressBox}>
      <Ionicons name="location-outline" size={20} color={COLORS.primary} />
      <View style={mapStyles.addressText}>
        <Text style={mapStyles.addressMain}>
          {property.location.address || property.location.area}
        </Text>
        <Text style={mapStyles.addressSub}>
          {property.location.city}, {property.location.country}
        </Text>
        {property.location.landmark && (
          <Text style={mapStyles.landmark}>Near: {property.location.landmark}</Text>
        )}
      </View>
    </View>
    
    {/* Action Buttons */}
    <View style={mapStyles.actions}>
      <TouchableOpacity style={mapStyles.actionBtn}>
        <Ionicons name="navigate-outline" size={18} color={COLORS.primary} />
        <Text style={mapStyles.actionText}>Get Directions</Text>
      </TouchableOpacity>
      <TouchableOpacity style={mapStyles.actionBtn}>
        <Ionicons name="share-outline" size={18} color={COLORS.primary} />
        <Text style={mapStyles.actionText}>Share Location</Text>
      </TouchableOpacity>
    </View>
  </View>
));

const mapStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 8,
  },
  mapSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pinOverlay: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
  },
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
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    padding: 14,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  addressText: {
    flex: 1,
  },
  addressMain: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  addressSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  landmark: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
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
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

// ============ OFFER MODAL ============
const OfferModal = memo<{ visible: boolean; onClose: () => void; property: Property; onSubmit: (price: number, message: string) => void }>(
  ({ visible, onClose, property, onSubmit }) => {
    const [offerPrice, setOfferPrice] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = () => {
      if (offerPrice) {
        onSubmit(parseInt(offerPrice), message);
      }
    };

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={offerStyles.container}>
          <View style={offerStyles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={offerStyles.headerTitle}>Make an Offer</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={offerStyles.content}>
            <Text style={offerStyles.label}>Your Offer</Text>
            <View style={offerStyles.priceInput}>
              <Text style={offerStyles.currency}>€</Text>
              <TextInput
                style={offerStyles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={offerPrice}
                onChangeText={setOfferPrice}
              />
            </View>
            <Text style={offerStyles.hint}>Listed price: €{property.price.toLocaleString()}</Text>

            <Text style={[offerStyles.label, { marginTop: 20 }]}>Message (optional)</Text>
            <TextInput
              style={offerStyles.messageInput}
              placeholder="Add a message to the seller..."
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
            />
          </ScrollView>

          <View style={offerStyles.footer}>
            <TouchableOpacity
              style={[offerStyles.submitBtn, !offerPrice && offerStyles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!offerPrice}
            >
              <Text style={offerStyles.submitText}>Submit Offer</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }
);

// ============ BOOKING MODAL ============
const BookingModal = memo<{ visible: boolean; onClose: () => void; property: Property; onSubmit: (date: string, time: string, phone: string, message: string) => void }>(
  ({ visible, onClose, property, onSubmit }) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');

    const dates = [
      'Today',
      'Tomorrow',
      'This Weekend',
    ];

    const times = [
      '09:00', '10:00', '11:00', '12:00',
      '14:00', '15:00', '16:00', '17:00',
    ];

    const handleSubmit = () => {
      if (selectedDate && selectedTime) {
        onSubmit(selectedDate, selectedTime, phone, message);
      }
    };

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={offerStyles.container}>
          <View style={offerStyles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={offerStyles.headerTitle}>Book a Viewing</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={offerStyles.content}>
            <Text style={offerStyles.label}>Preferred Date</Text>
            <View style={bookingStyles.optionRow}>
              {dates.map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[bookingStyles.optionChip, selectedDate === date && bookingStyles.optionChipActive]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[bookingStyles.optionText, selectedDate === date && bookingStyles.optionTextActive]}>{date}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[offerStyles.label, { marginTop: 20 }]}>Preferred Time</Text>
            <View style={bookingStyles.timeGrid}>
              {times.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[bookingStyles.timeChip, selectedTime === time && bookingStyles.optionChipActive]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[bookingStyles.optionText, selectedTime === time && bookingStyles.optionTextActive]}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[offerStyles.label, { marginTop: 20 }]}>Your Phone Number</Text>
            <TextInput
              style={bookingStyles.phoneInput}
              placeholder="+49 XXX XXXXXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={[offerStyles.label, { marginTop: 20 }]}>Message (optional)</Text>
            <TextInput
              style={offerStyles.messageInput}
              placeholder="Any special requests or questions..."
              multiline
              numberOfLines={3}
              value={message}
              onChangeText={setMessage}
            />
          </ScrollView>

          <View style={offerStyles.footer}>
            <TouchableOpacity
              style={[offerStyles.submitBtn, (!selectedDate || !selectedTime) && offerStyles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!selectedDate || !selectedTime}
            >
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text style={[offerStyles.submitText, { marginLeft: 8 }]}>Request Viewing</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }
);

const bookingStyles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  optionChipActive: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  optionTextActive: {
    color: '#fff',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    minWidth: 70,
    alignItems: 'center',
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
  },
});

const offerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { flex: 1, padding: HORIZONTAL_PADDING },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currency: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginRight: 8 },
  input: { flex: 1, height: 56, fontSize: 24, fontWeight: '600' },
  hint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8 },
  messageInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
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
  submitBtnDisabled: { backgroundColor: COLORS.border },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ============ MAIN PROPERTY DETAIL SCREEN ============
export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Fetch property from API
  const fetchProperty = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/property/listings/${id}`);
      setProperty(response.data);
      
      // Track recently viewed (fire and forget)
      api.post(`/profile/activity/recently-viewed/${id}`).catch(() => {});
    } catch (error) {
      console.error('Error fetching property:', error);
      Alert.alert('Error', 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id, fetchProperty]);

  // Toggle favorite
  const handleToggleFavorite = async () => {
    if (!property) return;
    
    try {
      if (isFavorited) {
        await api.delete(`/property/favorites/${property.id}`);
      } else {
        await api.post(`/property/favorites/${property.id}`);
      }
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Optimistic update
      setIsFavorited(!isFavorited);
    }
  };

  // Submit offer
  const handleSubmitOffer = async (offeredPrice: number, message: string) => {
    if (!property) return;
    
    try {
      await api.post('/property/offers', {
        propertyId: property.id,
        offeredPrice,
        message,
      });
      Alert.alert('Offer Sent!', `Your offer of €${offeredPrice.toLocaleString()} has been sent to ${property.seller.name}.`);
      setShowOfferModal(false);
    } catch (error) {
      console.error('Error submitting offer:', error);
      Alert.alert('Error', 'Failed to submit offer. Please try again.');
    }
  };

  // Book viewing
  const handleBookViewing = async (date: string, time: string, phone: string, message: string) => {
    if (!property) return;
    
    try {
      await api.post('/property/book-viewing', {
        propertyId: property.id,
        preferredDate: date,
        preferredTime: time,
        userPhone: phone,
        message,
      });
      Alert.alert('Viewing Booked!', `Your viewing request for ${date} at ${time} has been sent to ${property.seller.name}.`);
      setShowBookingModal(false);
    } catch (error) {
      console.error('Error booking viewing:', error);
      Alert.alert('Error', 'Failed to book viewing. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading property...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Ionicons name="home-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loadingText}>Property not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatPrice = (price: number, perMonth?: boolean) => {
    const formatted = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: property.currency,
      minimumFractionDigits: 0,
    }).format(price);
    return perMonth ? `${formatted}/mo` : formatted;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this property: ${property.title} - ${formatPrice(property.price, property.pricePerMonth)}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCall = () => {
    if (property.seller.phone) {
      Linking.openURL(`tel:${property.seller.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (property.seller.whatsapp) {
      const message = encodeURIComponent(`Hi, I'm interested in: ${property.title}`);
      Linking.openURL(`https://wa.me/${property.seller.whatsapp.replace(/[^0-9]/g, '')}?text=${message}`);
    }
  };

  const handleChat = () => {
    router.push(`/property/chat/${property.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleToggleFavorite}>
            <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={24} color={isFavorited ? COLORS.error : COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <ImageCarousel images={property.images} videoUrl={property.videoUrl} />

        {/* Price & Title Section */}
        <View style={styles.titleSection}>
          {/* Badges */}
          <View style={styles.badges}>
            {property.verification.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#fff" />
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            )}
            {property.featured && (
              <View style={[styles.verifiedBadge, { backgroundColor: COLORS.warning }]}>
                <Ionicons name="star" size={14} color="#fff" />
                <Text style={styles.badgeText}>Featured</Text>
              </View>
            )}
          </View>

          {/* Price */}
          <Text style={styles.price}>
            {formatPrice(property.price, property.pricePerMonth)}
            {property.priceNegotiable && <Text style={styles.negotiable}> Negotiable</Text>}
          </Text>

          {/* Title */}
          <Text style={styles.title}>{property.title}</Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={COLORS.textSecondary} />
            <Text style={styles.location}>
              {property.location.area}, {property.location.city}
              {property.location.estate && ` • ${property.location.estate}`}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{property.views} views</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{property.favorites} saves</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{property.inquiries} inquiries</Text>
            </View>
          </View>
        </View>

        {/* Highlights */}
        <HighlightsSection property={property} />

        {/* Key Details */}
        <KeyDetailsSection property={property} />

        {/* Facilities */}
        <FacilitiesSection property={property} />

        {/* Description */}
        <DescriptionSection property={property} />

        {/* Seller */}
        <SellerSection property={property} />

        {/* Verification */}
        <VerificationSection property={property} />

        {/* Map & Location */}
        <MapSection property={property} />

        {/* Similar Listings */}
        <SimilarListings propertyId={property.id} category="property" />

        {/* Spacer for bottom actions */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions - Dynamic based on seller preferences */}
      <View style={styles.bottomActions}>
        {/* Chat button - Always shown */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleChat}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Chat</Text>
        </TouchableOpacity>
        
        {/* Make Offer button - Only if seller allows offers */}
        {property.seller?.allowsOffers && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => setShowOfferModal(true)}>
            <Ionicons name="pricetag" size={20} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Make Offer</Text>
          </TouchableOpacity>
        )}
        
        {/* Contact button - WhatsApp OR Call based on preference */}
        {property.seller?.preferredContact === 'call' ? (
          <TouchableOpacity style={styles.iconOnlyBtn} onPress={handleCall}>
            <Ionicons name="call" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.iconOnlyBtn, { backgroundColor: '#25D366', borderColor: '#25D366' }]} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Offer Modal */}
      <OfferModal
        visible={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        property={property}
        onSubmit={handleSubmitOffer}
      />

      {/* Booking Modal */}
      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        property={property}
        onSubmit={handleBookViewing}
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
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  titleSection: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.verified,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  negotiable: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  location: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
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
    padding: HORIZONTAL_PADDING,
    paddingBottom: 30,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
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
  actionBtnPrimary: {
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
