import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
};

const HORIZONTAL_PADDING = 16;

export default function StorageScreen() {
  const router = useRouter();
  const [cacheSize, setCacheSize] = useState('0 MB');
  const [autoDownload, setAutoDownload] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    // Simulate cache size calculation
    setCacheSize('12.4 MB');
  }, []);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached images and data. The app may be slower until data is re-downloaded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              // Clear AsyncStorage cache
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter(k => k.startsWith('cache_'));
              await AsyncStorage.multiRemove(cacheKeys);
              setCacheSize('0 MB');
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data & Storage</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Storage Usage */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="folder-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Storage Usage</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.storageRow}>
              <View style={styles.storageInfo}>
                <Text style={styles.storageLabel}>Cache</Text>
                <Text style={styles.storageDesc}>Images, data, and temporary files</Text>
              </View>
              <Text style={styles.storageSize}>{cacheSize}</Text>
            </View>

            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearCache}
              disabled={clearing}
            >
              {clearing ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  <Text style={styles.clearBtnText}>Clear Cache</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Auto Download */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-download-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Media Auto-Download</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Auto-download Images</Text>
                <Text style={styles.toggleDesc}>Download images automatically on Wi-Fi</Text>
              </View>
              <Switch
                value={autoDownload}
                onValueChange={setAutoDownload}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={autoDownload ? COLORS.primary : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Data Usage Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            Clearing cache may temporarily slow down the app as data needs to be re-downloaded.
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
  content: { padding: HORIZONTAL_PADDING },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  storageInfo: { flex: 1 },
  storageLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  storageDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  storageSize: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
  },
  clearBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.error },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  toggleDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
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