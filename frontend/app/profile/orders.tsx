import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { sandboxUtils } from '../../src/utils/sandboxAwareApi';
import { useAuthStore } from '../../src/store/authStore';
import { useSandbox } from '../../src/utils/sandboxContext';
import { getCachedSync, setCacheSync, CACHE_KEYS } from '../../src/utils/cacheManager';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#1565C0',
};

interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  status: string;
  total_amount: number;
  transport_cost: number;
  vat_amount: number;
  commission_amount: number;
  currency: string;
  delivery_method: string;
  created_at: string;
  listing?: {
    title: string;
    images: string[];
  };
  buyer?: {
    name: string;
  };
  escrow_status?: string;
}

export default function SellerOrdersScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isSandboxMode, sandboxSession } = useSandbox();
  
  // Cache-first: Initialize with cached data for instant render
  const cachedOrders = getCachedSync<Order[]>(CACHE_KEYS.ORDERS);
  const [orders, setOrders] = useState<Order[]>(cachedOrders || []);
  const [isFetchingInBackground, setIsFetchingInBackground] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const [shipModalOrder, setShipModalOrder] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    shipped: 0,
    completed: 0,
    total_earnings: 0,
    in_escrow: 0,
  });
  
  useEffect(() => {
    // In sandbox mode, don't require auth
    checkAndFetch();
  }, [isAuthenticated, isSandboxMode]);
  
  const checkAndFetch = async () => {
    const sandboxActive = await sandboxUtils.isActive();
    setIsSandbox(sandboxActive);
    
    if (!sandboxActive && !isAuthenticated) {
      router.replace('/login?redirect=/profile/orders');
      return;
    }
    fetchOrders();
  };
  
  const fetchOrders = async () => {
    setIsFetchingInBackground(true);
    try {
      const sandboxActive = await sandboxUtils.isActive();
      
      let ordersData: Order[] = [];
      
      if (sandboxActive) {
        // Fetch sandbox orders
        const session = await sandboxUtils.getSession();
        const userId = session?.sandbox_user_id;
        
        if (userId) {
          const response = await api.get(`/sandbox/proxy/orders/${userId}`);
          ordersData = response.data || [];
          
          // Add mock listing and buyer data for sandbox orders
          ordersData = ordersData.map((order: Order) => ({
            ...order,
            listing: order.listing || {
              title: `[SANDBOX] Order Item`,
              images: ['https://picsum.photos/seed/' + order.id + '/200/200']
            },
            buyer: order.buyer || { name: 'Sandbox Buyer' },
            sandbox_mode: true
          }));
        }
      } else {
        // Normal production flow
        const response = await api.get('/escrow/seller/orders');
        ordersData = response.data.orders || [];
      }
      
      setOrders(ordersData);
      // Update cache
      setCacheSync(CACHE_KEYS.ORDERS, ordersData);
      
      // Calculate stats
      const pending = ordersData.filter((o: Order) => o.status === 'paid' || o.status === 'pending').length;
      const shipped = ordersData.filter((o: Order) => o.status === 'shipped' || o.status === 'in_transit').length;
      const completed = ordersData.filter((o: Order) => o.status === 'completed').length;
      const totalEarnings = ordersData
        .filter((o: Order) => o.status === 'completed')
        .reduce((sum: number, o: Order) => sum + ((o.total_amount || o.total || 0) - (o.commission_amount || o.commission || 0)), 0);
      const inEscrow = ordersData
        .filter((o: Order) => ['paid', 'shipped', 'funded'].includes(o.status))
        .reduce((sum: number, o: Order) => sum + (o.total_amount || o.total || 0), 0);
      
      setStats({
        pending,
        shipped,
        completed,
        total_earnings: totalEarnings,
        in_escrow: inEscrow,
      });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      // Only show error if no cached data
      if (!cachedOrders?.length) {
        Alert.alert('Error', 'Failed to load orders');
      }
    } finally {
      setIsFetchingInBackground(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);
  
  const handleMarkShipped = async (orderId: string) => {
    setProcessingOrder(orderId);
    try {
      await api.post(`/escrow/seller/orders/${orderId}/ship`, {
        tracking_number: trackingInput || undefined,
      });
      Alert.alert('Success', 'Order marked as shipped. Buyer has been notified.');
      setShipModalOrder(null);
      setTrackingInput('');
      fetchOrders();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update order');
    } finally {
      setProcessingOrder(null);
    }
  };
  
  const formatPrice = (price: number, currency: string = 'TZS') => {
    const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', TZS: 'TZS' };
    return `${symbols[currency] || currency} ${(price || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return COLORS.textSecondary;
      case 'paid': return COLORS.info;
      case 'shipped': return COLORS.warning;
      case 'delivered': return COLORS.success;
      case 'completed': return COLORS.primary;
      case 'disputed': return COLORS.error;
      case 'cancelled': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'Awaiting Payment';
      case 'paid': return 'Paid - Ship Now';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'disputed': return 'Disputed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };
  
  const getImageUri = (img: string) => {
    if (!img) return null;
    if (img.startsWith('data:') || img.startsWith('http')) return img;
    return `data:image/jpeg;base64,${img}`;
  };
  
  // Remove loading blocker - show content immediately with cached data
  // Background fetch will update UI when fresh data arrives
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Sandbox Banner */}
      {isSandbox && (
        <View style={styles.sandboxBanner}>
          <Ionicons name="flask" size={16} color="#FFF" />
          <Text style={styles.sandboxText}>SANDBOX MODE - Viewing test orders</Text>
        </View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isSandbox ? '🧪 Sandbox Orders' : 'Online Orders'}</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>To Ship</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="airplane-outline" size={20} color={COLORS.info} />
            </View>
            <Text style={styles.statValue}>{stats.shipped}</Text>
            <Text style={styles.statLabel}>In Transit</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
        
        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <View>
              <Text style={styles.earningsLabel}>In Escrow</Text>
              <Text style={styles.earningsValue}>{formatPrice(stats.in_escrow)}</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View>
              <Text style={styles.earningsLabel}>Total Earned</Text>
              <Text style={[styles.earningsValue, { color: COLORS.primary }]}>
                {formatPrice(stats.total_earnings)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Orders List */}
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>
              Online orders from verified buyers will appear here
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}15` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.orderBody}>
                {(order.listing?.images?.[0] || order.listing_image) && (
                  <Image 
                    source={{ uri: getImageUri(order.listing?.images?.[0] || order.listing_image) }} 
                    style={styles.orderImage} 
                  />
                )}
                <View style={styles.orderDetails}>
                  <Text style={styles.orderTitle} numberOfLines={2}>
                    {order.listing?.title || order.listing_title || 'Item'}
                  </Text>
                  <Text style={styles.orderBuyer}>
                    <Ionicons name="person-outline" size={12} color={COLORS.textSecondary} />
                    {' '}{order.buyer?.name || order.buyer_id || 'Buyer'}
                  </Text>
                  <View style={styles.orderDelivery}>
                    <Ionicons 
                      name={order.delivery_method === 'pickup' ? 'location-outline' : 'car-outline'} 
                      size={14} 
                      color={COLORS.textSecondary} 
                    />
                    <Text style={styles.deliveryText}>
                      {order.delivery_method === 'pickup' ? 'Pickup' : 'Door Delivery'}
                    </Text>
                  </View>
                  {/* Escrow Badge */}
                  {order.escrow_status && (
                    <View style={[styles.escrowBadge, { 
                      backgroundColor: order.escrow_status === 'funded' ? '#DBEAFE' : 
                                       order.escrow_status === 'released' ? '#DCFCE7' : 
                                       order.escrow_status === 'refunded' ? '#FEF3C7' : '#F3F4F6'
                    }]}>
                      <Ionicons name="shield-checkmark" size={12} color={
                        order.escrow_status === 'funded' ? COLORS.info :
                        order.escrow_status === 'released' ? COLORS.primary :
                        order.escrow_status === 'refunded' ? COLORS.warning : COLORS.textSecondary
                      } />
                      <Text style={[styles.escrowBadgeText, { 
                        color: order.escrow_status === 'funded' ? COLORS.info :
                               order.escrow_status === 'released' ? COLORS.primary :
                               order.escrow_status === 'refunded' ? COLORS.warning : COLORS.textSecondary
                      }]}>
                        {order.escrow_status === 'funded' ? 'Funds Held' :
                         order.escrow_status === 'released' ? 'Released to You' :
                         order.escrow_status === 'refunded' ? 'Refunded' :
                         order.escrow_status === 'not_funded' ? 'Awaiting Payment' :
                         order.escrow_status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  )}
                  {/* Tracking Number */}
                  {order.tracking_number && (
                    <View style={styles.trackingBadge}>
                      <Ionicons name="locate-outline" size={12} color={COLORS.primary} />
                      <Text style={styles.trackingBadgeText}>Track: {order.tracking_number}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.orderPricing}>
                  <Text style={styles.orderTotal}>{formatPrice(order.total_amount, order.currency)}</Text>
                  <Text style={styles.orderNet}>
                    You get: {formatPrice((order.total_amount || 0) - (order.commission_amount || 0), order.currency)}
                  </Text>
                </View>
              </View>
              
              {/* Track Order Button */}
              <TouchableOpacity
                style={styles.trackBtn}
                onPress={() => router.push(`/profile/order-tracking?id=${order.id}`)}
              >
                <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
                <Text style={styles.trackBtnText}>Track Order</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              
              {/* Action Buttons */}
              {order.status === 'paid' && (
                <TouchableOpacity
                  style={styles.shipBtn}
                  onPress={() => { setShipModalOrder(order.id); setTrackingInput(''); }}
                  disabled={processingOrder === order.id}
                >
                  {processingOrder === order.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="airplane" size={18} color="#fff" />
                      <Text style={styles.shipBtnText}>Mark as Shipped</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {order.status === 'shipped' && (
                <View style={styles.awaitingConfirmation}>
                  <Ionicons name="hourglass-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.awaitingText}>
                    Awaiting buyer confirmation. Funds will auto-release in 7 days.
                  </Text>
                </View>
              )}
              
              {order.status === 'disputed' && (
                <View style={styles.disputeBanner}>
                  <Ionicons name="warning" size={16} color={COLORS.error} />
                  <Text style={styles.disputeText}>
                    This order is under dispute. Our team is reviewing.
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
        
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Funds are held in escrow until buyers confirm delivery. After shipping, 
            funds auto-release in 7 days if no dispute is raised.
          </Text>
        </View>
      </ScrollView>
      {/* Ship Modal */}
      <Modal
        visible={!!shipModalOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setShipModalOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ship Order</Text>
            <Text style={styles.modalDesc}>Add a tracking number (optional) to help the buyer track their delivery.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Tracking number (optional)"
              value={trackingInput}
              onChangeText={setTrackingInput}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShipModalOrder(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => shipModalOrder && handleMarkShipped(shipModalOrder)}
                disabled={!!processingOrder}
              >
                {processingOrder === shipModalOrder ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Shipment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  
  content: { flex: 1, padding: 16 },
  
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  
  earningsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  earningsDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  earningsLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  earningsValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
  
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderDate: { fontSize: 12, color: COLORS.textSecondary },
  
  orderBody: { flexDirection: 'row' },
  orderImage: { width: 60, height: 60, borderRadius: 8 },
  orderDetails: { flex: 1, marginLeft: 12 },
  orderTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  orderBuyer: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  orderDelivery: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  deliveryText: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 4 },
  orderPricing: { alignItems: 'flex-end' },
  orderTotal: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  orderNet: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  
  shipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.info,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  shipBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  
  awaitingConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  awaitingText: { flex: 1, fontSize: 12, color: '#92400E', marginLeft: 8 },
  
  disputeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  disputeText: { flex: 1, fontSize: 12, color: COLORS.error, marginLeft: 8 },
  
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 13, color: '#0369A1', marginLeft: 10, lineHeight: 18 },
  
  // Escrow & Tracking badges
  escrowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6,
  },
  escrowBadgeText: { fontSize: 11, fontWeight: '600' },
  trackingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    alignSelf: 'flex-start', marginTop: 4,
  },
  trackingBadgeText: { fontSize: 11, fontWeight: '500', color: COLORS.primary },
  
  // Track button
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F5E9', paddingVertical: 10, borderRadius: 10, marginTop: 10, gap: 6,
  },
  trackBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  
  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  modalDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 18 },
  modalInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.text, marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F0F0F0', alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
