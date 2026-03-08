import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/utils/api';

const COLORS = {
  primary: '#2E7D32',
  text: '#1A1A1A',
  textSecondary: '#666',
  textLight: '#999',
  background: '#F8F9FA',
  card: '#fff',
  border: '#E8E8E8',
  info: '#2196F3',
  warning: '#FF9800',
  error: '#F44336',
};

interface NotificationChannel {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export default function NotificationPreferences() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<NotificationChannel[]>([
    { id: 'messages', label: 'Messages', description: 'New messages from buyers and sellers', icon: 'chatbubble', enabled: true },
    { id: 'orders', label: 'Orders', description: 'Order updates, shipping, and delivery', icon: 'bag-check', enabled: true },
    { id: 'offers', label: 'Offers', description: 'New offers and price negotiations', icon: 'pricetag', enabled: true },
    { id: 'promotions', label: 'Promotions', description: 'Deals, discounts, and special offers', icon: 'megaphone', enabled: false },
    { id: 'seller_analytics', label: 'Seller Analytics', description: 'Performance insights and engagement alerts', icon: 'analytics', enabled: true },
    { id: 'badges', label: 'Badges & Achievements', description: 'Badge unlocks and milestones', icon: 'ribbon', enabled: true },
    { id: 'system', label: 'System', description: 'Account security and important updates', icon: 'settings', enabled: true },
  ]);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/notification-preferences');
      if (res.data?.channels) {
        setChannels(prev => prev.map(ch => ({
          ...ch,
          enabled: res.data.channels[ch.id] ?? ch.enabled,
        })));
      }
      if (res.data?.push_enabled !== undefined) setPushEnabled(res.data.push_enabled);
      if (res.data?.email_enabled !== undefined) setEmailEnabled(res.data.email_enabled);
      if (res.data?.sms_enabled !== undefined) setSmsEnabled(res.data.sms_enabled);
    } catch (e) {
      // Use defaults
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const toggleChannel = (id: string) => {
    setChannels(prev => prev.map(ch =>
      ch.id === id ? { ...ch, enabled: !ch.enabled } : ch
    ));
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const channelMap: Record<string, boolean> = {};
      channels.forEach(ch => { channelMap[ch.id] = ch.enabled; });

      await api.put('/settings/notification-preferences', {
        channels: channelMap,
        push_enabled: pushEnabled,
        email_enabled: emailEnabled,
        sms_enabled: smsEnabled,
      });
      Alert.alert('Saved', 'Notification preferences updated.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save preferences.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <TouchableOpacity onPress={savePreferences} disabled={saving} style={styles.saveBtn}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Delivery Methods */}
        <Text style={styles.sectionTitle}>Delivery Methods</Text>
        <View style={styles.card}>
          <View style={styles.methodRow}>
            <View style={styles.methodInfo}>
              <Ionicons name="notifications" size={20} color={COLORS.primary} />
              <View>
                <Text style={styles.methodLabel}>Push Notifications</Text>
                <Text style={styles.methodDesc}>Real-time alerts on your device</Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ true: COLORS.primary }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.methodRow}>
            <View style={styles.methodInfo}>
              <Ionicons name="mail" size={20} color={COLORS.info} />
              <View>
                <Text style={styles.methodLabel}>Email</Text>
                <Text style={styles.methodDesc}>Summaries and important updates</Text>
              </View>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ true: COLORS.info }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.methodRow}>
            <View style={styles.methodInfo}>
              <Ionicons name="phone-portrait" size={20} color={COLORS.warning} />
              <View>
                <Text style={styles.methodLabel}>SMS</Text>
                <Text style={styles.methodDesc}>Critical alerts only</Text>
              </View>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ true: COLORS.warning }}
            />
          </View>
        </View>

        {/* Notification Channels */}
        <Text style={styles.sectionTitle}>Notification Channels</Text>
        <View style={styles.card}>
          {channels.map((channel, index) => (
            <React.Fragment key={channel.id}>
              {index > 0 && <View style={styles.divider} />}
              <View style={styles.channelRow}>
                <View style={styles.channelInfo}>
                  <View style={[styles.channelIcon, { backgroundColor: channel.enabled ? '#E8F5E9' : '#F5F5F5' }]}>
                    <Ionicons
                      name={channel.icon as any}
                      size={18}
                      color={channel.enabled ? COLORS.primary : COLORS.textLight}
                    />
                  </View>
                  <View style={styles.channelText}>
                    <Text style={styles.channelLabel}>{channel.label}</Text>
                    <Text style={styles.channelDesc}>{channel.description}</Text>
                  </View>
                </View>
                <Switch
                  value={channel.enabled}
                  onValueChange={() => toggleChannel(channel.id)}
                  trackColor={{ true: COLORS.primary }}
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 14,
  },
  methodInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  methodDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 14 },
  channelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  channelInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  channelIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  channelText: { flex: 1 },
  channelLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  channelDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
