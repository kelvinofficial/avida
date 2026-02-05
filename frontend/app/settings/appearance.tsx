import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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

const APPEARANCE_OPTIONS = [
  { 
    value: 'system', 
    label: 'System', 
    description: 'Follow your device settings',
    icon: 'phone-portrait-outline',
  },
  { 
    value: 'light', 
    label: 'Light', 
    description: 'Always use light mode',
    icon: 'sunny-outline',
  },
  { 
    value: 'dark', 
    label: 'Dark', 
    description: 'Always use dark mode',
    icon: 'moon-outline',
  },
];

export default function AppearanceScreen() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/settings');
      setSelectedMode(response.data.app_preferences?.dark_mode || 'system');
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSelectMode = async (mode: string) => {
    setSaving(true);
    setSelectedMode(mode);
    try {
      await api.put('/settings', { app_preferences: { dark_mode: mode } });
    } catch (error) {
      console.error('Error updating appearance:', error);
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
          <Text style={styles.headerTitle}>Appearance</Text>
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
        <Text style={styles.headerTitle}>Appearance</Text>
        {saving && <ActivityIndicator size="small" color={COLORS.primary} />}
        {!saving && <View style={{ width: 24 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.previewContainer}>
          <View style={[styles.preview, selectedMode === 'dark' && styles.previewDark]}>
            <View style={[styles.previewHeader, selectedMode === 'dark' && styles.previewHeaderDark]} />
            <View style={styles.previewContent}>
              <View style={[styles.previewCard, selectedMode === 'dark' && styles.previewCardDark]} />
              <View style={[styles.previewCard, selectedMode === 'dark' && styles.previewCardDark]} />
            </View>
          </View>
          <Text style={styles.previewLabel}>
            {selectedMode === 'system' ? 'Following device settings' : 
             selectedMode === 'dark' ? 'Dark mode' : 'Light mode'}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {APPEARANCE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, selectedMode === option.value && styles.optionSelected]}
              onPress={() => handleSelectMode(option.value)}
            >
              <View style={[styles.optionIcon, selectedMode === option.value && styles.optionIconSelected]}>
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={selectedMode === option.value ? COLORS.primary : COLORS.textSecondary} 
                />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDesc}>{option.description}</Text>
              </View>
              {selectedMode === option.value && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            Dark mode may help reduce eye strain and save battery on OLED screens.
          </Text>
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
  content: { padding: HORIZONTAL_PADDING },
  previewContainer: { alignItems: 'center', marginVertical: 24 },
  preview: {
    width: 180,
    height: 280,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  previewDark: { backgroundColor: '#121212' },
  previewHeader: {
    height: 50,
    backgroundColor: COLORS.primary,
  },
  previewHeaderDark: { backgroundColor: '#1E1E1E' },
  previewContent: { padding: 12, gap: 8 },
  previewCard: {
    height: 60,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  previewCardDark: { backgroundColor: '#2C2C2C' },
  previewLabel: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  optionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  optionSelected: { backgroundColor: COLORS.primaryLight },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconSelected: { backgroundColor: COLORS.surface },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  optionDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
});