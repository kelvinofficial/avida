import React, { useEffect, useState } from 'react';
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
import api from '../src/utils/api';
import { useAuthStore } from '../src/store/authStore';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  whatsapp: '#25D366',
  sms: '#2196F3',
  email: '#F44336',
};

interface NotificationPreferences {
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
  preferred_channel: 'sms' | 'whatsapp' | 'email';
  event_preferences: {
    order_updates: boolean;
    delivery_updates: boolean;
    payment_updates: boolean;
    promotions: boolean;
  };
}

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    sms: true,
    whatsapp: true,
    email: false,
    preferred_channel: 'sms',
    event_preferences: {
      order_updates: true,
      delivery_updates: true,
      payment_updates: true,
      promotions: true,
    },
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/notifications/preferences');
      if (response.data) {
        setPreferences({
          ...preferences,
          ...response.data,
        });
      }
    } catch (error) {
      console.log('Using default preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/preferences', preferences);
      Alert.alert('Success', 'Notification preferences saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: 'sms' | 'whatsapp' | 'email') => {
    setPreferences(prev => ({
      ...prev,
      [channel]: !prev[channel],
    }));
  };

  const setPreferredChannel = (channel: 'sms' | 'whatsapp' | 'email') => {
    setPreferences(prev => ({
      ...prev,
      preferred_channel: channel,
      [channel]: true, // Enable the channel if setting as preferred
    }));
  };

  const toggleEventPreference = (event: keyof NotificationPreferences['event_preferences']) => {
    setPreferences(prev => ({
      ...prev,
      event_preferences: {
        ...prev.event_preferences,
        [event]: !prev.event_preferences[event],
      },
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Channels Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles-outline" size={22} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Notification Channels</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose how you want to receive notifications about your orders and deliveries.
          </Text>

          {/* SMS Toggle */}
          <View style={styles.channelItem}>
            <View style={styles.channelInfo}>
              <View style={[styles.channelIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="chatbox" size={20} color={COLORS.sms} />
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelName}>SMS</Text>
                <Text style={styles.channelDesc}>Text messages to your phone</Text>
              </View>
            </View>
            <Switch
              value={preferences.sms}
              onValueChange={() => toggleChannel('sms')}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={preferences.sms ? COLORS.primary : '#f4f3f4'}
            />
          </View>

          {/* WhatsApp Toggle */}
          <View style={styles.channelItem}>
            <View style={styles.channelInfo}>
              <View style={[styles.channelIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="logo-whatsapp" size={20} color={COLORS.whatsapp} />
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelName}>WhatsApp</Text>
                <Text style={styles.channelDesc}>Messages with tracking links</Text>
              </View>
            </View>
            <Switch
              value={preferences.whatsapp}
              onValueChange={() => toggleChannel('whatsapp')}
              trackColor={{ false: COLORS.border, true: '#C8E6C9' }}
              thumbColor={preferences.whatsapp ? COLORS.whatsapp : '#f4f3f4'}
            />
          </View>

          {/* Email Toggle */}
          <View style={styles.channelItem}>
            <View style={styles.channelInfo}>
              <View style={[styles.channelIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="mail" size={20} color={COLORS.email} />
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelName}>Email</Text>
                <Text style={styles.channelDesc}>Detailed email notifications</Text>
              </View>
            </View>
            <Switch
              value={preferences.email}
              onValueChange={() => toggleChannel('email')}
              trackColor={{ false: COLORS.border, true: '#FFCDD2' }}
              thumbColor={preferences.email ? COLORS.email : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Preferred Channel Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={22} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Preferred Channel</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Your primary channel for time-sensitive notifications like delivery OTP.
          </Text>

          <View style={styles.preferredChannels}>
            {[
              { key: 'sms', label: 'SMS', icon: 'chatbox', color: COLORS.sms },
              { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: COLORS.whatsapp },
              { key: 'email', label: 'Email', icon: 'mail', color: COLORS.email },
            ].map((channel) => (
              <TouchableOpacity
                key={channel.key}
                style={[
                  styles.preferredOption,
                  preferences.preferred_channel === channel.key && styles.preferredOptionActive,
                ]}
                onPress={() => setPreferredChannel(channel.key as any)}
              >
                <Ionicons
                  name={channel.icon as any}
                  size={24}
                  color={preferences.preferred_channel === channel.key ? '#fff' : channel.color}
                />
                <Text
                  style={[
                    styles.preferredLabel,
                    preferences.preferred_channel === channel.key && styles.preferredLabelActive,
                  ]}
                >
                  {channel.label}
                </Text>
                {preferences.preferred_channel === channel.key && (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Event Types Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Notification Types</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose which types of notifications you want to receive.
          </Text>

          {[
            { key: 'order_updates', label: 'Order Updates', desc: 'New orders, confirmations', icon: 'cart' },
            { key: 'delivery_updates', label: 'Delivery Updates', desc: 'Shipping, tracking, OTP', icon: 'bicycle' },
            { key: 'payment_updates', label: 'Payment Updates', desc: 'Escrow, releases, refunds', icon: 'wallet' },
            { key: 'promotions', label: 'Promotions & Offers', desc: 'Deals and special offers', icon: 'pricetag' },
          ].map((event) => (
            <View key={event.key} style={styles.eventItem}>
              <View style={styles.eventInfo}>
                <View style={styles.eventIcon}>
                  <Ionicons name={event.icon as any} size={18} color={COLORS.primary} />
                </View>
                <View style={styles.eventText}>
                  <Text style={styles.eventName}>{event.label}</Text>
                  <Text style={styles.eventDesc}>{event.desc}</Text>
                </View>
              </View>
              <Switch
                value={preferences.event_preferences[event.key as keyof typeof preferences.event_preferences]}
                onValueChange={() => toggleEventPreference(event.key as any)}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={preferences.event_preferences[event.key as keyof typeof preferences.event_preferences] ? COLORS.primary : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            You'll receive a delivery OTP via your preferred channel when your order is out for delivery.
            Share this code with the driver to confirm delivery.
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={savePreferences}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelText: {
    gap: 2,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  channelDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  preferredChannels: {
    flexDirection: 'row',
    gap: 10,
  },
  preferredOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    gap: 6,
  },
  preferredOptionActive: {
    backgroundColor: COLORS.primary,
  },
  preferredLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  preferredLabelActive: {
    color: '#fff',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventText: {
    flex: 1,
    gap: 2,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primaryDark,
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
