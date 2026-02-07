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
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/utils/api';
import { useAuthStore } from '../src/store/authStore';
import { useResponsive } from '../src/hooks/useResponsive';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
  pending: '#F59E0B',
  accepted: '#16A34A',
  rejected: '#DC2626',
};

interface Offer {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image?: string;
  listed_price: number;
  offered_price: number;
  discount_percent: number;
  buyer_id: string;
  buyer_name: string;
  buyer_picture?: string;
  seller_id: string;
  seller_name?: string;
  seller_picture?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  counter_price?: number;
  response_message?: string;
  created_at: string;
  responded_at?: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(price);
};

const formatTimeAgo = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { color: COLORS.pending, bg: '#FEF3C7', label: 'Pending', icon: 'time-outline' };
    case 'accepted':
      return { color: COLORS.accepted, bg: '#D1FAE5', label: 'Accepted', icon: 'checkmark-circle' };
    case 'rejected':
      return { color: COLORS.rejected, bg: '#FEE2E2', label: 'Declined', icon: 'close-circle' };
    case 'countered':
      return { color: COLORS.primary, bg: COLORS.primaryLight, label: 'Countered', icon: 'swap-horizontal' };
    default:
      return { color: COLORS.textSecondary, bg: COLORS.border, label: status, icon: 'help-circle-outline' };
  }
};

// Desktop Offer Card Component
const DesktopOfferCard = ({ 
  offer, 
  isSeller, 
  onAccept, 
  onReject, 
  onCounter,
  onViewListing,
  onViewChat 
}: {
  offer: Offer;
  isSeller: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
  onViewListing: () => void;
  onViewChat: () => void;
}) => {
  const statusConfig = getStatusConfig(offer.status);
  const savings = offer.listed_price - offer.offered_price;

  return (
    <View style={[desktopStyles.offerCard, Platform.OS === 'web' && { cursor: 'default' } as any]}>
      {/* Header with listing info */}
      <TouchableOpacity style={desktopStyles.listingRow} onPress={onViewListing}>
        <Image 
          source={{ uri: offer.listing_image || 'https://via.placeholder.com/80' }} 
          style={desktopStyles.listingImage} 
        />
        <View style={desktopStyles.listingInfo}>
          <Text style={desktopStyles.listingTitle} numberOfLines={2}>{offer.listing_title}</Text>
          <Text style={desktopStyles.listedPrice}>Listed: {formatPrice(offer.listed_price)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
      </TouchableOpacity>

      {/* Divider */}
      <View style={desktopStyles.divider} />

      {/* Offer details */}
      <View style={desktopStyles.offerDetails}>
        {/* User info row */}
        <View style={desktopStyles.buyerRow}>
          <Image 
            source={{ uri: isSeller 
              ? (offer.buyer_picture || 'https://via.placeholder.com/40') 
              : (offer.seller_picture || 'https://via.placeholder.com/40') 
            }} 
            style={desktopStyles.buyerAvatar} 
          />
          <View style={desktopStyles.buyerInfo}>
            <Text style={desktopStyles.buyerLabel}>{isSeller ? 'From' : 'To'}</Text>
            <Text style={desktopStyles.buyerName}>
              {isSeller ? offer.buyer_name : (offer.seller_name || 'Seller')}
            </Text>
            <Text style={desktopStyles.offerTime}>{formatTimeAgo(offer.created_at)}</Text>
          </View>
          <View style={[desktopStyles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
            <Text style={[desktopStyles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Price comparison */}
        <View style={desktopStyles.priceComparison}>
          <View style={desktopStyles.priceBlock}>
            <Text style={desktopStyles.priceLabel}>Offer</Text>
            <Text style={desktopStyles.offerPrice}>{formatPrice(offer.offered_price)}</Text>
          </View>
          <View style={desktopStyles.savingsBlock}>
            <Ionicons name="trending-down" size={20} color={COLORS.success} />
            <Text style={desktopStyles.savingsText}>{offer.discount_percent}% off</Text>
          </View>
          <View style={desktopStyles.priceBlock}>
            <Text style={desktopStyles.priceLabel}>Savings</Text>
            <Text style={desktopStyles.savingsAmount}>{formatPrice(savings)}</Text>
          </View>
        </View>

        {/* Message */}
        {offer.message && (
          <View style={desktopStyles.messageBox}>
            <Ionicons name="chatbubble-outline" size={14} color={COLORS.textSecondary} />
            <Text style={desktopStyles.messageText} numberOfLines={2}>{offer.message}</Text>
          </View>
        )}

        {/* Counter offer display */}
        {offer.status === 'countered' && offer.counter_price && (
          <View style={desktopStyles.counterBox}>
            <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
            <Text style={desktopStyles.counterText}>Counter offer: {formatPrice(offer.counter_price)}</Text>
          </View>
        )}

        {/* Response message */}
        {offer.response_message && (
          <View style={desktopStyles.responseBox}>
            <Text style={desktopStyles.responseText}>"{offer.response_message}"</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {isSeller && offer.status === 'pending' && (
        <View style={desktopStyles.actions}>
          <TouchableOpacity style={desktopStyles.rejectBtn} onPress={onReject}>
            <Ionicons name="close" size={18} color={COLORS.error} />
            <Text style={desktopStyles.rejectBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={desktopStyles.counterBtn} onPress={onCounter}>
            <Ionicons name="swap-horizontal" size={18} color={COLORS.primary} />
            <Text style={desktopStyles.counterBtnText}>Counter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={desktopStyles.acceptBtn} onPress={onAccept}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={desktopStyles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chat button for non-pending */}
      {(offer.status !== 'pending' || !isSeller) && (
        <TouchableOpacity style={desktopStyles.chatBtn} onPress={onViewChat}>
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
          <Text style={desktopStyles.chatBtnText}>Message</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const OfferCard = ({ 
  offer, 
  isSeller, 
  onAccept, 
  onReject, 
  onCounter,
  onViewListing,
  onViewChat 
}: {
  offer: Offer;
  isSeller: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
  onViewListing: () => void;
  onViewChat: () => void;
}) => {
  const statusConfig = getStatusConfig(offer.status);
  const savings = offer.listed_price - offer.offered_price;

  return (
    <View style={styles.offerCard}>
      {/* Header with listing info */}
      <TouchableOpacity style={styles.listingRow} onPress={onViewListing}>
        <Image 
          source={{ uri: offer.listing_image || 'https://via.placeholder.com/80' }} 
          style={styles.listingImage} 
        />
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={1}>{offer.listing_title}</Text>
          <Text style={styles.listedPrice}>Listed: {formatPrice(offer.listed_price)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Offer details */}
      <View style={styles.offerDetails}>
        {/* User info row - shows buyer for seller, seller for buyer */}
        <View style={styles.buyerRow}>
          <Image 
            source={{ uri: isSeller 
              ? (offer.buyer_picture || 'https://via.placeholder.com/40') 
              : (offer.seller_picture || 'https://via.placeholder.com/40') 
            }} 
            style={styles.buyerAvatar} 
          />
          <View style={styles.buyerInfo}>
            <Text style={styles.buyerLabel}>{isSeller ? 'From' : 'To'}</Text>
            <Text style={styles.buyerName}>
              {isSeller ? offer.buyer_name : (offer.seller_name || 'Seller')}
            </Text>
            <Text style={styles.offerTime}>{formatTimeAgo(offer.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Price comparison */}
        <View style={styles.priceComparison}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Offer</Text>
            <Text style={styles.offerPrice}>{formatPrice(offer.offered_price)}</Text>
          </View>
          <View style={styles.savingsBlock}>
            <Ionicons name="trending-down" size={20} color={COLORS.success} />
            <Text style={styles.savingsText}>{offer.discount_percent}% off</Text>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Savings</Text>
            <Text style={styles.savingsAmount}>{formatPrice(savings)}</Text>
          </View>
        </View>

        {/* Message */}
        {offer.message && (
          <View style={styles.messageBox}>
            <Ionicons name="chatbubble-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.messageText} numberOfLines={2}>{offer.message}</Text>
          </View>
        )}

        {/* Counter offer display */}
        {offer.status === 'countered' && offer.counter_price && (
          <View style={styles.counterBox}>
            <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
            <Text style={styles.counterText}>Counter offer: {formatPrice(offer.counter_price)}</Text>
          </View>
        )}

        {/* Response message */}
        {offer.response_message && (
          <View style={styles.responseBox}>
            <Text style={styles.responseText}>"{offer.response_message}"</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {isSeller && offer.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
            <Ionicons name="close" size={18} color={COLORS.error} />
            <Text style={styles.rejectBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.counterBtn} onPress={onCounter}>
            <Ionicons name="swap-horizontal" size={18} color={COLORS.primary} />
            <Text style={styles.counterBtnText}>Counter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chat button for non-pending */}
      {(offer.status !== 'pending' || !isSeller) && (
        <TouchableOpacity style={styles.chatBtn} onPress={onViewChat}>
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
          <Text style={styles.chatBtnText}>Message</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function OffersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<'seller' | 'buyer'>('seller');
  const [pendingCount, setPendingCount] = useState(0);
  
  // Counter modal state
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOffers = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/offers', { params: { role } });
      setOffers(response.data.offers || []);
      setPendingCount(response.data.pending_count || 0);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, role]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    fetchOffers();
  }, [isAuthenticated, role]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleAccept = async (offer: Offer) => {
    Alert.alert(
      'Accept Offer',
      `Accept ${formatPrice(offer.offered_price)} for "${offer.listing_title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await api.put(`/offers/${offer.id}/respond`, { action: 'accept' });
              Alert.alert('Success', 'Offer accepted!');
              fetchOffers();
            } catch (error) {
              Alert.alert('Error', 'Failed to accept offer');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (offer: Offer) => {
    Alert.alert(
      'Decline Offer',
      `Decline offer of ${formatPrice(offer.offered_price)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/offers/${offer.id}/respond`, { action: 'reject' });
              Alert.alert('Done', 'Offer declined');
              fetchOffers();
            } catch (error) {
              Alert.alert('Error', 'Failed to decline offer');
            }
          },
        },
      ]
    );
  };

  const handleCounter = (offer: Offer) => {
    setSelectedOffer(offer);
    setCounterPrice(String(Math.round((offer.offered_price + offer.listed_price) / 2)));
    setCounterMessage('');
    setShowCounterModal(true);
  };

  const submitCounter = async () => {
    if (!selectedOffer || !counterPrice) return;

    const price = parseInt(counterPrice);
    if (price <= selectedOffer.offered_price) {
      Alert.alert('Invalid', 'Counter must be higher than the current offer');
      return;
    }
    if (price >= selectedOffer.listed_price) {
      Alert.alert('Invalid', 'Counter must be below the listed price');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/offers/${selectedOffer.id}/respond`, {
        action: 'counter',
        counter_price: price,
        message: counterMessage,
      });
      setShowCounterModal(false);
      Alert.alert('Success', 'Counter offer sent!');
      fetchOffers();
    } catch (error) {
      Alert.alert('Error', 'Failed to send counter offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    router.canGoBack() ? router.back() : router.replace('/');
  };

  const handleViewChat = async (offer: Offer) => {
    try {
      // Create or get existing conversation with the other party
      const otherUserId = role === 'seller' ? offer.buyer_id : offer.seller_id;
      const response = await api.post('/conversations', {
        listing_id: offer.listing_id,
        other_user_id: otherUserId,
      });
      
      if (response.data?.id) {
        router.push(`/chat/${response.data.id}`);
      } else {
        Alert.alert('Error', 'Could not open chat');
      }
    } catch (error) {
      console.error('Failed to open chat:', error);
      Alert.alert('Error', 'Could not open chat');
    }
  };

  if (!isAuthenticated) {
    if (!isReady) {
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#F0F2F5' }]} edges={['top']}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        </SafeAreaView>
      );
    }
    
    // Desktop unauthenticated
    if (isLargeScreen) {
      return (
        <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
          {renderGlobalHeader()}
          <View style={desktopStyles.pageWrapper}>
            <View style={desktopStyles.unauthContainer}>
              <View style={desktopStyles.unauthIcon}>
                <Ionicons name="pricetag-outline" size={64} color={COLORS.primary} />
              </View>
              <Text style={desktopStyles.unauthTitle}>Sign in to view your offers</Text>
              <Text style={desktopStyles.unauthSubtitle}>
                Manage your offers, negotiate prices, and close deals
              </Text>
              <TouchableOpacity style={desktopStyles.unauthSignInBtn} onPress={() => router.push('/login')}>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={desktopStyles.unauthSignInBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }
    
    // Mobile unauthenticated
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.authRequired}>
          <Ionicons name="pricetag-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.authTitle}>Sign in required</Text>
          <Text style={styles.authSubtitle}>Sign in to view your offers</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

  // Render Counter Modal (used by both mobile and desktop)
  const renderCounterModal = () => (
    <Modal visible={showCounterModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCounterModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Counter Offer</Text>
          <View style={{ width: 24 }} />
        </View>

        {selectedOffer && (
          <View style={styles.modalContent}>
            <View style={styles.priceRange}>
              <View style={styles.priceRangeItem}>
                <Text style={styles.priceRangeLabel}>Their Offer</Text>
                <Text style={styles.priceRangeValue}>{formatPrice(selectedOffer.offered_price)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={COLORS.textLight} />
              <View style={styles.priceRangeItem}>
                <Text style={styles.priceRangeLabel}>Listed Price</Text>
                <Text style={styles.priceRangeValue}>{formatPrice(selectedOffer.listed_price)}</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Your Counter Offer</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={counterPrice}
                onChangeText={setCounterPrice}
              />
            </View>

            <Text style={styles.inputLabel}>Message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Add a message..."
              multiline
              numberOfLines={3}
              value={counterMessage}
              onChangeText={setCounterMessage}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={submitCounter}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Send Counter Offer</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

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

  // Desktop authenticated view
  if (isLargeScreen) {
    return (
      <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
        {renderGlobalHeader()}
        
        <View style={desktopStyles.pageWrapper}>
          {/* Page Header */}
          <View style={desktopStyles.pageHeader}>
            <View style={desktopStyles.pageHeaderLeft}>
              <TouchableOpacity 
                style={desktopStyles.backBtn} 
                onPress={handleGoBack}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={desktopStyles.pageTitle}>Offers</Text>
              {pendingCount > 0 && role === 'seller' && (
                <View style={desktopStyles.pendingBadge}>
                  <Text style={desktopStyles.pendingBadgeText}>{pendingCount} pending</Text>
                </View>
              )}
            </View>
          </View>

          {/* Role Toggle */}
          <View style={desktopStyles.roleToggleContainer}>
            <TouchableOpacity
              style={[desktopStyles.roleBtn, role === 'seller' && desktopStyles.roleBtnActive]}
              onPress={() => setRole('seller')}
            >
              <Ionicons 
                name="download-outline" 
                size={18} 
                color={role === 'seller' ? COLORS.primary : COLORS.textSecondary} 
              />
              <Text style={[desktopStyles.roleBtnText, role === 'seller' && desktopStyles.roleBtnTextActive]}>
                Received
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[desktopStyles.roleBtn, role === 'buyer' && desktopStyles.roleBtnActive]}
              onPress={() => setRole('buyer')}
            >
              <Ionicons 
                name="upload-outline" 
                size={18} 
                color={role === 'buyer' ? COLORS.primary : COLORS.textSecondary} 
              />
              <Text style={[desktopStyles.roleBtnText, role === 'buyer' && desktopStyles.roleBtnTextActive]}>
                Sent
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={desktopStyles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={desktopStyles.loadingText}>Loading offers...</Text>
            </View>
          ) : offers.length === 0 ? (
            <View style={desktopStyles.emptyContainer}>
              <View style={desktopStyles.emptyIcon}>
                <Ionicons name="pricetag-outline" size={64} color={COLORS.textLight} />
              </View>
              <Text style={desktopStyles.emptyTitle}>
                {role === 'seller' ? 'No offers received yet' : 'No offers sent yet'}
              </Text>
              <Text style={desktopStyles.emptySubtitle}>
                {role === 'seller' 
                  ? 'When buyers make offers on your listings, they will appear here'
                  : 'Offers you make on listings will appear here'}
              </Text>
              <TouchableOpacity style={desktopStyles.browseBtn} onPress={() => router.push('/')}>
                <Ionicons name="search-outline" size={18} color={COLORS.primary} />
                <Text style={desktopStyles.browseBtnText}>Browse Listings</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView 
              style={desktopStyles.scrollView}
              contentContainerStyle={desktopStyles.offersContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
              }
            >
              <View style={desktopStyles.offersGrid}>
                {offers.map((item) => (
                  <View key={item.id} style={desktopStyles.offerGridItem}>
                    <DesktopOfferCard
                      offer={item}
                      isSeller={role === 'seller'}
                      onAccept={() => handleAccept(item)}
                      onReject={() => handleReject(item)}
                      onCounter={() => handleCounter(item)}
                      onViewListing={() => router.push(`/listing/${item.listing_id}`)}
                      onViewChat={() => handleViewChat(item)}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Counter Modal */}
        {renderCounterModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offers</Text>
        {pendingCount > 0 && role === 'seller' && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
          </View>
        )}
        <View style={styles.headerBtn} />
      </View>

      {/* Role Toggle */}
      <View style={styles.roleToggle}>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'seller' && styles.roleBtnActive]}
          onPress={() => setRole('seller')}
        >
          <Ionicons name="download-outline" size={18} color={role === 'seller' ? '#fff' : COLORS.textSecondary} />
          <Text style={[styles.roleBtnText, role === 'seller' && styles.roleBtnTextActive]}>Received</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'buyer' && styles.roleBtnActive]}
          onPress={() => setRole('buyer')}
        >
          <Ionicons name="upload-outline" size={18} color={role === 'buyer' ? '#fff' : COLORS.textSecondary} />
          <Text style={[styles.roleBtnText, role === 'buyer' && styles.roleBtnTextActive]}>Sent</Text>
        </TouchableOpacity>
      </View>

      {/* Offers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : offers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>
            {role === 'seller' ? 'No offers received yet' : 'No offers sent yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {role === 'seller' 
              ? 'When buyers make offers on your listings, they will appear here'
              : 'Offers you make on listings will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              isSeller={role === 'seller'}
              onAccept={() => handleAccept(item)}
              onReject={() => handleReject(item)}
              onCounter={() => handleCounter(item)}
              onViewListing={() => router.push(`/listing/${item.listing_id}`)}
              onViewChat={() => handleViewChat(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Counter Modal */}
      <Modal visible={showCounterModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCounterModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Counter Offer</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedOffer && (
            <View style={styles.modalContent}>
              <View style={styles.priceRange}>
                <View style={styles.priceRangeItem}>
                  <Text style={styles.priceRangeLabel}>Their Offer</Text>
                  <Text style={styles.priceRangeValue}>{formatPrice(selectedOffer.offered_price)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={COLORS.textLight} />
                <View style={styles.priceRangeItem}>
                  <Text style={styles.priceRangeLabel}>Listed Price</Text>
                  <Text style={styles.priceRangeValue}>{formatPrice(selectedOffer.listed_price)}</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Your Counter Offer</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>€</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={counterPrice}
                  onChangeText={setCounterPrice}
                />
              </View>

              <Text style={styles.inputLabel}>Message (optional)</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Add a message..."
                multiline
                numberOfLines={3}
                value={counterMessage}
                onChangeText={setCounterMessage}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submitCounter}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Counter Offer</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  pendingBadge: {
    position: 'absolute',
    right: 60,
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  roleToggle: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  roleBtnActive: { backgroundColor: COLORS.primary },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  roleBtnTextActive: { color: '#fff' },

  listContent: { padding: 12 },

  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  listingImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: COLORS.border },
  listingInfo: { flex: 1 },
  listingTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  listedPrice: { fontSize: 12, color: COLORS.textSecondary },

  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 12 },

  offerDetails: { padding: 12 },
  buyerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  buyerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.border, marginRight: 10 },
  buyerInfo: { flex: 1 },
  buyerName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  offerTime: { fontSize: 12, color: COLORS.textLight },
  buyerLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  priceComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  priceBlock: { alignItems: 'center' },
  priceLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  offerPrice: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  savingsBlock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savingsText: { fontSize: 14, fontWeight: '600', color: COLORS.success },
  savingsAmount: { fontSize: 16, fontWeight: '600', color: COLORS.success },

  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 10,
  },
  messageText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    marginBottom: 10,
  },
  counterText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  responseBox: {
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  responseText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },

  actions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.error },
  counterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  counterBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.success,
  },
  acceptBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  authRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  authTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  authSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  signInBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, marginTop: 8 },
  signInBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalContent: { padding: 16 },

  priceRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  priceRangeItem: { alignItems: 'center' },
  priceRangeLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  priceRangeValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencySymbol: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginRight: 8 },
  priceInput: { flex: 1, fontSize: 24, fontWeight: '700', color: COLORS.text, paddingVertical: 16 },
  messageInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
