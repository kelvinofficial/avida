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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#16A34A',
  warning: '#F59E0B',
  info: '#1565C0',
  error: '#DC2626',
};

interface Order {
  id: string;
  listing_id: string;
  status: string;
  total_amount: number;
  transport_cost: number;
  vat_amount: number;
  currency: string;
  delivery_method: string;
  delivery_address?: any;
  created_at: string;
  shipped_at?: string;
  delivered_at?: string;
  item?: {
    title: string;
    price: number;
    image_url?: string;
  };
  seller?: {
    name: string;
  };
  escrow_status?: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending_payment':
      return { color: COLORS.textSecondary, icon: 'time-outline', label: 'Awaiting Payment', bg: '#F3F4F6' };
    case 'paid':
      return { color: COLORS.info, icon: 'shield-checkmark', label: 'In Escrow', bg: '#DBEAFE' };
    case 'shipped':
      return { color: COLORS.warning, icon: 'airplane', label: 'Shipped', bg: '#FEF3C7' };
    case 'delivered':
      return { color: COLORS.primary, icon: 'checkmark-done', label: 'Delivered', bg: COLORS.primaryLight };
    case 'completed':
      return { color: COLORS.success, icon: 'checkmark-circle', label: 'Completed', bg: '#DCFCE7' };
    case 'disputed':
      return { color: COLORS.error, icon: 'warning', label: 'Disputed', bg: '#FEE2E2' };
    case 'refunded':
      return { color: COLORS.textSecondary, icon: 'return-down-back', label: 'Refunded', bg: '#F3F4F6' };
    case 'cancelled':
      return { color: COLORS.textSecondary, icon: 'close-circle', label: 'Cancelled', bg: '#F3F4F6' };
    default:
      return { color: COLORS.textSecondary, icon: 'help-outline', label: status, bg: '#F3F4F6' };
  }
};

const getEscrowInfo = (status: string) => {
  switch (status) {
    case 'paid':
      return { message: 'Payment held securely in escrow', showAction: false };
    case 'shipped':
      return { message: 'Confirm when you receive your item', showAction: true, action: 'confirm' };
    case 'delivered':
      return { message: 'Waiting for your confirmation', showAction: true, action: 'confirm' };
    default:
      return null;
  }
};

const formatPrice = (price: number, currency: string = 'EUR') => {
  const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', TZS: 'TSh' };
  return `${symbols[currency] || currency} ${price?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`;
};

const getImageUri = (img: string | undefined) => {
  if (!img) return 'https://via.placeholder.com/80';
  if (img.startsWith('data:') || img.startsWith('http')) return img;
  return `data:image/jpeg;base64,${img}`;
};

// Skeleton Loader
const SkeletonItem = () => (
  <View style={styles.skeletonItem}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
      <View style={[styles.skeletonLine, { width: '50%' }]} />
    </View>
  </View>
);

// Order Item Component
const OrderItem = ({ 
  order, 
  onPress, 
  onConfirmDelivery,
  onOpenDispute,
  processing 
}: { 
  order: Order; 
  onPress: () => void;
  onConfirmDelivery: (orderId: string) => void;
  onOpenDispute: (orderId: string) => void;
  processing: string | null;
}) => {
  const statusConfig = getStatusConfig(order.status);
  const escrowInfo = getEscrowInfo(order.status);
  
  return (
    <View style={styles.orderCard}>
      <TouchableOpacity style={styles.orderContent} onPress={onPress}>
        <Image
          source={{ uri: getImageUri(order.item?.image_url) }}
          style={styles.orderImage}
        />
        <View style={styles.orderDetails}>
          <Text style={styles.orderTitle} numberOfLines={2}>{order.item?.title || 'Item'}</Text>
          <Text style={styles.orderPrice}>{formatPrice(order.total_amount, order.currency)}</Text>
          
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          
          <View style={styles.orderMeta}>
            <Ionicons 
              name={order.delivery_method === 'pickup' ? 'location-outline' : 'car-outline'} 
              size={12} 
              color={COLORS.textSecondary} 
            />
            <Text style={styles.orderMetaText}>
              {order.delivery_method === 'pickup' ? 'Pickup' : 'Delivery'}
            </Text>
            <Text style={styles.orderMetaText}>•</Text>
            <Text style={styles.orderMetaText}>
              {new Date(order.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
      
      {/* Escrow Info Banner */}
      {escrowInfo && (
        <View style={styles.escrowBanner}>
          <View style={styles.escrowInfo}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.info} />
            <Text style={styles.escrowText}>{escrowInfo.message}</Text>
          </View>
        </View>
      )}
      
      {/* Action Buttons */}
      {(order.status === 'shipped' || order.status === 'delivered') && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirmDelivery(order.id)}
            disabled={processing === order.id}
          >
            {processing === order.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirm Received</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.disputeBtn}
            onPress={() => onOpenDispute(order.id)}
          >
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.disputeBtnText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Shipped Tracking Info */}
      {order.status === 'shipped' && order.shipped_at && (
        <View style={styles.trackingInfo}>
          <Ionicons name="time-outline" size={14} color={COLORS.warning} />
          <Text style={styles.trackingText}>
            Shipped {new Date(order.shipped_at).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
};

// Empty State
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Ionicons name="bag-outline" size={48} color={COLORS.textSecondary} />
    </View>
    <Text style={styles.emptyTitle}>No purchases yet</Text>
    <Text style={styles.emptySubtitle}>Items you buy with escrow protection will appear here</Text>
  </View>
);

export default function PurchasesScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

  const fetchOrders = useCallback(async (refresh: boolean = false) => {
    try {
      const response = await api.get('/escrow/buyer/orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders(true);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  const handleConfirmDelivery = async (orderId: string) => {
    Alert.alert(
      'Confirm Delivery',
      'Are you sure you received this item? This will release the payment to the seller.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setProcessing(orderId);
            try {
              await api.post(`/escrow/orders/${orderId}/confirm`);
              Alert.alert('Success', 'Delivery confirmed. Payment has been released to the seller.');
              fetchOrders(true);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to confirm delivery');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenDispute = (orderId: string) => {
    Alert.alert(
      'Report an Issue',
      'What issue do you want to report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Item Not Received',
          onPress: () => submitDispute(orderId, 'not_received', 'I have not received this item'),
        },
        {
          text: 'Item Not as Described',
          onPress: () => submitDispute(orderId, 'not_as_described', 'The item is different from the listing'),
        },
      ]
    );
  };

  const submitDispute = async (orderId: string, reason: string, description: string) => {
    setProcessing(orderId);
    try {
      await api.post(`/escrow/orders/${orderId}/dispute`, {
        reason,
        description,
      });
      Alert.alert('Dispute Opened', 'Our team will review your case and get back to you.');
      fetchOrders(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to open dispute');
    } finally {
      setProcessing(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['paid', 'shipped', 'delivered'].includes(order.status);
    if (activeTab === 'completed') return ['completed', 'refunded'].includes(order.status);
    return true;
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Purchases</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginMessage}>Please sign in to view purchases</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Purchases</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>Completed</Text>
        </TouchableOpacity>
      </View>

      {/* Escrow Protection Banner */}
      <View style={styles.protectionBanner}>
        <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
        <Text style={styles.protectionText}>
          All purchases are protected by escrow. Funds released only after you confirm delivery.
        </Text>
      </View>

      {loading && !refreshing ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <SkeletonItem />}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderItem
              order={item}
              onPress={() => router.push(`/listing/${item.listing_id}`)}
              onConfirmDelivery={handleConfirmDelivery}
              onOpenDispute={handleOpenDispute}
              processing={processing}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  protectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  protectionText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  orderContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  orderImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  orderDetails: {
    flex: 1,
    marginLeft: 12,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  escrowBanner: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
  },
  escrowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  escrowText: {
    fontSize: 12,
    color: COLORS.info,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 12,
    paddingTop: 0,
    gap: 8,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  disputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  disputeBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.error,
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  trackingText: {
    fontSize: 12,
    color: '#92400E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  signInBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
  },
  skeletonImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: COLORS.background,
    borderRadius: 4,
  },
});
