import React, { useEffect, useState, useRef } from 'react';
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
  warning: '#F59E0B',
};

export default function CheckoutPendingScreen() {
  const router = useRouter();
  const { order_id, tx_ref } = useLocalSearchParams<{
    order_id?: string;
    tx_ref?: string;
  }>();
  
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [checkCount, setCheckCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Poll for payment status every 5 seconds
    checkPaymentStatus();
    intervalRef.current = setInterval(() => {
      setCheckCount(prev => prev + 1);
    }, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (checkCount > 0 && checkCount < 24) { // Max 2 minutes of polling
      checkPaymentStatus();
    }
  }, [checkCount]);
  
  const checkPaymentStatus = async () => {
    if (!tx_ref) return;
    
    try {
      const response = await api.get(`/payments/verify/mobile-money/${tx_ref}`);
      
      if (response.data.status === 'successful') {
        setStatus('success');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'pending' && (
          <>
            <View style={styles.phoneIcon}>
              <Ionicons name="phone-portrait" size={60} color={COLORS.primary} />
              <View style={styles.pulseRing} />
            </View>
            
            <Text style={styles.title}>Check Your Phone</Text>
            <Text style={styles.description}>
              A payment prompt has been sent to your M-Pesa registered phone number.
              Please enter your PIN to authorize the payment.
            </Text>
            
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.statusText}>Waiting for authorization...</Text>
            </View>
            
            <View style={styles.stepsBox}>
              <Text style={styles.stepsTitle}>Next steps:</Text>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>Check your phone for M-Pesa prompt</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>Enter your M-Pesa PIN</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>Wait for confirmation</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/')}
            >
              <Text style={styles.secondaryBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </>
        )}
        
        {status === 'success' && (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.description}>
              Your M-Pesa payment has been received. Your order is now being processed.
            </Text>
            
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Escrow Protection Active</Text>
                <Text style={styles.infoText}>
                  Your payment is held securely until you confirm delivery.
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/profile/purchases')}
            >
              <Ionicons name="receipt-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>View My Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 12 }]}
              onPress={() => router.push('/')}
            >
              <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
            </TouchableOpacity>
          </>
        )}
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
  phoneIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: COLORS.primary,
    opacity: 0.3,
  },
  successIcon: {
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
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
  },
  stepsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 320,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
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
    borderColor: '#E0E0E0',
    width: '100%',
    maxWidth: 320,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
