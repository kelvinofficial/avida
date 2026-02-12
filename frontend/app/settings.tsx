import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import api from '../src/utils/api';
import { UserSettings } from '../src/types/settings';
import { useResponsive } from '../src/hooks/useResponsive';
import { LocationPicker, LocationData } from '../src/components/LocationPicker';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
};

const HORIZONTAL_PADDING = 16;

// ============ SECTION HEADER ============
const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
  <View style={sectionStyles.header}>
    <Ionicons name={icon as any} size={20} color={COLORS.primary} />
    <Text style={sectionStyles.title}>{title}</Text>
  </View>
);

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// ============ TOGGLE ROW ============
const ToggleRow = ({ 
  label, 
  value, 
  onChange, 
  disabled = false,
  description,
}: { 
  label: string; 
  value: boolean; 
  onChange: (value: boolean) => void;
  disabled?: boolean;
  description?: string;
}) => (
  <View style={toggleStyles.container}>
    <View style={toggleStyles.textContainer}>
      <Text style={[toggleStyles.label, disabled && toggleStyles.labelDisabled]}>{label}</Text>
      {description && <Text style={toggleStyles.description}>{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
      thumbColor={value ? COLORS.primary : '#f4f3f4'}
    />
  </View>
);

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: HORIZONTAL_PADDING,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  labelDisabled: {
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

// ============ NAVIGATION ROW ============
const NavigationRow = ({ 
  icon, 
  label, 
  value, 
  onPress,
  showChevron = true,
  danger = false,
}: { 
  icon: string; 
  label: string; 
  value?: string; 
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
}) => (
  <TouchableOpacity style={navStyles.container} onPress={onPress}>
    <View style={[navStyles.iconContainer, danger && navStyles.iconDanger]}>
      <Ionicons name={icon as any} size={20} color={danger ? COLORS.error : COLORS.text} />
    </View>
    <Text style={[navStyles.label, danger && navStyles.labelDanger]}>{label}</Text>
    {value && <Text style={navStyles.value}>{value}</Text>}
    {showChevron && <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />}
  </TouchableOpacity>
);

const navStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: HORIZONTAL_PADDING,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDanger: {
    backgroundColor: '#FFEBEE',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  labelDanger: {
    color: COLORS.error,
  },
  value: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

// ============ MAIN SCREEN ============
export default function SettingsScreen() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('notifications');
  const [defaultLocation, setDefaultLocation] = useState<LocationData | null>(null);
  const [locationSaving, setLocationSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
      // Load default location if exists
      if (response.data?.default_location) {
        setDefaultLocation(response.data.default_location);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveDefaultLocation = async (location: LocationData) => {
    setLocationSaving(true);
    try {
      await api.put('/users/me/location', { default_location: location });
      setDefaultLocation(location);
      Alert.alert('Success', 'Default location saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save location');
    } finally {
      setLocationSaving(false);
    }
  };

  const clearDefaultLocation = async () => {
    setLocationSaving(true);
    try {
      await api.put('/users/me/location', { default_location: null });
      setDefaultLocation(null);
      Alert.alert('Success', 'Default location cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear location');
    } finally {
      setLocationSaving(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchSettings]);

  const updateSettings = async (path: string, value: any) => {
    if (!settings) return;

    setSaving(true);
    try {
      const keys = path.split('.');
      const updateData: any = {};
      
      if (keys.length === 2) {
        updateData[keys[0]] = { [keys[1]]: value };
      } else {
        updateData[path] = value;
      }

      await api.put('/settings', updateData);
      
      // Update local state
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

  const handleSignOut = async () => {
    // Navigate to dedicated sign out page for better UX
    router.push('/signout');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Your account will be permanently deleted after 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          style: 'destructive',
          onPress: () => router.push('/settings/delete-account')
        },
      ]
    );
  };

  // ============ DESKTOP VIEW - UNAUTHENTICATED ============
  if (isLargeScreen && !isAuthenticated) {
    return (
      <View style={desktopStyles.container}>
        {/* Desktop Header */}
        <View style={desktopStyles.header}>
          <View style={desktopStyles.headerInner}>
            <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
              <View style={desktopStyles.logoIcon}>
                <Ionicons name="storefront" size={22} color="#fff" />
              </View>
              <Text style={desktopStyles.logoText}>avida</Text>
            </TouchableOpacity>
            <View style={desktopStyles.headerActions}>
              <TouchableOpacity style={desktopStyles.postBtn} onPress={() => router.push('/login')}>
                <Text style={desktopStyles.postBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={desktopStyles.unauthContainer}>
          <View style={desktopStyles.unauthCard}>
            <Ionicons name="settings-outline" size={64} color={COLORS.primary} />
            <Text style={desktopStyles.unauthTitle}>Settings</Text>
            <Text style={desktopStyles.unauthSubtitle}>Please sign in to access your settings</Text>
            <TouchableOpacity style={desktopStyles.signInBtn} onPress={() => router.push('/login')}>
              <Text style={desktopStyles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ============ MOBILE VIEW - UNAUTHENTICATED ============
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginMessage}>Please sign in to access settings</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const notifications = settings?.notifications || {};
  const privacy = settings?.privacy || {};
  const appPrefs = settings?.app_preferences || {};

  const SETTINGS_SECTIONS = [
    { key: 'notifications', icon: 'notifications-outline', label: 'Notifications' },
    { key: 'location', icon: 'location-outline', label: 'Default Location' },
    { key: 'security', icon: 'shield-outline', label: 'Security' },
    { key: 'privacy', icon: 'eye-outline', label: 'Privacy' },
    { key: 'preferences', icon: 'color-palette-outline', label: 'App Preferences' },
    { key: 'account', icon: 'person-outline', label: 'Account' },
  ];

  // ============ DESKTOP VIEW - AUTHENTICATED ============
  if (isLargeScreen) {
    return (
      <View style={desktopStyles.container}>
        {/* Desktop Header */}
        <View style={desktopStyles.header}>
          <View style={desktopStyles.headerInner}>
            <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
              <View style={desktopStyles.logoIcon}>
                <Ionicons name="storefront" size={22} color="#fff" />
              </View>
              <Text style={desktopStyles.logoText}>avida</Text>
            </TouchableOpacity>
            <View style={desktopStyles.headerActions}>
              <TouchableOpacity style={desktopStyles.headerBtn} onPress={() => router.push('/profile')}>
                <Ionicons name="person-circle-outline" size={26} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={desktopStyles.postBtn} onPress={() => router.push('/post')}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={desktopStyles.postBtnText}>Post Listing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={desktopStyles.mainContent}>
          {/* Sidebar Navigation */}
          <View style={desktopStyles.sidebar}>
            <View style={desktopStyles.sidebarHeader}>
              <Ionicons name="settings" size={24} color={COLORS.primary} />
              <Text style={desktopStyles.sidebarTitle}>Settings</Text>
            </View>

            <ScrollView style={desktopStyles.sidebarScrollView} showsVerticalScrollIndicator={false}>
              <View style={desktopStyles.navItems}>
                {SETTINGS_SECTIONS.map(section => (
                  <TouchableOpacity
                    key={section.key}
                    style={[desktopStyles.navItem, activeSection === section.key && desktopStyles.navItemActive]}
                    onPress={() => setActiveSection(section.key)}
                  >
                    <Ionicons 
                      name={section.icon as any} 
                      size={20} 
                      color={activeSection === section.key ? COLORS.primary : COLORS.textSecondary} 
                    />
                    <Text style={[desktopStyles.navItemText, activeSection === section.key && desktopStyles.navItemTextActive]}>
                      {section.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={desktopStyles.sidebarFooter}>
              <Text style={desktopStyles.versionText}>avida v1.0.0</Text>
            </View>
          </View>

          {/* Settings Content */}
          <ScrollView style={desktopStyles.contentArea} contentContainerStyle={desktopStyles.contentInner}>
            {saving && (
              <View style={desktopStyles.savingIndicator}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={desktopStyles.savingText}>Saving...</Text>
              </View>
            )}

            {activeSection === 'notifications' && (
              <View style={desktopStyles.sectionCard}>
                <Text style={desktopStyles.sectionTitle}>Notification Settings</Text>
                <Text style={desktopStyles.sectionSubtitle}>Manage how you receive notifications</Text>
                
                <View style={desktopStyles.settingsGroup}>
                  <ToggleRow label="Push Notifications" description="Receive alerts on your device" value={notifications.push ?? true} onChange={(v) => updateSettings('notifications.push', v)} />
                  <ToggleRow label="Email Notifications" description="Get updates via email" value={notifications.email ?? true} onChange={(v) => updateSettings('notifications.email', v)} />
                  <ToggleRow label="SMS Notifications" description="Receive text messages" value={notifications.sms ?? false} onChange={(v) => updateSettings('notifications.sms', v)} />
                  <ToggleRow 
                    label="Message Sound" 
                    description="Play a sound when new messages arrive" 
                    value={soundEnabled} 
                    onChange={(v) => setSoundEnabled(v)} 
                  />
                </View>

                <Text style={desktopStyles.groupTitle}>Notification Types</Text>
                <View style={desktopStyles.settingsGroup}>
                  <ToggleRow label="Messages" value={notifications.messages ?? true} onChange={(v) => updateSettings('notifications.messages', v)} />
                  <ToggleRow label="Offers" value={notifications.offers ?? true} onChange={(v) => updateSettings('notifications.offers', v)} />
                  <ToggleRow label="Price Drops" value={notifications.price_drops ?? true} onChange={(v) => updateSettings('notifications.price_drops', v)} />
                  <ToggleRow label="New Followers" value={notifications.new_followers ?? true} onChange={(v) => updateSettings('notifications.new_followers', v)} />
                  <ToggleRow label="Reviews" value={notifications.reviews ?? true} onChange={(v) => updateSettings('notifications.reviews', v)} />
                  <ToggleRow label="Promotions" description="Marketing and promotional content" value={notifications.promotions ?? false} onChange={(v) => updateSettings('notifications.promotions', v)} />
                </View>
              </View>
            )}

            {activeSection === 'location' && (
              <View style={desktopStyles.sectionCard}>
                <Text style={desktopStyles.sectionTitle}>Default Location</Text>
                <Text style={desktopStyles.sectionSubtitle}>Set your preferred location for posting listings</Text>
                
                <View style={desktopStyles.settingsGroup}>
                  <View style={desktopStyles.locationSection}>
                    <View style={desktopStyles.locationInfo}>
                      <Ionicons name="location" size={24} color={COLORS.primary} />
                      <View style={desktopStyles.locationTextContainer}>
                        <Text style={desktopStyles.locationLabel}>
                          {defaultLocation ? 'Current Default Location' : 'No default location set'}
                        </Text>
                        {defaultLocation && (
                          <Text style={desktopStyles.locationValue}>
                            {defaultLocation.location_text || defaultLocation.city_name || 'Unknown'}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <Text style={desktopStyles.locationHint}>
                      When you post a new listing, this location will be pre-selected for you.
                    </Text>
                    
                    <View style={desktopStyles.locationPickerContainer}>
                      <LocationPicker
                        value={defaultLocation}
                        onChange={(loc) => saveDefaultLocation(loc)}
                        placeholder="Select your default location"
                        disabled={locationSaving}
                      />
                    </View>
                    
                    {defaultLocation && (
                      <TouchableOpacity 
                        style={desktopStyles.clearLocationBtn}
                        onPress={clearDefaultLocation}
                        disabled={locationSaving}
                      >
                        {locationSaving ? (
                          <ActivityIndicator size="small" color={COLORS.error} />
                        ) : (
                          <>
                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                            <Text style={desktopStyles.clearLocationText}>Clear Default Location</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}

            {activeSection === 'security' && (
              <View style={desktopStyles.sectionCard}>
                <Text style={desktopStyles.sectionTitle}>Security Settings</Text>
                <Text style={desktopStyles.sectionSubtitle}>Protect your account</Text>
                
                <View style={desktopStyles.settingsGroup}>
                  <NavigationRow icon="key-outline" label="Change Password" onPress={() => router.push('/settings/change-password')} />
                  <NavigationRow icon="finger-print-outline" label="Two-Factor Authentication" value={settings?.security?.two_factor_enabled ? 'On' : 'Off'} onPress={() => router.push('/settings/2fa')} />
                  <NavigationRow icon="lock-closed-outline" label="App Lock" value={settings?.security?.app_lock_enabled ? 'Enabled' : 'Disabled'} onPress={() => router.push('/settings/app-lock')} />
                  <NavigationRow icon="phone-portrait-outline" label="Active Sessions" onPress={() => router.push('/settings/sessions')} />
                </View>
              </View>
            )}

            {activeSection === 'privacy' && (
              <View style={desktopStyles.sectionCard}>
                <Text style={desktopStyles.sectionTitle}>Privacy Settings</Text>
                <Text style={desktopStyles.sectionSubtitle}>Control your privacy and visibility</Text>
                
                <View style={desktopStyles.settingsGroup}>
                  <ToggleRow label="Location Services" description="Allow app to access your location" value={privacy.location_services ?? true} onChange={(v) => updateSettings('privacy.location_services', v)} />
                  <ToggleRow label="Show Online Status" value={privacy.show_online_status ?? true} onChange={(v) => updateSettings('privacy.show_online_status', v)} />
                  <ToggleRow label="Show Last Seen" value={privacy.show_last_seen ?? true} onChange={(v) => updateSettings('privacy.show_last_seen', v)} />
                  <ToggleRow label="Allow Profile Discovery" description="Let others find your profile in search" value={privacy.allow_profile_discovery ?? true} onChange={(v) => updateSettings('privacy.allow_profile_discovery', v)} />
                  <ToggleRow label="Allow Direct Messages" value={privacy.allow_direct_messages ?? true} onChange={(v) => updateSettings('privacy.allow_direct_messages', v)} />
                  <NavigationRow icon="ban-outline" label="Blocked Users" onPress={() => router.push('/settings/blocked-users')} />
                </View>
              </View>
            )}

            {activeSection === 'preferences' && (
              <View style={desktopStyles.sectionCard}>
                <Text style={desktopStyles.sectionTitle}>App Preferences</Text>
                <Text style={desktopStyles.sectionSubtitle}>Customize your experience</Text>
                
                <View style={desktopStyles.settingsGroup}>
                  <NavigationRow icon="language-outline" label="Language" value={appPrefs.language === 'en' ? 'English' : appPrefs.language || 'English'} onPress={() => router.push('/settings/language')} />
                  <NavigationRow icon="cash-outline" label="Currency" value={appPrefs.currency || 'EUR'} onPress={() => router.push('/settings/currency')} />
                  <NavigationRow icon="moon-outline" label="Dark Mode" value={appPrefs.dark_mode === 'system' ? 'System' : appPrefs.dark_mode === 'dark' ? 'Dark' : 'Light'} onPress={() => router.push('/settings/appearance')} />
                  <NavigationRow icon="cloud-download-outline" label="Data & Storage" onPress={() => router.push('/settings/storage')} />
                </View>
              </View>
            )}

            {activeSection === 'account' && (
              <View style={desktopStyles.sectionCard}>
                <Text style={desktopStyles.sectionTitle}>Account</Text>
                <Text style={desktopStyles.sectionSubtitle}>Manage your account</Text>
                
                <View style={desktopStyles.settingsGroup}>
                  <NavigationRow icon="log-out-outline" label="Sign Out" onPress={handleSignOut} showChevron={false} />
                  <NavigationRow icon="trash-outline" label="Delete Account" onPress={handleDeleteAccount} showChevron={false} danger />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  }

  // ============ MOBILE VIEW ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        {saving && <ActivityIndicator size="small" color={COLORS.primary} />}
        {!saving && <View style={{ width: 24 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* NOTIFICATIONS */}
        <SectionHeader icon="notifications-outline" title="Notifications" />
        <View style={styles.section}>
          <ToggleRow
            label="Push Notifications"
            description="Receive alerts on your device"
            value={notifications.push ?? true}
            onChange={(v) => updateSettings('notifications.push', v)}
          />
          <ToggleRow
            label="Email Notifications"
            description="Get updates via email"
            value={notifications.email ?? true}
            onChange={(v) => updateSettings('notifications.email', v)}
          />
          <ToggleRow
            label="Message Alerts"
            value={notifications.messages ?? true}
            onChange={(v) => updateSettings('notifications.messages', v)}
          />
          <ToggleRow
            label="Offer Alerts"
            value={notifications.offers ?? true}
            onChange={(v) => updateSettings('notifications.offers', v)}
          />
          <ToggleRow
            label="Price Drop Alerts"
            value={notifications.price_drops ?? true}
            onChange={(v) => updateSettings('notifications.price_drops', v)}
          />
          <ToggleRow
            label="Saved Search Alerts"
            value={notifications.saved_searches ?? true}
            onChange={(v) => updateSettings('notifications.saved_searches', v)}
          />
          <ToggleRow
            label="Better Deal Alerts"
            description="Get notified when similar items are available at better prices"
            value={notifications.better_deals ?? true}
            onChange={(v) => updateSettings('notifications.better_deals', v)}
          />
          <ToggleRow
            label="System & Security Alerts"
            description="Important account updates (cannot be disabled)"
            value={true}
            onChange={() => {}}
            disabled
          />
          <NavigationRow
            icon="options-outline"
            label="Advanced Alert Settings"
            onPress={() => router.push('/settings/alerts')}
          />
          <NavigationRow
            icon="sparkles-outline"
            label="Smart Alerts"
            description="Personalized notifications"
            onPress={() => router.push('/smart-alerts')}
          />
        </View>

        {/* SECURITY */}
        <SectionHeader icon="shield-outline" title="Security" />
        <View style={styles.section}>
          <NavigationRow
            icon="key-outline"
            label="Change Password"
            onPress={() => router.push('/settings/change-password')}
          />
          <NavigationRow
            icon="finger-print-outline"
            label="Two-Factor Authentication"
            value={settings?.security?.two_factor_enabled ? 'On' : 'Off'}
            onPress={() => router.push('/settings/2fa')}
          />
          <NavigationRow
            icon="lock-closed-outline"
            label="App Lock"
            value={settings?.security?.app_lock_enabled ? 'Enabled' : 'Disabled'}
            onPress={() => router.push('/settings/app-lock')}
          />
          <NavigationRow
            icon="phone-portrait-outline"
            label="Active Sessions"
            onPress={() => router.push('/settings/sessions')}
          />
        </View>

        {/* PRIVACY */}
        <SectionHeader icon="eye-outline" title="Privacy" />
        <View style={styles.section}>
          <ToggleRow
            label="Location Services"
            description="Allow app to access your location"
            value={privacy.location_services ?? true}
            onChange={(v) => updateSettings('privacy.location_services', v)}
          />
          <ToggleRow
            label="Show Online Status"
            value={privacy.show_online_status ?? true}
            onChange={(v) => updateSettings('privacy.show_online_status', v)}
          />
          <ToggleRow
            label="Show Last Seen"
            value={privacy.show_last_seen ?? true}
            onChange={(v) => updateSettings('privacy.show_last_seen', v)}
          />
          <ToggleRow
            label="Allow Profile Discovery"
            description="Let others find your profile in search"
            value={privacy.allow_profile_discovery ?? true}
            onChange={(v) => updateSettings('privacy.allow_profile_discovery', v)}
          />
          <ToggleRow
            label="Allow Direct Messages"
            value={privacy.allow_direct_messages ?? true}
            onChange={(v) => updateSettings('privacy.allow_direct_messages', v)}
          />
          <NavigationRow
            icon="ban-outline"
            label="Blocked Users"
            onPress={() => router.push('/settings/blocked-users')}
          />
        </View>

        {/* APP PREFERENCES */}
        <SectionHeader icon="color-palette-outline" title="App Preferences" />
        <View style={styles.section}>
          <NavigationRow
            icon="language-outline"
            label="Language"
            value={appPrefs.language === 'en' ? 'English' : appPrefs.language || 'English'}
            onPress={() => router.push('/settings/language')}
          />
          <NavigationRow
            icon="cash-outline"
            label="Currency"
            value={appPrefs.currency || 'EUR'}
            onPress={() => router.push('/settings/currency')}
          />
          <NavigationRow
            icon="moon-outline"
            label="Dark Mode"
            value={appPrefs.dark_mode === 'system' ? 'System' : appPrefs.dark_mode === 'dark' ? 'Dark' : 'Light'}
            onPress={() => router.push('/settings/appearance')}
          />
          <NavigationRow
            icon="cloud-download-outline"
            label="Data & Storage"
            onPress={() => router.push('/settings/storage')}
          />
        </View>

        {/* ACCOUNT */}
        <SectionHeader icon="person-outline" title="Account" />
        <View style={styles.section}>
          <NavigationRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            showChevron={false}
          />
          <NavigationRow
            icon="trash-outline"
            label="Delete Account"
            onPress={handleDeleteAccount}
            showChevron={false}
            danger
          />
        </View>

        {/* VERSION */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>avida v1.0.0</Text>
          <Text style={styles.buildText}>Build 2025.02.01</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: HORIZONTAL_PADDING,
    overflow: 'hidden',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loginMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  signInBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  signInBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  buildText: {
    fontSize: 12,
    color: COLORS.border,
    marginTop: 4,
  },
});

// ============ DESKTOP STYLES ============
const desktopStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Dark footer background
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    maxWidth: 1280,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  sidebar: {
    width: 260,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 24,
  },
  sidebarScrollView: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  navItems: {
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  navItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  navItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  sidebarFooter: {
    marginTop: 'auto',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentInner: {
    padding: 32,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  savingText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  settingsGroup: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Unauthenticated view styles
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  unauthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  unauthTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  unauthSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  signInBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  signInBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Location section styles
  locationSection: {
    padding: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  locationHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationPickerContainer: {
    marginBottom: 16,
  },
  clearLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignSelf: 'flex-start',
  },
  clearLocationText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
  },
});
