import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#388E3C',
};

const HORIZONTAL_PADDING = 16;

export default function AppLockScreen() {
  const router = useRouter();
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [lockType, setLockType] = useState<'pin' | 'biometric' | null>(null);

  const handleToggleLock = (value: boolean) => {
    if (value) {
      Alert.alert(
        'Enable App Lock',
        'Choose a lock method:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'PIN Code', 
            onPress: () => {
              setIsLockEnabled(true);
              setLockType('pin');
              Alert.alert('Coming Soon', 'PIN setup will be available in a future update.');
            }
          },
          { 
            text: 'Biometrics', 
            onPress: () => {
              setIsLockEnabled(true);
              setLockType('biometric');
              Alert.alert('Coming Soon', 'Biometric setup will be available in a future update.');
            }
          },
        ]
      );
    } else {
      setIsLockEnabled(false);
      setLockType(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Lock</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={[styles.statusCard, isLockEnabled && styles.statusCardEnabled]}>
          <View style={[styles.statusIcon, isLockEnabled && styles.statusIconEnabled]}>
            <Ionicons 
              name={isLockEnabled ? 'lock-closed' : 'lock-open-outline'} 
              size={32} 
              color={isLockEnabled ? COLORS.success : COLORS.textSecondary} 
            />
          </View>
          <Text style={styles.statusTitle}>
            {isLockEnabled ? 'App Lock is Enabled' : 'App Lock is Disabled'}
          </Text>
          <Text style={styles.statusDesc}>
            {isLockEnabled 
              ? `Using ${lockType === 'biometric' ? 'Biometrics' : 'PIN Code'}` 
              : 'Protect your app with PIN or biometrics'}
          </Text>
        </View>

        {/* Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Enable App Lock</Text>
              <Text style={styles.toggleDesc}>Require authentication to open the app</Text>
            </View>
            <Switch
              value={isLockEnabled}
              onValueChange={handleToggleLock}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={isLockEnabled ? COLORS.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Lock Options */}
        <View style={styles.sectionHeader}>
          <Ionicons name="key-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Lock Method</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.optionRow} 
            onPress={() => handleToggleLock(true)}
            disabled={isLockEnabled && lockType === 'pin'}
          >
            <View style={[styles.optionIcon, lockType === 'pin' && styles.optionIconSelected]}>
              <Ionicons name="keypad-outline" size={22} color={lockType === 'pin' ? COLORS.primary : COLORS.textSecondary} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>PIN Code</Text>
              <Text style={styles.optionDesc}>4-6 digit code</Text>
            </View>
            {lockType === 'pin' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow} 
            onPress={() => handleToggleLock(true)}
            disabled={isLockEnabled && lockType === 'biometric'}
          >
            <View style={[styles.optionIcon, lockType === 'biometric' && styles.optionIconSelected]}>
              <Ionicons name="finger-print-outline" size={22} color={lockType === 'biometric' ? COLORS.primary : COLORS.textSecondary} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionLabel}>Biometrics</Text>
              <Text style={styles.optionDesc}>Face ID or Fingerprint</Text>
            </View>
            {lockType === 'biometric' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            App lock protects your privacy by requiring authentication each time you open the app.
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
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  statusCardEnabled: {
    borderColor: COLORS.success,
    backgroundColor: '#E8F5E9',
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconEnabled: { backgroundColor: COLORS.surface },
  statusTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  statusDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconSelected: { backgroundColor: COLORS.primaryLight },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
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