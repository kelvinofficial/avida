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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { safeGoBack } from '../../src/utils/navigation';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#FF9800',
  success: '#4CAF50',
};

interface PreferenceItem {
  key: string;
  name: string;
  description: string;
  required: boolean;
  category: string;
}

interface PreferenceCategory {
  id: string;
  name: string;
  description: string;
  preferences: PreferenceItem[];
}

interface Preferences {
  [key: string]: boolean;
}

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<PreferenceCategory[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [categoriesRes, prefsRes] = await Promise.all([
        api.get('/notification-preferences/categories'),
        api.get('/notification-preferences'),
      ]);
      
      setCategories(categoriesRes.data.categories || []);
      setPreferences(prefsRes.data || {});
    } catch (error: any) {
      console.error('Error fetching preferences:', error);
      if (error.response?.status !== 401) {
        Alert.alert('Error', 'Failed to load notification preferences');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, fetchData, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleToggle = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/notification-preferences', preferences);
      Alert.alert('Success', 'Notification preferences saved');
      setHasChanges(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribeAll = () => {
    Alert.alert(
      'Unsubscribe from Marketing',
      'This will disable all marketing and promotional emails. You will still receive important transactional emails.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/notification-preferences/unsubscribe-all');
              Alert.alert('Success', 'Unsubscribed from marketing emails');
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to unsubscribe');
            }
          }
        }
      ]
    );
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'transactional': return 'receipt-outline';
      case 'reminders': return 'alarm-outline';
      case 'marketing': return 'megaphone-outline';
      default: return 'notifications-outline';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'transactional': return COLORS.primary;
      case 'reminders': return COLORS.warning;
      case 'marketing': return '#9C27B0';
      default: return COLORS.textSecondary;
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        {hasChanges ? (
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.saveBtn}
            disabled={saving}
            data-testid="save-button"
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Manage how you receive notifications from Avida. Some emails are required for account security.
          </Text>
        </View>

        {/* Preference Categories */}
        {categories.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: category.id === 'email' ? COLORS.primaryLight : '#E3F2FD' }]}>
                <Ionicons 
                  name={category.id === 'email' ? 'mail-outline' : 'notifications-outline'} 
                  size={20} 
                  color={category.id === 'email' ? COLORS.primary : '#1976D2'} 
                />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
            </View>

            <View style={styles.preferencesList}>
              {category.preferences.map((pref, index) => (
                <View 
                  key={pref.key} 
                  style={[
                    styles.preferenceItem,
                    index === category.preferences.length - 1 && styles.preferenceItemLast
                  ]}
                >
                  <View style={styles.preferenceLeft}>
                    <View style={[styles.prefIcon, { backgroundColor: getCategoryColor(pref.category) + '15' }]}>
                      <Ionicons 
                        name={getCategoryIcon(pref.category) as any} 
                        size={16} 
                        color={getCategoryColor(pref.category)} 
                      />
                    </View>
                    <View style={styles.preferenceInfo}>
                      <View style={styles.prefNameRow}>
                        <Text style={styles.preferenceName}>{pref.name}</Text>
                        {pref.required && (
                          <View style={styles.requiredBadge}>
                            <Text style={styles.requiredText}>Required</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.preferenceDescription}>{pref.description}</Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences[pref.key] ?? true}
                    onValueChange={(value) => handleToggle(pref.key, value)}
                    disabled={pref.required}
                    trackColor={{ false: '#E0E0E0', true: COLORS.primaryLight }}
                    thumbColor={preferences[pref.key] ? COLORS.primary : '#f4f3f4'}
                    data-testid={`toggle-${pref.key}`}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => {
              const allEnabled: Preferences = {};
              categories.forEach(cat => {
                cat.preferences.forEach(pref => {
                  allEnabled[pref.key] = true;
                });
              });
              setPreferences(allEnabled);
              setHasChanges(true);
            }}
            data-testid="enable-all-button"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="checkmark-done" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionName}>Enable All Notifications</Text>
              <Text style={styles.actionDescription}>Receive all updates and promotions</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.dangerCard]}
            onPress={handleUnsubscribeAll}
            data-testid="unsubscribe-all-button"
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="mail-unread-outline" size={20} color={COLORS.error} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionName}>Unsubscribe from Marketing</Text>
              <Text style={styles.actionDescription}>Keep only essential transactional emails</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.footerText}>
            We respect your privacy. Transactional emails for orders and security cannot be disabled.
          </Text>
        </View>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.primaryLight,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },

  categorySection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  categoryDescription: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  preferencesList: {},
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  preferenceItemLast: { borderBottomWidth: 0 },
  preferenceLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  prefIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  preferenceInfo: { flex: 1 },
  prefNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  preferenceName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  preferenceDescription: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  requiredBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: { fontSize: 10, fontWeight: '600', color: COLORS.warning },

  quickActions: { paddingHorizontal: 16, marginTop: 8 },
  quickActionsTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dangerCard: { borderWidth: 1, borderColor: '#FFCDD2' },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionInfo: { flex: 1 },
  actionName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  actionDescription: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  footerText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
});
