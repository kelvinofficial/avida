import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { sandboxUtils } from '../../src/utils/sandboxAwareApi';
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
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    shipped: 0,
    completed: 0,
    total_earnings: 0,
    in_escrow: 0,
  });
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?redirect=/profile/orders');
      return;
    }
    fetchOrders();
  }, [isAuthenticated]);
  
  const fetchOrders = async () => {
    try {
      const response = await api.get('/escrow/seller/orders');
      setOrders(response.data.orders || []);
      
      // Calculate stats
      const pending = response.data.orders?.filter((o: Order) => o.status === 'paid').length || 0;
      const shipped = response.data.orders?.filter((o: Order) => o.status === 'shipped').length || 0;
      const completed = response.data.orders?.filter((o: Order) => o.status === 'completed').length || 0;
      const totalEarnings = response.data.orders
        ?.filter((o: Order) => o.status === 'completed')
        .reduce((sum: number, o: Order) => sum + (o.total_amount - o.commission_amount), 0) || 0;
      const inEscrow = response.data.orders
        ?.filter((o: Order) => ['paid', 'shipped'].includes(o.status))
        .reduce((sum: number, o: Order) => sum + o.total_amount, 0) || 0;
      
      setStats({
        pending,
        shipped,
        completed,
        total_earnings: totalEarnings,
        in_escrow: inEscrow,
      });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
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
      await api.post(`/escrow/orders/${orderId}/ship`);
      Alert.alert('Success', 'Order marked as shipped. Buyer has been notified.');
      fetchOrders();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update order');
    } finally {
      setProcessingOrder(null);
    }
  };
  
  const formatPrice = (price: number, currency: string = 'EUR') => {
    const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', TZS: 'TSh' };
    return `${symbols[currency] || currency} ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Online Orders</Text>
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
                {order.listing?.images?.[0] && (
                  <Image 
                    source={{ uri: getImageUri(order.listing.images[0]) }} 
                    style={styles.orderImage} 
                  />
                )}
                <View style={styles.orderDetails}>
                  <Text style={styles.orderTitle} numberOfLines={2}>
                    {order.listing?.title || 'Item'}
                  </Text>
                  <Text style={styles.orderBuyer}>
                    <Ionicons name="person-outline" size={12} color={COLORS.textSecondary} />
                    {' '}{order.buyer?.name || 'Buyer'}
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
                </View>
                <View style={styles.orderPricing}>
                  <Text style={styles.orderTotal}>{formatPrice(order.total_amount, order.currency)}</Text>
                  <Text style={styles.orderNet}>
                    You get: {formatPrice(order.total_amount - order.commission_amount, order.currency)}
                  </Text>
                </View>
              </View>
              
              {/* Action Buttons */}
              {order.status === 'paid' && (
                <TouchableOpacity
                  style={styles.shipBtn}
                  onPress={() => handleMarkShipped(order.id)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 16 },
  
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
});
