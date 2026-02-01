import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/utils/api';

const COLORS = {
  primary: '#2E7D32',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  gold: '#FFA000',
  goldLight: '#FFF8E1',
  blueLight: '#E3F2FD',
  blue: '#1565C0',
};

interface PricingOption {
  days: number;
  price: number;
  currency: string;
  label: string;
}

interface Property {
  id: string;
  title: string;
  price: number;
  boosted: boolean;
  featured: boolean;
  views: number;
}

// Pricing Card Component
const PricingCard = ({ 
  option, 
  selected, 
  onSelect, 
  popular = false 
}: { 
  option: PricingOption; 
  selected: boolean; 
  onSelect: () => void;
  popular?: boolean;
}) => (
  <TouchableOpacity 
    style={[pricingStyles.card, selected && pricingStyles.cardSelected]}
    onPress={onSelect}
  >
    {popular && (
      <View style={pricingStyles.popularBadge}>
        <Text style={pricingStyles.popularText}>Popular</Text>
      </View>
    )}
    <View style={pricingStyles.cardHeader}>
      <Text style={pricingStyles.duration}>{option.label}</Text>
      {selected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
    </View>
    <View style={pricingStyles.priceRow}>
      <Text style={pricingStyles.currency}>€</Text>
      <Text style={pricingStyles.price}>{option.price.toFixed(2)}</Text>
    </View>
    <Text style={pricingStyles.perDay}>
      €{(option.price / option.days).toFixed(2)}/day
    </Text>
  </TouchableOpacity>
);

const pricingStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8F5E9',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  perDay: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default function BoostPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [boostPrices, setBoostPrices] = useState<PricingOption[]>([]);
  const [featurePrices, setFeaturePrices] = useState<PricingOption[]>([]);
  const [selectedBoost, setSelectedBoost] = useState<number | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'boost' | 'feature'>('boost');
  const [processing, setProcessing] = useState(false);

  // Fetch property and prices
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [propertyRes, pricesRes] = await Promise.all([
        axios.get(`${API_URL}/api/property/listings/${id}`),
        axios.get(`${API_URL}/api/property/boost-prices`),
      ]);
      
      setProperty(propertyRes.data);
      setBoostPrices(pricesRes.data.boost);
      setFeaturePrices(pricesRes.data.feature);
      
      // Pre-select popular option
      if (pricesRes.data.boost.length > 1) {
        setSelectedBoost(pricesRes.data.boost[1].days);
      }
      if (pricesRes.data.feature.length > 1) {
        setSelectedFeature(pricesRes.data.feature[1].days);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, fetchData]);

  const handlePurchase = async () => {
    if (activeTab === 'boost' && !selectedBoost) {
      Alert.alert('Select Duration', 'Please select a boost duration');
      return;
    }
    if (activeTab === 'feature' && !selectedFeature) {
      Alert.alert('Select Duration', 'Please select a feature duration');
      return;
    }

    const selectedOption = activeTab === 'boost'
      ? boostPrices.find(p => p.days === selectedBoost)
      : featurePrices.find(p => p.days === selectedFeature);

    Alert.alert(
      `Confirm ${activeTab === 'boost' ? 'Boost' : 'Feature'}`,
      `You will be charged €${selectedOption?.price.toFixed(2)} for ${selectedOption?.label}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setProcessing(true);
            try {
              const endpoint = activeTab === 'boost'
                ? `/api/property/boost/${id}`
                : `/api/property/feature/${id}`;
              
              const days = activeTab === 'boost' ? selectedBoost : selectedFeature;
              
              await axios.post(`${API_URL}${endpoint}`, { days });
              
              Alert.alert(
                'Success!',
                `Your property has been ${activeTab === 'boost' ? 'boosted' : 'featured'}! It will now appear more prominently in search results.`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Error processing purchase:', error);
              Alert.alert('Error', 'Failed to process. Please try again.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.errorText}>Property not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promote Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Property Summary */}
        <View style={styles.propertySummary}>
          <Text style={styles.propertyTitle} numberOfLines={2}>{property.title}</Text>
          <Text style={styles.propertyPrice}>€{property.price.toLocaleString()}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{property.views} views</Text>
            </View>
            {property.boosted && (
              <View style={[styles.badge, { backgroundColor: COLORS.goldLight }]}>
                <Ionicons name="flash" size={12} color={COLORS.gold} />
                <Text style={[styles.badgeText, { color: COLORS.gold }]}>Boosted</Text>
              </View>
            )}
            {property.featured && (
              <View style={[styles.badge, { backgroundColor: COLORS.blueLight }]}>
                <Ionicons name="star" size={12} color={COLORS.blue} />
                <Text style={[styles.badgeText, { color: COLORS.blue }]}>Featured</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'boost' && styles.tabActive]}
            onPress={() => setActiveTab('boost')}
          >
            <Ionicons name="flash" size={20} color={activeTab === 'boost' ? COLORS.gold : COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'boost' && styles.tabTextActive]}>Boost</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'feature' && styles.tabActive]}
            onPress={() => setActiveTab('feature')}
          >
            <Ionicons name="star" size={20} color={activeTab === 'feature' ? COLORS.blue : COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'feature' && styles.tabTextActive]}>Feature</Text>
          </TouchableOpacity>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>
            {activeTab === 'boost' ? '🚀 Boost Benefits' : '⭐ Feature Benefits'}
          </Text>
          <View style={styles.benefitsList}>
            {activeTab === 'boost' ? (
              <>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Appear higher in search results</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Up to 3x more views</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Special "Boosted" badge</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Featured on homepage</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Up to 10x more views</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Premium "Featured" badge</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  <Text style={styles.benefitText}>Priority in category pages</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Pricing Options */}
        <Text style={styles.sectionTitle}>Select Duration</Text>
        {activeTab === 'boost' ? (
          boostPrices.map((option, index) => (
            <PricingCard
              key={option.days}
              option={option}
              selected={selectedBoost === option.days}
              onSelect={() => setSelectedBoost(option.days)}
              popular={index === 1}
            />
          ))
        ) : (
          featurePrices.map((option, index) => (
            <PricingCard
              key={option.days}
              option={option}
              selected={selectedFeature === option.days}
              onSelect={() => setSelectedFeature(option.days)}
              popular={index === 1}
            />
          ))
        )}

        {/* Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Purchase Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.purchaseBtn,
            activeTab === 'boost' ? { backgroundColor: COLORS.gold } : { backgroundColor: COLORS.blue },
          ]}
          onPress={handlePurchase}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={activeTab === 'boost' ? 'flash' : 'star'} size={20} color="#fff" />
              <Text style={styles.purchaseBtnText}>
                {activeTab === 'boost' ? 'Boost Now' : 'Feature Now'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  propertySummary: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.background,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  benefitsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  benefitsList: {
    gap: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  purchaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  purchaseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
