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
  warning: '#F57C00',
};

const HORIZONTAL_PADDING = 16;

export default function TwoFactorAuthScreen() {
  const router = useRouter();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const handleToggle2FA = (value: boolean) => {
    if (value) {
      Alert.alert(
        'Enable Two-Factor Authentication',
        'You will need to verify your phone number or use an authenticator app.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Set Up', 
            onPress: () => {
              // In a real app, this would start the 2FA setup flow
              Alert.alert('Coming Soon', '2FA setup will be available in a future update.');
            }
          },
        ]
      );
    } else {
      Alert.alert(
        'Disable Two-Factor Authentication',
        'This will make your account less secure. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Disable', 
            style: 'destructive',
            onPress: () => setIs2FAEnabled(false)
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Two-Factor Authentication</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={[styles.statusCard, is2FAEnabled && styles.statusCardEnabled]}>
          <View style={[styles.statusIcon, is2FAEnabled && styles.statusIconEnabled]}>
            <Ionicons 
              name={is2FAEnabled ? 'shield-checkmark' : 'shield-outline'} 
              size={32} 
              color={is2FAEnabled ? COLORS.success : COLORS.textSecondary} 
            />
          </View>
          <Text style={styles.statusTitle}>
            {is2FAEnabled ? '2FA is Enabled' : '2FA is Disabled'}
          </Text>
          <Text style={styles.statusDesc}>
            {is2FAEnabled 
              ? 'Your account is protected with an extra layer of security.' 
              : 'Add an extra layer of security to your account.'}
          </Text>
        </View>

        {/* Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Enable 2FA</Text>
              <Text style={styles.toggleDesc}>Require a code when signing in</Text>
            </View>
            <Switch
              value={is2FAEnabled}
              onValueChange={handleToggle2FA}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={is2FAEnabled ? COLORS.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Methods */}
        <View style={styles.sectionHeader}>
          <Ionicons name="key-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Authentication Methods</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.methodRow} disabled={!is2FAEnabled}>
            <View style={[styles.methodIcon, !is2FAEnabled && styles.methodIconDisabled]}>
              <Ionicons name="phone-portrait-outline" size={22} color={is2FAEnabled ? COLORS.primary : COLORS.textSecondary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodLabel, !is2FAEnabled && styles.methodLabelDisabled]}>SMS Verification</Text>
              <Text style={styles.methodDesc}>Receive codes via text message</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={is2FAEnabled ? COLORS.textSecondary : COLORS.border} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.methodRow} disabled={!is2FAEnabled}>
            <View style={[styles.methodIcon, !is2FAEnabled && styles.methodIconDisabled]}>
              <Ionicons name="apps-outline" size={22} color={is2FAEnabled ? COLORS.primary : COLORS.textSecondary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodLabel, !is2FAEnabled && styles.methodLabelDisabled]}>Authenticator App</Text>
              <Text style={styles.methodDesc}>Use Google Authenticator or similar</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={is2FAEnabled ? COLORS.textSecondary : COLORS.border} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.warning} />
          <Text style={styles.infoText}>
            Two-factor authentication adds an extra layer of security by requiring a code in addition to your password when signing in.
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
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodIconDisabled: { backgroundColor: COLORS.background },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  methodLabelDisabled: { color: COLORS.textSecondary },
  methodDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
});