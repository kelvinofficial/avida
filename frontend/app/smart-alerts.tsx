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
  error: '#F44336',
  purple: '#9C27B0',
  blue: '#2196F3',
  orange: '#FF5722',
};

interface SmartNotificationConsent {
  user_id?: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  trigger_preferences: {
    new_listing_in_category: boolean;
    price_drop_saved_item: boolean;
    message_received: boolean;
    offer_received: boolean;
    offer_accepted: boolean;
    weekly_digest: boolean;
    promotional: boolean;
  };
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  max_emails_per_day: number;
  max_push_per_day: number;
  digest_frequency: string;
}

const DEFAULT_CONSENT: SmartNotificationConsent = {
  email_enabled: true,
  push_enabled: true,
  in_app_enabled: true,
  trigger_preferences: {
    new_listing_in_category: true,
    price_drop_saved_item: true,
    message_received: true,
    offer_received: true,
    offer_accepted: true,
    weekly_digest: true,
    promotional: false,
  },
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  max_emails_per_day: 5,
  max_push_per_day: 20,
  digest_frequency: 'weekly',
};

export default function SmartNotificationPreferencesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState<SmartNotificationConsent>(DEFAULT_CONSENT);

  useEffect(() => {
    fetchConsent();
  }, []);

  const fetchConsent = async () => {
    try {
      const response = await api.get('/smart-notifications/consent');
      if (response.data) {
        setConsent({
          ...DEFAULT_CONSENT,
          ...response.data,
          trigger_preferences: {
            ...DEFAULT_CONSENT.trigger_preferences,
            ...response.data.trigger_preferences,
          },
        });
      }
    } catch (error) {
      console.log('Using default smart notification consent');
    } finally {
      setLoading(false);
    }
  };

  const saveConsent = async () => {
    setSaving(true);
    try {
      await api.put('/smart-notifications/consent', consent);
      Alert.alert('Success', 'Smart notification preferences saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: 'email_enabled' | 'push_enabled' | 'in_app_enabled') => {
    setConsent(prev => ({
      ...prev,
      [channel]: !prev[channel],
    }));
  };

  const toggleTrigger = (trigger: keyof SmartNotificationConsent['trigger_preferences']) => {
    setConsent(prev => ({
      ...prev,
      trigger_preferences: {
        ...prev.trigger_preferences,
        [trigger]: !prev.trigger_preferences[trigger],
      },
    }));
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Smart Alerts</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="notifications-off" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Please log in to manage your notification preferences</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Alerts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={32} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Personalized Alerts</Text>
          <Text style={styles.heroDescription}>
            Get notified about new listings, price drops, and messages tailored to your interests!
          </Text>
        </View>

        {/* Delivery Channels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="send" size={22} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Delivery Channels</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose how you want to receive smart notifications.
          </Text>

          {/* Push Notifications */}
          <View style={styles.channelItem} data-testid="push-channel-toggle">
            <View style={styles.channelInfo}>
              <View style={[styles.channelIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="phone-portrait" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelName}>Push Notifications</Text>
                <Text style={styles.channelDesc}>Instant alerts on your device</Text>
              </View>
            </View>
            <Switch
              value={consent.push_enabled}
              onValueChange={() => toggleChannel('push_enabled')}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={consent.push_enabled ? COLORS.primary : '#f4f3f4'}
            />
          </View>

          {/* Email */}
          <View style={styles.channelItem} data-testid="email-channel-toggle">
            <View style={styles.channelInfo}>
              <View style={[styles.channelIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="mail" size={20} color={COLORS.error} />
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelName}>Email</Text>
                <Text style={styles.channelDesc}>Detailed notifications with images</Text>
              </View>
            </View>
            <Switch
              value={consent.email_enabled}
              onValueChange={() => toggleChannel('email_enabled')}
              trackColor={{ false: COLORS.border, true: '#FFCDD2' }}
              thumbColor={consent.email_enabled ? COLORS.error : '#f4f3f4'}
            />
          </View>

          {/* In-App */}
          <View style={[styles.channelItem, { borderBottomWidth: 0 }]} data-testid="in-app-channel-toggle">
            <View style={styles.channelInfo}>
              <View style={[styles.channelIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="notifications" size={20} color={COLORS.blue} />
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelName}>In-App Notifications</Text>
                <Text style={styles.channelDesc}>Alerts inside the app</Text>
              </View>
            </View>
            <Switch
              value={consent.in_app_enabled}
              onValueChange={() => toggleChannel('in_app_enabled')}
              trackColor={{ false: COLORS.border, true: '#BBDEFB' }}
              thumbColor={consent.in_app_enabled ? COLORS.blue : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Alert Types */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options" size={22} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Alert Types</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose which types of smart alerts you want to receive.
          </Text>

          {/* New Listing Alerts */}
          <View style={styles.alertItem} data-testid="new-listing-alert-toggle">
            <View style={styles.alertInfo}>
              <View style={[styles.alertIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="add-circle" size={22} color={COLORS.success} />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertName}>New Listing Alerts</Text>
                <Text style={styles.alertDesc}>
                  Get notified when new items are posted in categories you're interested in
                </Text>
              </View>
            </View>
            <Switch
              value={consent.trigger_preferences.new_listing_in_category}
              onValueChange={() => toggleTrigger('new_listing_in_category')}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={consent.trigger_preferences.new_listing_in_category ? COLORS.primary : '#f4f3f4'}
            />
          </View>

          {/* Price Drop Alerts */}
          <View style={styles.alertItem} data-testid="price-drop-alert-toggle">
            <View style={styles.alertInfo}>
              <View style={[styles.alertIcon, { backgroundColor: '#FBE9E7' }]}>
                <Ionicons name="trending-down" size={22} color={COLORS.orange} />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertName}>Price Drop Alerts</Text>
                <Text style={styles.alertDesc}>
                  Get notified when items you've saved drop in price
                </Text>
              </View>
            </View>
            <Switch
              value={consent.trigger_preferences.price_drop_saved_item}
              onValueChange={() => toggleTrigger('price_drop_saved_item')}
              trackColor={{ false: COLORS.border, true: '#FFCCBC' }}
              thumbColor={consent.trigger_preferences.price_drop_saved_item ? COLORS.orange : '#f4f3f4'}
            />
          </View>

          {/* Message Alerts */}
          <View style={styles.alertItem} data-testid="message-alert-toggle">
            <View style={styles.alertInfo}>
              <View style={[styles.alertIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="chatbubble" size={22} color={COLORS.blue} />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertName}>Message Notifications</Text>
                <Text style={styles.alertDesc}>
                  Get notified when you receive new messages
                </Text>
              </View>
            </View>
            <Switch
              value={consent.trigger_preferences.message_received}
              onValueChange={() => toggleTrigger('message_received')}
              trackColor={{ false: COLORS.border, true: '#BBDEFB' }}
              thumbColor={consent.trigger_preferences.message_received ? COLORS.blue : '#f4f3f4'}
            />
          </View>

          {/* Offer Alerts */}
          <View style={styles.alertItem} data-testid="offer-alert-toggle">
            <View style={styles.alertInfo}>
              <View style={[styles.alertIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="pricetag" size={22} color={COLORS.purple} />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertName}>Offer Notifications</Text>
                <Text style={styles.alertDesc}>
                  Get notified when you receive or your offers are accepted
                </Text>
              </View>
            </View>
            <Switch
              value={consent.trigger_preferences.offer_received}
              onValueChange={() => toggleTrigger('offer_received')}
              trackColor={{ false: COLORS.border, true: '#E1BEE7' }}
              thumbColor={consent.trigger_preferences.offer_received ? COLORS.purple : '#f4f3f4'}
            />
          </View>

          {/* Weekly Digest */}
          <View style={styles.alertItem} data-testid="weekly-digest-toggle">
            <View style={styles.alertInfo}>
              <View style={[styles.alertIcon, { backgroundColor: '#ECEFF1' }]}>
                <Ionicons name="newspaper" size={22} color="#607D8B" />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertName}>Weekly Digest</Text>
                <Text style={styles.alertDesc}>
                  A summary of new listings and activity in your interests
                </Text>
              </View>
            </View>
            <Switch
              value={consent.trigger_preferences.weekly_digest}
              onValueChange={() => toggleTrigger('weekly_digest')}
              trackColor={{ false: COLORS.border, true: '#CFD8DC' }}
              thumbColor={consent.trigger_preferences.weekly_digest ? '#607D8B' : '#f4f3f4'}
            />
          </View>

          {/* Promotional */}
          <View style={[styles.alertItem, { borderBottomWidth: 0 }]} data-testid="promotional-toggle">
            <View style={styles.alertInfo}>
              <View style={[styles.alertIcon, { backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="megaphone" size={22} color={COLORS.warning} />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertName}>Promotions & Deals</Text>
                <Text style={styles.alertDesc}>
                  Special offers and marketplace promotions
                </Text>
              </View>
            </View>
            <Switch
              value={consent.trigger_preferences.promotional}
              onValueChange={() => toggleTrigger('promotional')}
              trackColor={{ false: COLORS.border, true: '#FFECB3' }}
              thumbColor={consent.trigger_preferences.promotional ? COLORS.warning : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="moon" size={22} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Pause notifications during specific hours (notifications will be sent when quiet hours end).
          </Text>

          <View style={[styles.channelItem, { borderBottomWidth: 0 }]} data-testid="quiet-hours-toggle">
            <View style={styles.channelInfo}>
              <View style={[styles.channelIcon, { backgroundColor: '#E8EAF6' }]}>
                <Ionicons name="notifications-off" size={20} color="#5C6BC0" />
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelName}>Enable Quiet Hours</Text>
                <Text style={styles.channelDesc}>
                  {consent.quiet_hours_enabled
                    ? `${consent.quiet_hours_start} - ${consent.quiet_hours_end}`
                    : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={consent.quiet_hours_enabled}
              onValueChange={() => setConsent(prev => ({ ...prev, quiet_hours_enabled: !prev.quiet_hours_enabled }))}
              trackColor={{ false: COLORS.border, true: '#C5CAE9' }}
              thumbColor={consent.quiet_hours_enabled ? '#5C6BC0' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="bulb" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Smart alerts learn from your browsing patterns. The more you use the app, the better your recommendations become!
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveConsent}
          disabled={saving}
          data-testid="save-preferences-btn"
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
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
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
  heroSection: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
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
    flex: 1,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelText: {
    flex: 1,
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
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    gap: 4,
  },
  alertName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
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
