import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { sandboxAwareListingsApi, sandboxUtils } from '../../src/utils/sandboxAwareApi';
import { useAuthStore } from '../../src/store/authStore';
import { useSandbox } from '../../src/utils/sandboxContext';

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
};

type DeliveryMethod = 'pickup' | 'door_delivery';
type PaymentMethod = 'stripe' | 'paypal' | 'mobile_money';

interface DeliveryAddress {
  full_name: string;
  phone: string;
  street_address: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
}

interface PriceBreakdown {
  item_price: number;
  item_quantity: number;
  subtotal: number;
  transport_cost: number;
  estimated_delivery_days: number;
  vat_amount: number;
  vat_percentage: number;
  total_amount: number;
  seller_receives: number;
  currency: string;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { listing_id } = useLocalSearchParams<{ listing_id: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const { isSandboxMode, sandboxSession } = useSandbox();
  
  // State
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [step, setStep] = useState(1); // 1: Summary, 2: Delivery, 3: Payment, 4: Review
  const [isSandbox, setIsSandbox] = useState(false);
  
  // Delivery
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    full_name: '',
    phone: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [mobilePhone, setMobilePhone] = useState('');
  
  // Price calculation
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  
  // Fetch listing on mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?redirect=/checkout/' + listing_id);
      return;
    }
    fetchListing();
  }, [listing_id, isAuthenticated]);
  
  // Recalculate price when delivery method changes
  useEffect(() => {
    if (listing) {
      calculatePrice();
    }
  }, [deliveryMethod, deliveryAddress.country, listing]);
  
  const fetchListing = async () => {
    try {
      // Check if sandbox mode is active
      const sandboxActive = await sandboxUtils.isActive();
      setIsSandbox(sandboxActive);
      
      let listingData;
      
      if (sandboxActive) {
        // Use sandbox proxy API
        listingData = await sandboxAwareListingsApi.getOne(listing_id!);
        setListing(listingData);
        // In sandbox mode, always allow checkout
      } else {
        // Normal production flow
        const response = await api.get(`/listings/${listing_id}`);
        listingData = response.data;
        setListing(listingData);
        
        // Check if seller can sell online
        const sellerCheck = await api.get(`/escrow/seller/${listingData.user_id}/can-sell-online`);
        if (!sellerCheck.data.can_sell_online) {
          Alert.alert('Not Available', sellerCheck.data.reason || 'This seller cannot accept online payments.');
          router.back();
          return;
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load listing');
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  const calculatePrice = async () => {
    if (!listing) return;
    
    setCalculatingPrice(true);
    try {
      if (isSandbox) {
        // In sandbox mode, calculate price locally (mock calculation)
        const subtotal = listing.price || 100000;
        const vat = Math.round(subtotal * 0.18);
        const transportCost = deliveryMethod === 'door_delivery' ? 15000 : 0;
        const total = subtotal + vat + transportCost;
        const commission = Math.round(subtotal * 0.05);
        
        setPriceBreakdown({
          item_price: subtotal,
          item_quantity: 1,
          subtotal: subtotal,
          transport_cost: transportCost,
          estimated_delivery_days: 3,
          vat_amount: vat,
          vat_percentage: 18,
          total_amount: total,
          seller_receives: subtotal - commission,
          currency: listing.currency || 'TZS',
        });
      } else {
        // Normal production flow
        const response = await api.post('/escrow/calculate-order-price', {
          listing_id: listing.id,
          quantity: 1,
          delivery_method: deliveryMethod,
          delivery_address: deliveryMethod === 'door_delivery' ? deliveryAddress : null,
          buyer_country: deliveryAddress.country || 'US',
        });
        setPriceBreakdown(response.data);
      }
    } catch (error: any) {
      console.error('Price calculation error:', error);
    } finally {
      setCalculatingPrice(false);
    }
  };
  
  const handleCreateOrder = async () => {
    if (!listing || !priceBreakdown) return;
    
    // Validation
    if (deliveryMethod === 'door_delivery') {
      if (!deliveryAddress.full_name || !deliveryAddress.phone || !deliveryAddress.street_address || !deliveryAddress.city) {
        Alert.alert('Error', 'Please fill in all required delivery address fields');
        return;
      }
    }
    
    if (paymentMethod === 'mobile_money' && !mobilePhone) {
      Alert.alert('Error', 'Please enter your mobile phone number for Mobile Money payment');
      return;
    }
    
    setProcessing(true);
    try {
      if (isSandbox) {
        // SANDBOX MODE: Use sandbox proxy API for order creation
        const session = await sandboxUtils.getSession();
        
        // Create sandbox order through proxy
        const orderResponse = await api.post('/sandbox/proxy/order', {
          session_id: session?.id,
          listing_id: listing.id,
          shipping_address: deliveryMethod === 'door_delivery' ? deliveryAddress : {
            full_name: 'Sandbox Buyer',
            phone: '+255700000000',
            address: 'Pickup Point'
          }
        });
        
        const order = orderResponse.data.order;
        
        // Process mock payment through sandbox
        const paymentResponse = await api.post('/sandbox/payment/process', {
          order_id: order.id,
          amount: priceBreakdown.total_amount,
          method: paymentMethod,
          simulate_failure: false
        });
        
        if (paymentResponse.data.success) {
          // Sandbox payment successful - show success page
          Alert.alert(
            'Sandbox Order Complete',
            `Order ${order.id} created successfully!\n\nThis is a sandbox transaction - no real payment was processed.`,
            [{ 
              text: 'View Order', 
              onPress: () => router.push(`/checkout/success?order_id=${order.id}&sandbox=true`) 
            }]
          );
        } else {
          Alert.alert(
            'Sandbox Payment Simulated Failure',
            'This is a test - the payment was intentionally failed for testing purposes.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // PRODUCTION MODE: Normal order creation flow
        const orderResponse = await api.post('/escrow/orders/create', {
          listing_id: listing.id,
          quantity: 1,
          delivery_method: deliveryMethod,
          delivery_address: deliveryMethod === 'door_delivery' ? deliveryAddress : null,
          payment_method: paymentMethod,
          notes: '',
        });
        
        const order = orderResponse.data.order;
        const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://admin-badges-1.preview.emergentagent.com';
        
        // Create payment
        let paymentResponse;
        if (paymentMethod === 'mobile_money') {
          paymentResponse = await api.post('/payments/mobile-money', {
            order_id: order.id,
            phone_number: mobilePhone,
            origin_url: originUrl,
          });
          
          Alert.alert(
            'Payment Initiated',
            'Please check your phone to authorize the M-Pesa payment.',
            [{ text: 'OK', onPress: () => router.push(`/checkout/pending?order_id=${order.id}&tx_ref=${paymentResponse.data.tx_ref}`) }]
          );
        } else {
          paymentResponse = await api.post('/payments/create', {
            order_id: order.id,
            provider: paymentMethod,
            origin_url: originUrl,
          });
          
          // Redirect to payment provider
          if (paymentResponse.data.checkout_url) {
            if (typeof window !== 'undefined') {
              window.location.href = paymentResponse.data.checkout_url;
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Order creation error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };
  
  const formatPrice = (price: number, currency: string = 'EUR') => {
    const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', TZS: 'TSh' };
    return `${symbols[currency] || currency} ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };
  
  const getImageUri = (img: string) => {
    if (!img) return null;
    if (img.startsWith('data:') || img.startsWith('http')) return img;
    return `data:image/jpeg;base64,${img}`;
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading checkout...</Text>
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
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Sandbox Mode Indicator */}
      {isSandbox && (
        <View style={styles.sandboxBanner}>
          <Ionicons name="flask" size={16} color="#FFF" />
          <Text style={styles.sandboxText}>SANDBOX MODE - No real payments will be processed</Text>
        </View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isSandbox ? '🧪 Sandbox Checkout' : 'Checkout'}</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Steps Indicator */}
      <View style={styles.stepsContainer}>
        {['Summary', 'Delivery', 'Payment', 'Review'].map((label, index) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepCircle, step > index && styles.stepCompleted, step === index + 1 && styles.stepActive]}>
              {step > index + 1 ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text style={[styles.stepNumber, (step > index || step === index + 1) && styles.stepNumberActive]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, step === index + 1 && styles.stepLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Step 1: Order Summary */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            {/* Item Card */}
            <View style={styles.itemCard}>
              {listing.images?.[0] && (
                <Image source={{ uri: getImageUri(listing.images[0]) }} style={styles.itemImage} />
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle}>{listing.title}</Text>
                <Text style={styles.itemPrice}>{formatPrice(listing.price)}</Text>
                <View style={styles.itemMeta}>
                  <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.itemMetaText}>{listing.location}</Text>
                </View>
              </View>
            </View>
            
            {/* Seller Info */}
            <View style={styles.sellerCard}>
              <Text style={styles.sellerLabel}>Sold by</Text>
              <View style={styles.sellerInfo}>
                {listing.seller?.picture ? (
                  <Image source={{ uri: listing.seller.picture }} style={styles.sellerAvatar} />
                ) : (
                  <View style={styles.sellerAvatarPlaceholder}>
                    <Ionicons name="person" size={20} color={COLORS.primary} />
                  </View>
                )}
                <View>
                  <Text style={styles.sellerName}>{listing.seller?.name || 'Seller'}</Text>
                  {listing.seller?.verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
                      <Text style={styles.verifiedText}>Verified Seller</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            
            {/* Escrow Protection Banner */}
            <View style={styles.escrowBanner}>
              <Ionicons name="lock-closed" size={24} color={COLORS.primary} />
              <View style={styles.escrowInfo}>
                <Text style={styles.escrowTitle}>Protected by Escrow</Text>
                <Text style={styles.escrowText}>
                  Your payment is held securely until you confirm delivery of your order.
                </Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.continueBtn} onPress={() => setStep(2)}>
              <Text style={styles.continueBtnText}>Continue to Delivery</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Step 2: Delivery */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Delivery Method</Text>
            
            {/* Pickup Option */}
            <TouchableOpacity
              style={[styles.deliveryOption, deliveryMethod === 'pickup' && styles.deliveryOptionSelected]}
              onPress={() => setDeliveryMethod('pickup')}
            >
              <View style={styles.deliveryOptionHeader}>
                <View style={[styles.radioOuter, deliveryMethod === 'pickup' && styles.radioOuterSelected]}>
                  {deliveryMethod === 'pickup' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.deliveryOptionInfo}>
                  <Text style={styles.deliveryOptionTitle}>Pickup</Text>
                  <Text style={styles.deliveryOptionDesc}>Collect from seller's location</Text>
                </View>
                <Text style={styles.deliveryPrice}>Free</Text>
              </View>
            </TouchableOpacity>
            
            {/* Door Delivery Option */}
            <TouchableOpacity
              style={[styles.deliveryOption, deliveryMethod === 'door_delivery' && styles.deliveryOptionSelected]}
              onPress={() => setDeliveryMethod('door_delivery')}
            >
              <View style={styles.deliveryOptionHeader}>
                <View style={[styles.radioOuter, deliveryMethod === 'door_delivery' && styles.radioOuterSelected]}>
                  {deliveryMethod === 'door_delivery' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.deliveryOptionInfo}>
                  <Text style={styles.deliveryOptionTitle}>Door Delivery</Text>
                  <Text style={styles.deliveryOptionDesc}>Delivered to your address</Text>
                </View>
                {priceBreakdown && (
                  <Text style={styles.deliveryPrice}>
                    {formatPrice(priceBreakdown.transport_cost, priceBreakdown.currency)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            
            {/* Delivery Address Form */}
            {deliveryMethod === 'door_delivery' && (
              <View style={styles.addressForm}>
                <Text style={styles.formTitle}>Delivery Address</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={deliveryAddress.full_name}
                    onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, full_name: text })}
                    placeholder="John Doe"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={deliveryAddress.phone}
                    onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, phone: text })}
                    placeholder="+1 234 567 8900"
                    keyboardType="phone-pad"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Street Address *</Text>
                  <TextInput
                    style={styles.input}
                    value={deliveryAddress.street_address}
                    onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, street_address: text })}
                    placeholder="123 Main Street, Apt 4B"
                  />
                </View>
                
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>City *</Text>
                    <TextInput
                      style={styles.input}
                      value={deliveryAddress.city}
                      onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, city: text })}
                      placeholder="New York"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={deliveryAddress.state}
                      onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, state: text })}
                      placeholder="NY"
                    />
                  </View>
                </View>
                
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Postal Code</Text>
                    <TextInput
                      style={styles.input}
                      value={deliveryAddress.postal_code}
                      onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, postal_code: text })}
                      placeholder="10001"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.inputLabel}>Country *</Text>
                    <TextInput
                      style={styles.input}
                      value={deliveryAddress.country}
                      onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, country: text })}
                      placeholder="US"
                    />
                  </View>
                </View>
              </View>
            )}
            
            {/* Estimated Delivery */}
            {deliveryMethod === 'door_delivery' && priceBreakdown && priceBreakdown.estimated_delivery_days > 0 && (
              <View style={styles.deliveryEstimate}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.deliveryEstimateText}>
                  Estimated delivery: {priceBreakdown.estimated_delivery_days} days
                </Text>
              </View>
            )}
            
            <View style={styles.navigationBtns}>
              <TouchableOpacity style={styles.backNavBtn} onPress={() => setStep(1)}>
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.backNavBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.continueBtn} onPress={() => setStep(3)}>
                <Text style={styles.continueBtnText}>Continue to Payment</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Step 3: Payment */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            
            {/* Card Payment (Stripe) */}
            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'stripe' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod('stripe')}
            >
              <View style={[styles.radioOuter, paymentMethod === 'stripe' && styles.radioOuterSelected]}>
                {paymentMethod === 'stripe' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.paymentOptionInfo}>
                <Ionicons name="card-outline" size={24} color={COLORS.text} />
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Card Payment</Text>
                  <Text style={styles.paymentOptionDesc}>Visa, Mastercard, AMEX</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* PayPal */}
            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'paypal' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod('paypal')}
            >
              <View style={[styles.radioOuter, paymentMethod === 'paypal' && styles.radioOuterSelected]}>
                {paymentMethod === 'paypal' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.paymentOptionInfo}>
                <Ionicons name="logo-paypal" size={24} color="#003087" />
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>PayPal</Text>
                  <Text style={styles.paymentOptionDesc}>Pay with your PayPal account</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Mobile Money */}
            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === 'mobile_money' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod('mobile_money')}
            >
              <View style={[styles.radioOuter, paymentMethod === 'mobile_money' && styles.radioOuterSelected]}>
                {paymentMethod === 'mobile_money' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.paymentOptionInfo}>
                <Ionicons name="phone-portrait-outline" size={24} color={COLORS.text} />
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Mobile Money</Text>
                  <Text style={styles.paymentOptionDesc}>Vodacom M-Pesa (Tanzania)</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Mobile Phone Input */}
            {paymentMethod === 'mobile_money' && (
              <View style={styles.mobilePhoneInput}>
                <Text style={styles.inputLabel}>Mobile Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={mobilePhone}
                  onChangeText={setMobilePhone}
                  placeholder="255XXXXXXXXX"
                  keyboardType="phone-pad"
                />
                <Text style={styles.inputHint}>Enter your Vodacom number in format: 255XXXXXXXXX</Text>
              </View>
            )}
            
            <View style={styles.navigationBtns}>
              <TouchableOpacity style={styles.backNavBtn} onPress={() => setStep(2)}>
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.backNavBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.continueBtn} onPress={() => setStep(4)}>
                <Text style={styles.continueBtnText}>Review Order</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Step 4: Review & Confirm */}
        {step === 4 && priceBreakdown && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Review Order</Text>
            
            {/* Order Summary */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Item</Text>
                <Text style={styles.reviewValue}>{listing.title}</Text>
              </View>
              
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Delivery</Text>
                <Text style={styles.reviewValue}>
                  {deliveryMethod === 'pickup' ? 'Pickup' : 'Door Delivery'}
                </Text>
              </View>
              
              {deliveryMethod === 'door_delivery' && (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Ship to</Text>
                  <Text style={styles.reviewValue}>{deliveryAddress.city}, {deliveryAddress.country}</Text>
                </View>
              )}
              
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Payment</Text>
                <Text style={styles.reviewValue}>
                  {paymentMethod === 'stripe' ? 'Card' : paymentMethod === 'paypal' ? 'PayPal' : 'Mobile Money'}
                </Text>
              </View>
            </View>
            
            {/* Price Breakdown */}
            <View style={styles.priceCard}>
              <Text style={styles.priceCardTitle}>Price Breakdown</Text>
              
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>{formatPrice(priceBreakdown.subtotal, priceBreakdown.currency)}</Text>
              </View>
              
              {priceBreakdown.transport_cost > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Delivery</Text>
                  <Text style={styles.priceValue}>{formatPrice(priceBreakdown.transport_cost, priceBreakdown.currency)}</Text>
                </View>
              )}
              
              {priceBreakdown.vat_amount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>VAT ({priceBreakdown.vat_percentage}%)</Text>
                  <Text style={styles.priceValue}>{formatPrice(priceBreakdown.vat_amount, priceBreakdown.currency)}</Text>
                </View>
              )}
              
              <View style={styles.priceDivider} />
              
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(priceBreakdown.total_amount, priceBreakdown.currency)}</Text>
              </View>
            </View>
            
            {/* Escrow Notice */}
            <View style={styles.escrowNotice}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.escrowNoticeText}>
                Your payment will be held in escrow until you confirm delivery. If there's an issue, 
                you can open a dispute and our team will help resolve it.
              </Text>
            </View>
            
            <View style={styles.navigationBtns}>
              <TouchableOpacity style={styles.backNavBtn} onPress={() => setStep(3)}>
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.backNavBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.payBtn, processing && styles.payBtnDisabled]} 
                onPress={handleCreateOrder}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={20} color="#fff" />
                    <Text style={styles.payBtnText}>
                      Pay {formatPrice(priceBreakdown.total_amount, priceBreakdown.currency)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 16 },
  
  sandboxBanner: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sandboxText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCompleted: { backgroundColor: COLORS.primary },
  stepActive: { backgroundColor: COLORS.primary },
  stepNumber: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  stepNumberActive: { color: '#fff' },
  stepLabel: { fontSize: 10, color: COLORS.textSecondary },
  stepLabelActive: { color: COLORS.primary, fontWeight: '600' },
  
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  stepContent: {},
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  
  // Item Card
  itemCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemImage: { width: 80, height: 80, borderRadius: 8 },
  itemDetails: { flex: 1, marginLeft: 12 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  itemPrice: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'center' },
  itemMetaText: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 4 },
  
  // Seller Card
  sellerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sellerLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  sellerInfo: { flexDirection: 'row', alignItems: 'center' },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20 },
  sellerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginLeft: 10 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 10, marginTop: 2 },
  verifiedText: { fontSize: 12, color: COLORS.primary, marginLeft: 4 },
  
  // Escrow Banner
  escrowBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  escrowInfo: { flex: 1, marginLeft: 12 },
  escrowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  escrowText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  
  // Continue Button
  continueBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', marginRight: 8 },
  
  // Delivery Options
  deliveryOption: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deliveryOptionSelected: { borderColor: COLORS.primary },
  deliveryOptionHeader: { flexDirection: 'row', alignItems: 'center' },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  deliveryOptionInfo: { flex: 1, marginLeft: 12 },
  deliveryOptionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  deliveryOptionDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  deliveryPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  
  // Address Form
  addressForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  formTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputRow: { flexDirection: 'row' },
  inputHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  
  deliveryEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  deliveryEstimateText: { fontSize: 14, color: COLORS.primary, marginLeft: 8, fontWeight: '500' },
  
  // Navigation Buttons
  navigationBtns: { flexDirection: 'row', marginTop: 8 },
  backNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  backNavBtnText: { fontSize: 15, color: COLORS.primary, marginLeft: 4, fontWeight: '600' },
  
  // Payment Options
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: { borderColor: COLORS.primary },
  paymentOptionInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  paymentOptionText: { marginLeft: 12 },
  paymentOptionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  paymentOptionDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  
  mobilePhoneInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  
  // Review
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reviewLabel: { fontSize: 14, color: COLORS.textSecondary },
  reviewValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, maxWidth: '60%', textAlign: 'right' },
  
  // Price Card
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  priceCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  priceLabel: { fontSize: 14, color: COLORS.textSecondary },
  priceValue: { fontSize: 14, color: COLORS.text },
  priceDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  totalRow: { paddingTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  
  // Escrow Notice
  escrowNotice: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  escrowNoticeText: { flex: 1, fontSize: 12, color: '#0369A1', marginLeft: 8, lineHeight: 18 },
  
  // Pay Button
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', marginLeft: 8 },
});
