import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import api from '../../src/utils/api';
import { UserSettings } from '../../src/types/settings';

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

const FREQUENCY_OPTIONS = [
  { value: 'instant', label: 'Instant', description: 'Get notified immediately' },
  { value: 'daily', label: 'Daily Digest', description: 'One summary per day at 9 AM' },
  { value: 'weekly', label: 'Weekly Digest', description: 'One summary per week on Monday' },
];

export default function AdvancedAlertsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (path: string, value: any) => {
    setSaving(true);
    try {
      const keys = path.split('.');
      const updateData: any = {};
      if (keys.length === 2) {
        updateData[keys[0]] = { [keys[1]]: value };
      }
      await api.put('/settings', updateData);
      setSettings(prev => {
        if (!prev) return prev;
        const newSettings = { ...prev };
        if (keys.length === 2) {
          (newSettings as any)[keys[0]] = {
            ...(newSettings as any)[keys[0]],
            [keys[1]]: value,
          };
        }
        return newSettings;
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
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
          <Text style={styles.headerTitle}>Advanced Alerts</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const quietHours = settings?.quiet_hours || { enabled: false, start_time: '22:00', end_time: '08:00' };
  const alertPrefs = settings?.alert_preferences || { frequency: 'instant', radius_km: 50, price_threshold_percent: 10 };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced Alerts</Text>
        {saving && <ActivityIndicator size="small" color={COLORS.primary} />}
        {!saving && <View style={{ width: 24 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Quiet Hours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="moon-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Enable Quiet Hours</Text>
                <Text style={styles.toggleDesc}>Pause notifications during specified hours</Text>
              </View>
              <Switch
                value={quietHours.enabled}
                onValueChange={(v) => updateSettings('quiet_hours.enabled', v)}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={quietHours.enabled ? COLORS.primary : '#f4f3f4'}
              />
            </View>
            
            {quietHours.enabled && (
              <View style={styles.timeRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <Text style={styles.timeValue}>{quietHours.start_time}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={COLORS.textSecondary} />
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>End</Text>
                  <Text style={styles.timeValue}>{quietHours.end_time}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notification Frequency */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Notification Frequency</Text>
          </View>
          
          <View style={styles.card}>
            {FREQUENCY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.radioRow}
                onPress={() => updateSettings('alert_preferences.frequency', option.value)}
              >
                <View style={styles.radioInfo}>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                  <Text style={styles.radioDesc}>{option.description}</Text>
                </View>
                <View style={[styles.radio, alertPrefs.frequency === option.value && styles.radioSelected]}>
                  {alertPrefs.frequency === option.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location Radius */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Location Radius</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.sliderLabel}>Alert me for listings within:</Text>
            <Text style={styles.sliderValue}>{alertPrefs.radius_km} km</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderMin}>5 km</Text>
              <Text style={styles.sliderMax}>100 km</Text>
            </View>
          </View>
        </View>

        {/* Price Threshold */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Price Drop Threshold</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.sliderLabel}>Alert me when price drops by:</Text>
            <Text style={styles.sliderValue}>{alertPrefs.price_threshold_percent}%</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderMin}>5%</Text>
              <Text style={styles.sliderMax}>50%</Text>
            </View>
          </View>
        </View>
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
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase' },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  toggleDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  timeBox: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  timeLabel: { fontSize: 12, color: COLORS.textSecondary },
  timeValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  radioInfo: { flex: 1, marginRight: 12 },
  radioLabel: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  radioDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: COLORS.primary },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  sliderLabel: { fontSize: 15, color: COLORS.text, padding: 16, paddingBottom: 8 },
  sliderValue: { fontSize: 32, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sliderMin: { fontSize: 12, color: COLORS.textSecondary },
  sliderMax: { fontSize: 12, color: COLORS.textSecondary },
});