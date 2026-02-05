import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

const HORIZONTAL_PADDING = 16;

const CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€', region: 'Europe' },
  { code: 'USD', name: 'US Dollar', symbol: '$', region: 'United States' },
  { code: 'GBP', name: 'British Pound', symbol: '£', region: 'United Kingdom' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', region: 'Switzerland' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', region: 'Poland' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', region: 'Sweden' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', region: 'Norway' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', region: 'Denmark' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', region: 'Czech Republic' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', region: 'Hungary' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', region: 'Turkey' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', region: 'Russia' },
];

export default function CurrencyScreen() {
  const router = useRouter();
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/settings');
      setSelectedCurrency(response.data.app_preferences?.currency || 'EUR');
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSelectCurrency = async (code: string) => {
    setSaving(true);
    setSelectedCurrency(code);
    try {
      await api.put('/settings', { app_preferences: { currency: code } });
    } catch (error) {
      console.error('Error updating currency:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Currency</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
        <Text style={styles.headerTitle}>Currency</Text>
        {saving && <ActivityIndicator size="small" color={COLORS.primary} />}
        {!saving && <View style={{ width: 24 }} />}
      </View>

      <FlatList
        data={CURRENCIES}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, selectedCurrency === item.code && styles.itemSelected]}
            onPress={() => handleSelectCurrency(item.code)}
          >
            <View style={styles.symbolContainer}>
              <Text style={styles.symbol}>{item.symbol}</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemRegion}>{item.code} • {item.region}</Text>
            </View>
            {selectedCurrency === item.code && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: HORIZONTAL_PADDING },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  itemSelected: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  symbolContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbol: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  itemRegion: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
});