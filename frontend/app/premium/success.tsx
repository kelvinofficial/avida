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
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/utils/api';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  premium: '#FF8F00',
  premiumLight: '#FFF8E1',
  success: '#4CAF50',
  error: '#D32F2F',
};

export default function PremiumSuccessScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'checking' | 'success' | 'pending' | 'error'>('checking');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!session_id) {
        setStatus('error');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/premium-subscription/stripe/status/${session_id}`);
        
        if (response.data.payment_status === 'paid') {
          setStatus('success');
          // Fetch updated profile to get expiry date
          const profileRes = await api.get('/premium-subscription/my-subscription');
          if (profileRes.data.premium_expires_at) {
            setExpiresAt(new Date(profileRes.data.premium_expires_at).toLocaleDateString());
          }
        } else if (response.data.status === 'open' || response.data.payment_status === 'unpaid') {
          setStatus('pending');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [session_id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.premium} />
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
            <View style={styles.iconContainer}>
              <Ionicons name="diamond" size={64} color={COLORS.premium} />
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
              </View>
            </View>
            
            <Text style={styles.title}>Welcome to Premium!</Text>
            <Text style={styles.subtitle}>
              Your business profile has been upgraded to Premium Verified Business
            </Text>
            
            {expiresAt && (
              <View style={styles.expiryBox}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.premium} />
                <Text style={styles.expiryText}>Valid until {expiresAt}</Text>
              </View>
            )}
            
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.benefitText}>Premium badge on your profile</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.benefitText}>Priority in Featured Sellers</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.benefitText}>Enhanced visibility in search</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.benefitText}>Premium customer support</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/business/edit')}
            >
              <Text style={styles.primaryBtnText}>Go to My Business Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.secondaryBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'pending' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={64} color={COLORS.premium} />
            </View>
            
            <Text style={styles.title}>Payment Processing</Text>
            <Text style={styles.subtitle}>
              Your payment is being processed. Please wait a moment and refresh.
            </Text>
            
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => window.location.reload()}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Refresh Status</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/business/edit')}
            >
              <Text style={styles.secondaryBtnText}>Back to Profile</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
            </View>
            
            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.subtitle}>
              We couldn't verify your payment. Please try again or contact support.
            </Text>
            
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/business/edit')}
            >
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.secondaryBtnText}>Back to Home</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    maxWidth: 320,
  },
  expiryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.premiumLight,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  expiryText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.premium,
  },
  benefitsList: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  benefitText: {
    fontSize: 15,
    color: COLORS.text,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.premium,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryBtn: {
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
