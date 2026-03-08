import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/utils/api';

const COLORS = {
  primary: '#2E7D32',
  text: '#1A1A1A',
  textSecondary: '#666',
  textLight: '#999',
  background: '#F8F9FA',
  card: '#fff',
  border: '#E8E8E8',
  info: '#2196F3',
  warning: '#FF9800',
  error: '#F44336',
  success: '#4CAF50',
};

interface TrackingEvent {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}

interface OrderTracking {
  order_id: string;
  status: string;
  tracking_number?: string;
  carrier?: string;
  estimated_delivery?: string;
  shipped_at?: string;
  delivered_at?: string;
  listing_title?: string;
  total_amount?: number;
  currency?: string;
  events: TrackingEvent[];
}

const STATUS_STEPS = [
  { key: 'paid', label: 'Confirmed', icon: 'checkmark-circle' },
  { key: 'shipped', label: 'Shipped', icon: 'airplane' },
  { key: 'in_transit', label: 'In Transit', icon: 'car' },
  { key: 'delivered', label: 'Delivered', icon: 'home' },
];

const getStepIndex = (status: string): number => {
  const map: Record<string, number> = {
    'paid': 0, 'confirmed': 0,
    'shipped': 1,
    'in_transit': 2, 'transit': 2,
    'delivered': 3, 'completed': 3,
  };
  return map[status] ?? 0;
};

const formatPrice = (price: number, currency: string = 'TZS') => {
  const symbols: Record<string, string> = { EUR: '\u20ac', USD: '$', GBP: '\u00a3', TZS: 'TZS' };
  return `${symbols[currency] || currency} ${(price || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

export default function OrderTracking() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await api.get(`/escrow/orders/${id}/tracking`);
      setTracking(res.data);
    } catch (e: any) {
      // Build tracking from order details as fallback
      try {
        const orderRes = await api.get(`/escrow/orders/${id}`);
        const order = orderRes.data;
        setTracking({
          order_id: order.id || id as string,
          status: order.status || 'paid',
          tracking_number: order.tracking_number,
          shipped_at: order.shipped_at,
          delivered_at: order.delivered_at,
          listing_title: order.listing_title || order.listing?.title,
          total_amount: order.total_amount,
          currency: order.currency,
          events: buildEventsFromOrder(order),
        });
      } catch {
        setError('Unable to load tracking information');
      }
    }
    setLoading(false);
  }, [id]);

  const buildEventsFromOrder = (order: any): TrackingEvent[] => {
    const events: TrackingEvent[] = [];
    if (order.created_at) {
      events.push({ status: 'confirmed', description: 'Order confirmed and payment received', timestamp: order.created_at });
    }
    if (order.shipped_at) {
      events.push({ status: 'shipped', description: `Order shipped${order.tracking_number ? ` (${order.tracking_number})` : ''}`, timestamp: order.shipped_at });
    }
    if (order.delivered_at) {
      events.push({ status: 'delivered', description: 'Order delivered', timestamp: order.delivered_at });
    }
    return events.reverse();
  };

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTracking();
    setRefreshing(false);
  };

  const currentStep = tracking ? getStepIndex(tracking.status) : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={{ width: 32 }} />
        </View>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={40} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchTracking}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : tracking ? (
          <>
            {/* Order Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{tracking.listing_title || 'Order'}</Text>
              {tracking.total_amount && (
                <Text style={styles.summaryPrice}>{formatPrice(tracking.total_amount, tracking.currency)}</Text>
              )}
              <View style={styles.summaryMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="receipt-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>#{(tracking.order_id || '').slice(-8)}</Text>
                </View>
                {tracking.tracking_number && (
                  <View style={styles.metaItem}>
                    <Ionicons name="barcode-outline" size={14} color={COLORS.primary} />
                    <Text style={[styles.metaText, { color: COLORS.primary }]}>{tracking.tracking_number}</Text>
                  </View>
                )}
              </View>
              {tracking.estimated_delivery && (
                <View style={styles.estimatedDelivery}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.info} />
                  <Text style={styles.estimatedText}>
                    Estimated: {new Date(tracking.estimated_delivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>

            {/* Progress Steps */}
            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>Delivery Progress</Text>
              <View style={styles.stepsContainer}>
                {STATUS_STEPS.map((step, index) => {
                  const isActive = index <= currentStep;
                  const isCurrent = index === currentStep;
                  return (
                    <View key={step.key} style={styles.stepRow}>
                      <View style={styles.stepIndicator}>
                        <View style={[
                          styles.stepDot,
                          isActive && styles.stepDotActive,
                          isCurrent && styles.stepDotCurrent,
                        ]}>
                          {isActive && (
                            <Ionicons name={step.icon as any} size={14} color="#fff" />
                          )}
                        </View>
                        {index < STATUS_STEPS.length - 1 && (
                          <View style={[styles.stepLine, isActive && styles.stepLineActive]} />
                        )}
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                          {step.label}
                        </Text>
                        {isCurrent && (
                          <Text style={styles.stepCurrent}>Current Status</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Timeline Events */}
            {tracking.events && tracking.events.length > 0 && (
              <View style={styles.eventsCard}>
                <Text style={styles.eventsTitle}>Activity Timeline</Text>
                {tracking.events.map((event, index) => (
                  <View key={index} style={styles.eventRow}>
                    <View style={styles.eventDot} />
                    <View style={styles.eventContent}>
                      <Text style={styles.eventDesc}>{event.description}</Text>
                      <View style={styles.eventMeta}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textLight} />
                        <Text style={styles.eventTime}>
                          {new Date(event.timestamp).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </Text>
                        {event.location && (
                          <>
                            <Ionicons name="location-outline" size={12} color={COLORS.textLight} />
                            <Text style={styles.eventTime}>{event.location}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Help Section */}
            <View style={styles.helpCard}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.info} />
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>Need Help?</Text>
                <Text style={styles.helpDesc}>Contact the seller or open a dispute if there are issues with your order.</Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  content: { padding: 16 },
  
  // Summary Card
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  summaryTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  summaryPrice: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 10 },
  summaryMeta: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  estimatedDelivery: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  estimatedText: { fontSize: 12, fontWeight: '600', color: COLORS.info },

  // Steps Card
  stepsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  stepsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  stepsContainer: {},
  stepRow: { flexDirection: 'row', minHeight: 56 },
  stepIndicator: { width: 32, alignItems: 'center' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepDotCurrent: { backgroundColor: COLORS.primary, borderWidth: 3, borderColor: '#A5D6A7' },
  stepLine: { width: 2, flex: 1, backgroundColor: '#E0E0E0', marginVertical: 4 },
  stepLineActive: { backgroundColor: COLORS.primary },
  stepContent: { flex: 1, paddingLeft: 12, paddingBottom: 12 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  stepLabelActive: { color: COLORS.text },
  stepCurrent: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 2 },

  // Events
  eventsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  eventsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  eventRow: { flexDirection: 'row', marginBottom: 16 },
  eventDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary,
    marginTop: 6, marginRight: 12,
  },
  eventContent: { flex: 1 },
  eventDesc: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  eventTime: { fontSize: 11, color: COLORS.textLight },

  // Help
  helpCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14,
  },
  helpContent: { flex: 1 },
  helpTitle: { fontSize: 14, fontWeight: '600', color: COLORS.info },
  helpDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Error
  errorCard: {
    alignItems: 'center', padding: 40, backgroundColor: '#fff',
    borderRadius: 14, marginTop: 20,
  },
  errorText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: COLORS.primary, borderRadius: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
