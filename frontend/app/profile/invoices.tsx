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
import { useResponsive } from '../../src/hooks/useResponsive';
import { DesktopPageLayout } from '../../src/components/layout';
import { useLoginRedirect } from '../../src/hooks/useLoginRedirect';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  issued_date: string;
  due_date: string;
  paid_date?: string;
  package_name?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return COLORS.success;
    case 'pending': return COLORS.warning;
    case 'overdue': return COLORS.error;
    default: return COLORS.textSecondary;
  }
};

const InvoiceRow = ({ 
  invoice, 
  isDesktop, 
  onDownload 
}: { 
  invoice: Invoice; 
  isDesktop?: boolean;
  onDownload: () => void;
}) => (
  <View style={[styles.invoiceRow, isDesktop && styles.invoiceRowDesktop]}>
    <View style={styles.invoiceMain}>
      <View style={styles.invoiceHeader}>
        <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.invoiceDesc}>{invoice.description || invoice.package_name || 'Invoice'}</Text>
      <Text style={styles.invoiceDate}>
        Issued: {new Date(invoice.issued_date).toLocaleDateString()}
      </Text>
    </View>
    
    <View style={styles.invoiceRight}>
      <Text style={styles.invoiceAmount}>
        {invoice.currency === 'EUR' ? '€' : invoice.currency}{invoice.amount.toLocaleString()}
      </Text>
      <TouchableOpacity 
        style={styles.downloadBtn} 
        onPress={onDownload}
        data-testid={`download-invoice-${invoice.id}`}
      >
        <Ionicons name="download-outline" size={18} color={COLORS.primary} />
        <Text style={styles.downloadBtnText}>Download</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const EmptyState = ({ isDesktop }: { isDesktop?: boolean }) => (
  <View style={[styles.emptyContainer, isDesktop && styles.emptyContainerDesktop]}>
    <View style={[styles.emptyIcon, isDesktop && styles.emptyIconDesktop]}>
      <Ionicons name="receipt-outline" size={isDesktop ? 64 : 48} color={COLORS.textSecondary} />
    </View>
    <Text style={[styles.emptyTitle, isDesktop && styles.emptyTitleDesktop]}>No invoices</Text>
    <Text style={styles.emptySubtitle}>
      Your invoices will appear here after making purchases.
    </Text>
  </View>
);

export default function InvoicesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const { goToLogin } = useLoginRedirect();
  const isLargeScreen = isDesktop || isTablet;
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.get('/invoices?limit=50');
      setInvoices(response.data.invoices || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}/download`);
      if (response.data.download_url) {
        if (Platform.OS === 'web') {
          window.open(response.data.download_url, '_blank');
        } else {
          Linking.openURL(response.data.download_url);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download invoice');
    }
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // Desktop Layout
  if (isLargeScreen) {
    if (!isAuthenticated) {
      return (
        <DesktopPageLayout title="Invoices" icon="receipt-outline">
          <View style={styles.unauthContainer}>
            <View style={styles.unauthIcon}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.primary} />
            </View>
            <Text style={styles.unauthTitle}>Sign in to view invoices</Text>
            <Text style={styles.unauthSubtitle}>
              Access and download your transaction invoices
            </Text>
            <TouchableOpacity style={styles.signInButton} onPress={() => goToLogin()}>
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </DesktopPageLayout>
      );
    }

    return (
      <DesktopPageLayout
        title="Invoices"
        subtitle={`${invoices.length} invoices`}
        icon="receipt-outline"
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : invoices.length === 0 ? (
          <EmptyState isDesktop />
        ) : (
          <View style={styles.invoiceList}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Invoice</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'center' }]}>Action</Text>
            </View>
            
            {invoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                isDesktop
                onDownload={() => handleDownload(invoice)}
              />
            ))}
          </View>
        )}
      </DesktopPageLayout>
    );
  }

  // Mobile Layout
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.mobileContainer} edges={['top']}>
        <View style={styles.mobileHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Invoices</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.mobileAuthPrompt}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.mobileAuthText}>Please sign in to view invoices</Text>
          <TouchableOpacity style={styles.mobileSignInBtn} onPress={() => goToLogin()}>
            <Text style={styles.mobileSignInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mobileContainer} edges={['top']}>
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>Invoices</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.mobileContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : invoices.length === 0 ? (
          <EmptyState />
        ) : (
          invoices.map((invoice) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              onDownload={() => handleDownload(invoice)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  // Invoice List
  invoiceList: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },

  // Invoice Row
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  invoiceRowDesktop: {
    borderRadius: 0,
    marginBottom: 0,
  },
  invoiceMain: {
    flex: 1,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Empty & Unauth
  unauthContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  unauthIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  unauthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  unauthSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 24,
  },
  signInButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainerDesktop: {
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconDesktop: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyTitleDesktop: {
    fontSize: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Mobile
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  mobileContent: {
    padding: 16,
  },
  mobileAuthPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mobileAuthText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  mobileSignInBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  mobileSignInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
