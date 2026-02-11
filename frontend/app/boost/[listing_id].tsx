import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { boostApi, listingsApi } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';

interface BoostPricing {
  id: string;
  boost_type: string;
  name: string;
  description?: string;
  credits_per_hour: number;
  credits_per_day: number;
  min_duration_hours: number;
  max_duration_days: number;
  priority: number;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  images: string[];
  status: string;
  boosts?: Record<string, { boost_id: string; expires_at: string; is_active: boolean }>;
}

const BOOST_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  featured: 'star',
  homepage: 'home',
  urgent: 'flash',
  location: 'location',
  category: 'grid',
};

const BOOST_COLORS: Record<string, string> = {
  featured: '#FFD700',
  homepage: '#FF6B6B',
  urgent: '#FF9800',
  location: '#4CAF50',
  category: '#2196F3',
};

const DURATION_OPTIONS = [
  { label: '1 hour', hours: 1 },
  { label: '6 hours', hours: 6 },
  { label: '12 hours', hours: 12 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '7 days', hours: 168 },
  { label: '14 days', hours: 336 },
  { label: '30 days', hours: 720 },
];

export default function BoostListingPage() {
  const router = useRouter();
  const { listing_id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<BoostPricing[]>([]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [credits, setCredits] = useState(0);
  const [selectedBoost, setSelectedBoost] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(24);
  const [calculatedCost, setCalculatedCost] = useState(0);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    if (!listing_id) return;
    
    try {
      const [pricingData, listingData, creditsData] = await Promise.all([
        boostApi.getPricing(),
        listingsApi.getOne(listing_id as string),
        boostApi.getMyCredits().catch(() => ({ balance: 0 }))
      ]);
      setPricing(pricingData);
      setListing(listingData);
      setCredits(creditsData.balance);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load listing data');
    } finally {
      setLoading(false);
    }
  }, [listing_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const calculateCost = async () => {
      if (!selectedBoost || !selectedDuration) {
        setCalculatedCost(0);
        return;
      }
      
      try {
        const result = await boostApi.calculateCost(selectedBoost, selectedDuration);
        setCalculatedCost(result.credit_cost);
      } catch (error) {
        console.error('Failed to calculate cost:', error);
      }
    };
    
    calculateCost();
  }, [selectedBoost, selectedDuration]);

  const handleBoost = async () => {
    if (!selectedBoost || !listing_id || !user) {
      Alert.alert('Error', 'Please select a boost type');
      return;
    }

    if (credits < calculatedCost) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${calculatedCost} credits but only have ${credits}. Would you like to buy more?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => router.push('/credits') }
        ]
      );
      return;
    }

    // Check if listing already has this boost type
    if (listing?.boosts?.[selectedBoost]?.is_active) {
      Alert.alert('Already Boosted', 'This listing already has an active boost of this type');
      return;
    }

    setCreating(true);
    try {
      await boostApi.createBoost({
        listing_id: listing_id as string,
        boost_type: selectedBoost,
        duration_hours: selectedDuration,
      });
      
      Alert.alert(
        'Boost Created!',
        `Your listing is now boosted with ${pricing.find(p => p.boost_type === selectedBoost)?.name}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create boost');
    } finally {
      setCreating(false);
    }
  };

  const isBoostActive = (boostType: string) => {
    return listing?.boosts?.[boostType]?.is_active;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#333" />
        <Text style={styles.errorText}>Listing not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backToListingsBtn}>
          <Text style={styles.backToListingsBtnText}>Go Back</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Boost Listing</Text>
        <TouchableOpacity onPress={() => router.push('/credits')} style={styles.creditsButton}>
          <Ionicons name="wallet" size={20} color="#4CAF50" />
          <Text style={styles.creditsText}>{credits}</Text>
        </TouchableOpacity>
      </View>

      {/* Listing Preview */}
      <View style={styles.listingPreview}>
        {listing.images?.[0] && (
          <View style={styles.listingImage}>
            <Text style={styles.listingImagePlaceholder}>📷</Text>
          </View>
        )}
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
          <Text style={styles.listingPrice}>${listing.price}</Text>
          {listing.boosts && Object.keys(listing.boosts).length > 0 && (
            <View style={styles.activeBoosts}>
              {Object.entries(listing.boosts).map(([type, boost]) => (
                boost.is_active && (
                  <View key={type} style={[styles.activeBadge, { backgroundColor: BOOST_COLORS[type] }]}>
                    <Ionicons name={BOOST_ICONS[type]} size={12} color="#fff" />
                    <Text style={styles.activeBadgeText}>{type}</Text>
                  </View>
                )
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Boost Type Selection */}
      <Text style={styles.sectionTitle}>Select Boost Type</Text>
      <View style={styles.boostTypes}>
        {pricing.map((boost) => {
          const isActive = isBoostActive(boost.boost_type);
          const isSelected = selectedBoost === boost.boost_type;
          
          return (
            <TouchableOpacity
              key={boost.id}
              style={[
                styles.boostCard,
                isSelected && styles.boostCardSelected,
                isActive && styles.boostCardDisabled
              ]}
              onPress={() => !isActive && setSelectedBoost(boost.boost_type)}
              disabled={isActive}
            >
              <View style={[styles.boostIcon, { backgroundColor: BOOST_COLORS[boost.boost_type] + '20' }]}>
                <Ionicons 
                  name={BOOST_ICONS[boost.boost_type]} 
                  size={24} 
                  color={BOOST_COLORS[boost.boost_type]} 
                />
              </View>
              <Text style={styles.boostName}>{boost.name}</Text>
              <Text style={styles.boostDescription}>{boost.description}</Text>
              <Text style={styles.boostPrice}>{boost.credits_per_day} credits/day</Text>
              {isActive && (
                <View style={styles.activeBadgeLarge}>
                  <Text style={styles.activeBadgeLargeText}>ACTIVE</Text>
                </View>
              )}
              {isSelected && !isActive && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Duration Selection */}
      {selectedBoost && (
        <>
          <Text style={styles.sectionTitle}>Select Duration</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.durationScroll}>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.hours}
                style={[
                  styles.durationOption,
                  selectedDuration === option.hours && styles.durationOptionSelected
                ]}
                onPress={() => setSelectedDuration(option.hours)}
              >
                <Text style={[
                  styles.durationText,
                  selectedDuration === option.hours && styles.durationTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Cost Summary */}
      {selectedBoost && (
        <View style={styles.costSummary}>
          <Text style={styles.costTitle}>Cost Summary</Text>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Boost Type</Text>
            <Text style={styles.costValue}>
              {pricing.find(p => p.boost_type === selectedBoost)?.name}
            </Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Duration</Text>
            <Text style={styles.costValue}>
              {DURATION_OPTIONS.find(d => d.hours === selectedDuration)?.label}
            </Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costRow}>
            <Text style={styles.costTotalLabel}>Total Cost</Text>
            <Text style={styles.costTotalValue}>{calculatedCost} credits</Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Your Balance</Text>
            <Text style={[
              styles.costValue,
              credits < calculatedCost && styles.insufficientBalance
            ]}>
              {credits} credits
            </Text>
          </View>
        </View>
      )}

      {/* Boost Button */}
      <TouchableOpacity
        style={[
          styles.boostButton,
          (!selectedBoost || credits < calculatedCost || creating) && styles.boostButtonDisabled
        ]}
        onPress={handleBoost}
        disabled={!selectedBoost || credits < calculatedCost || creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="rocket" size={20} color="#fff" />
            <Text style={styles.boostButtonText}>
              {credits < calculatedCost ? 'Not Enough Credits' : 'Boost Now'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {credits < calculatedCost && selectedBoost && (
        <TouchableOpacity 
          style={styles.buyCreditsButton}
          onPress={() => router.push('/credits')}
        >
          <Text style={styles.buyCreditsText}>Buy More Credits</Text>
        </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '500',
  },
  backToListingsBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToListingsBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
  creditsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  creditsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  listingPreview: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  listingImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingImagePlaceholder: {
    fontSize: 32,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  activeBoosts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  boostTypes: {
    paddingHorizontal: 16,
    gap: 12,
  },
  boostCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#eee',
    position: 'relative',
  },
  boostCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  boostCardDisabled: {
    opacity: 0.6,
  },
  boostIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  boostName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  boostDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  boostPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  activeBadgeLarge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeLargeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  durationScroll: {
    paddingHorizontal: 16,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  durationOptionSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  durationTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  costSummary: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  costDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  costTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  costTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  insufficientBalance: {
    color: '#FF5252',
  },
  boostButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  boostButtonDisabled: {
    backgroundColor: '#ccc',
  },
  boostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buyCreditsButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  buyCreditsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});
