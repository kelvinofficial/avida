import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../src/utils/api';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  success: '#16A34A',
  error: '#DC2626',
};

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const { session_id, order_id, provider } = useLocalSearchParams<{
    session_id?: string;
    order_id?: string;
    provider?: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    verifyPayment();
  }, []);
  
  const verifyPayment = async () => {
    try {
      let response;
      
      if (session_id) {
        // Stripe verification
        response = await api.get(`/payments/verify/stripe/${session_id}`);
      } else if (order_id && provider === 'paypal') {
        // PayPal - needs capture (called from frontend after approval)
        const urlParams = new URLSearchParams(window.location.search);
        const paypalToken = urlParams.get('token');
        if (paypalToken) {
          response = await api.post(`/payments/verify/paypal/${paypalToken}`);
        }
      }
      
      if (response?.data?.payment_status === 'paid' || response?.data?.status === 'COMPLETED') {
        setStatus('success');
      } else {
        setStatus('pending');
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      setStatus('failed');
      setError(err.response?.data?.detail || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRetryVerification = () => {
    setLoading(true);
    setStatus('pending');
    setError(null);
    verifyPayment();
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Verifying payment...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'success' && (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.description}>
              Your order has been placed and your payment is held securely in escrow.
              The seller will be notified to ship your item.
            </Text>
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Escrow Protection</Text>
                <Text style={styles.infoText}>
                  Your payment is protected. Once you receive and confirm the item,
                  the funds will be released to the seller.
                </Text>
              </View>
            </View>
          </>
        )}
        
        {status === 'pending' && (
          <>
            <View style={styles.pendingIcon}>
              <Ionicons name="time-outline" size={80} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.title}>Payment Processing</Text>
            <Text style={styles.description}>
              Your payment is being processed. This may take a few moments.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetryVerification}>
              <Text style={styles.retryBtnText}>Check Status</Text>
            </TouchableOpacity>
          </>
        )}
        
        {status === 'failed' && (
          <>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={80} color={COLORS.error} />
            </View>
            <Text style={styles.title}>Payment Failed</Text>
            <Text style={styles.description}>
              {error || 'There was an issue processing your payment. Please try again.'}
            </Text>
          </>
        )}
        
        <View style={styles.actions}>
          {status === 'success' && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/profile/purchases')}
            >
              <Ionicons name="receipt-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>View My Orders</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.secondaryBtn, status === 'success' && { marginTop: 12 }]}
            onPress={() => router.push('/')}
          >
            <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  successIcon: {
    marginBottom: 24,
  },
  pendingIcon: {
    marginBottom: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    maxWidth: 360,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  secondaryBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
