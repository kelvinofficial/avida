import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { safeGoBack } from '../../src/utils/navigation';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#388E3C',
  warning: '#F57C00',
  premium: '#FFB300',
};

interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  issued_date: string;
  due_date: string;
  paid_date?: string;
  business_name?: string;
  package_name?: string;
}

interface UserProfile {
  name?: string;
  email?: string;
  is_premium?: boolean;
  premium_expires_at?: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { isAuthenticated, token, user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await api.get('/users/me');
      setUserProfile(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.get('/invoices?limit=50');
      setInvoices(response.data.invoices || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      if (error.response?.status !== 401) {
        Alert.alert('Error', 'Failed to load invoices');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices();
  }, [fetchInvoices]);

  const viewInvoiceHTML = async (invoiceId: string) => {
    try {
      // For web, open in new tab
      if (Platform.OS === 'web') {
        const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
        window.open(`${baseUrl}/api/invoices/${invoiceId}/html`, '_blank');
      } else {
        // For native, use Linking
        const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
        await Linking.openURL(`${baseUrl}/api/invoices/${invoiceId}/html`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open invoice');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'KES') return `KES ${amount.toLocaleString()}`;
    if (currency === 'TZS') return `TZS ${amount.toLocaleString()}`;
    return `$${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      default: return COLORS.textSecondary;
    }
  };

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Invoices</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginMessage}>Please sign in to view invoices</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Invoices</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => safeGoBack(router)} 
          style={styles.backBtn}
          data-testid="back-button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Invoices</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Invoices Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your payment receipts and invoices will appear here after you make a purchase.
            </Text>
            <TouchableOpacity 
              style={styles.upgradeBtn}
              onPress={() => router.push('/business/edit')}
              data-testid="upgrade-premium-button"
            >
              <Ionicons name="diamond-outline" size={18} color="#fff" />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.invoicesList}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={20} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Payment History</Text>
            </View>

            {invoices.map((invoice) => (
              <TouchableOpacity
                key={invoice.id}
                style={styles.invoiceCard}
                onPress={() => viewInvoiceHTML(invoice.id)}
                data-testid={`invoice-card-${invoice.id}`}
              >
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                    <Text style={styles.invoiceDate}>{formatDate(invoice.issued_date)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(invoice.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceBody}>
                  <View style={styles.invoiceDetail}>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.invoiceDescription} numberOfLines={1}>
                      {invoice.description || invoice.package_name || 'Premium Subscription'}
                    </Text>
                  </View>
                  
                  {invoice.business_name && (
                    <View style={styles.invoiceDetail}>
                      <Ionicons name="storefront-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.businessName} numberOfLines={1}>{invoice.business_name}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.invoiceFooter}>
                  <Text style={styles.invoiceAmount}>
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </Text>
                  <View style={styles.viewBtn}>
                    <Text style={styles.viewBtnText}>View Receipt</Text>
                    <Ionicons name="open-outline" size={14} color={COLORS.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.footer}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.footerText}>
                Tap any invoice to view or download the full receipt.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Auth required state
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginMessage: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, marginBottom: 20 },
  signInBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  signInBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.premium,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Invoices List
  invoicesList: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Invoice Card
  invoiceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceInfo: {},
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  invoiceBody: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  invoiceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  businessName: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },

  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
