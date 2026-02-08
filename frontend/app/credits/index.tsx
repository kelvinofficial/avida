import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { boostApi } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';

interface CreditPackage {
  id: string;
  name: string;
  description?: string;
  price: number;
  credits: number;
  bonus_credits: number;
  is_popular: boolean;
}

interface SellerCredits {
  balance: number;
  total_purchased: number;
  total_spent: number;
}

interface CreditTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface PaymentProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  requires_phone?: boolean;
  country?: string;
  currency?: string;
  networks?: string[];
}

export default function CreditsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [credits, setCredits] = useState<SellerCredits | null>(null);
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('stripe');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [mobileNetwork, setMobileNetwork] = useState<string>('MTN');

  const loadData = useCallback(async () => {
    try {
      // Load packages and payment providers (public endpoints)
      const [packagesData, providersData] = await Promise.all([
        boostApi.getPackages(),
        boostApi.getPaymentProviders()
      ]);
      console.log('Loaded packages:', packagesData);
      setPackages(packagesData || []);
      setProviders(providersData || []);
      
      // Set default provider to first available
      const availableProvider = providersData?.find((p: PaymentProvider) => p.available);
      if (availableProvider) {
        setSelectedProvider(availableProvider.id);
      }
      
      // Try to load user-specific data (may fail if not authenticated)
      try {
        const [creditsData, historyData] = await Promise.all([
          boostApi.getMyCredits(),
          boostApi.getCreditHistory(20)
        ]);
        setCredits(creditsData);
        setHistory(historyData);
      } catch (authError) {
        // User not authenticated - use defaults
        console.log('User not authenticated, using default credits');
        setCredits({ balance: 0, total_purchased: 0, total_spent: 0 });
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to load packages:', error);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to purchase credits');
      router.push('/login');
      return;
    }

    setPurchasing(packageId);
    try {
      // Get the current URL for redirect
      const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://avida.app';
      const result = await boostApi.purchaseCredits(packageId, originUrl, selectedProvider);
      
      if (result.checkout_url) {
        // Open checkout (Stripe or PayPal)
        if (typeof window !== 'undefined') {
          window.location.href = result.checkout_url;
        } else {
          await Linking.openURL(result.checkout_url);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start purchase');
    } finally {
      setPurchasing(null);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return 'add-circle';
      case 'bonus': return 'gift';
      case 'spend': return 'remove-circle';
      case 'admin_add': return 'shield-checkmark';
      case 'admin_remove': return 'shield';
      default: return 'swap-horizontal';
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? '#4CAF50' : '#FF5252';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credits</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your Balance</Text>
        <View style={styles.balanceRow}>
          <Ionicons name="wallet" size={32} color="#4CAF50" />
          <Text style={styles.balanceAmount}>{credits?.balance || 0}</Text>
          <Text style={styles.balanceUnit}>credits</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{credits?.total_purchased || 0}</Text>
            <Text style={styles.statLabel}>Purchased</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{credits?.total_spent || 0}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>
      </View>

      {/* Credit Packages */}
      <Text style={styles.sectionTitle}>Buy Credits</Text>
      
      {/* Payment Method Selector */}
      {providers.length > 0 && (
        <View style={styles.paymentMethodSection}>
          <Text style={styles.paymentMethodLabel}>Payment Method</Text>
          <View style={styles.paymentMethodGrid}>
            {providers.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.paymentMethodCard,
                  selectedProvider === provider.id && styles.paymentMethodSelected,
                  !provider.available && styles.paymentMethodDisabled
                ]}
                onPress={() => provider.available && setSelectedProvider(provider.id)}
                disabled={!provider.available}
              >
                <Ionicons 
                  name={provider.icon as any} 
                  size={24} 
                  color={selectedProvider === provider.id ? '#4CAF50' : provider.available ? '#666' : '#ccc'} 
                />
                <View style={styles.paymentMethodInfo}>
                  <Text style={[
                    styles.paymentMethodName,
                    selectedProvider === provider.id && styles.paymentMethodNameSelected,
                    !provider.available && styles.paymentMethodNameDisabled
                  ]}>
                    {provider.name}
                  </Text>
                  <Text style={[
                    styles.paymentMethodDesc,
                    !provider.available && styles.paymentMethodNameDisabled
                  ]}>
                    {provider.description}
                  </Text>
                </View>
                {selectedProvider === provider.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Phone Input for Mobile Money */}
          {(selectedProvider === 'mpesa' || selectedProvider === 'mtn') && (
            <View style={styles.phoneInputSection}>
              <Text style={styles.phoneInputLabel}>
                {selectedProvider === 'mpesa' ? 'M-Pesa Phone Number (254...)' : 'Mobile Money Number'}
              </Text>
              <TextInput
                style={styles.phoneInput}
                placeholder={selectedProvider === 'mpesa' ? '254712345678' : 'Enter phone number'}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
              {selectedProvider === 'mtn' && (
                <View style={styles.networkSelector}>
                  <Text style={styles.networkLabel}>Network:</Text>
                  {['MTN', 'VODAFONE', 'TIGO'].map((network) => (
                    <TouchableOpacity
                      key={network}
                      style={[
                        styles.networkOption,
                        mobileNetwork === network && styles.networkOptionSelected
                      ]}
                      onPress={() => setMobileNetwork(network)}
                    >
                      <Text style={[
                        styles.networkOptionText,
                        mobileNetwork === network && styles.networkOptionTextSelected
                      ]}>
                        {network}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}
      
      <View style={styles.packagesContainer}>
        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={[styles.packageCard, pkg.is_popular && styles.popularPackage]}
            onPress={() => handlePurchase(pkg.id)}
            disabled={purchasing !== null}
          >
            {pkg.is_popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>POPULAR</Text>
              </View>
            )}
            <Text style={styles.packageName}>{pkg.name}</Text>
            <Text style={styles.packageDescription}>{pkg.description}</Text>
            <View style={styles.packageCredits}>
              <Text style={styles.creditsValue}>{pkg.credits}</Text>
              <Text style={styles.creditsLabel}>credits</Text>
              {pkg.bonus_credits > 0 && (
                <View style={styles.bonusBadge}>
                  <Text style={styles.bonusText}>+{pkg.bonus_credits} BONUS</Text>
                </View>
              )}
            </View>
            <View style={styles.packagePrice}>
              <Text style={styles.priceValue}>${pkg.price}</Text>
            </View>
            {purchasing === pkg.id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Buy Now</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* What can you do with credits */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>What can you do with credits?</Text>
        <View style={styles.infoItem}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.infoText}>Feature your listing at the top</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="home" size={20} color="#FF6B6B" />
          <Text style={styles.infoText}>Spotlight on homepage</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="flash" size={20} color="#FF9800" />
          <Text style={styles.infoText}>Add urgent badge</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="location" size={20} color="#4CAF50" />
          <Text style={styles.infoText}>Boost in specific location</Text>
        </View>
      </View>

      {/* Transaction History */}
      <TouchableOpacity 
        style={styles.historyHeader}
        onPress={() => setShowHistory(!showHistory)}
      >
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={24} color="#666" />
      </TouchableOpacity>

      {showHistory && (
        <View style={styles.historyContainer}>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet</Text>
          ) : (
            history.map((tx) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={[styles.txIcon, { backgroundColor: getTransactionColor(tx.amount) + '20' }]}>
                  <Ionicons 
                    name={getTransactionIcon(tx.transaction_type)} 
                    size={20} 
                    color={getTransactionColor(tx.amount)} 
                  />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txDescription}>{tx.description}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: getTransactionColor(tx.amount) }]}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#333',
  },
  balanceUnit: {
    fontSize: 18,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  paymentMethodSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentMethodCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#eee',
    gap: 10,
  },
  paymentMethodSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  paymentMethodDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  paymentMethodDesc: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  paymentMethodNameSelected: {
    color: '#4CAF50',
  },
  paymentMethodNameDisabled: {
    color: '#999',
  },
  phoneInputSection: {
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  phoneInputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  phoneInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  networkSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  networkLabel: {
    fontSize: 13,
    color: '#666',
  },
  networkOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  networkOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  networkOptionText: {
    fontSize: 12,
    color: '#666',
  },
  networkOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  packagesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#eee',
  },
  popularPackage: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  packageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  packageCredits: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  creditsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4CAF50',
  },
  creditsLabel: {
    fontSize: 16,
    color: '#666',
  },
  bonusBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  bonusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  packagePrice: {
    marginBottom: 16,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  buyButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  historyContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txDescription: {
    fontSize: 14,
    color: '#333',
  },
  txDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
