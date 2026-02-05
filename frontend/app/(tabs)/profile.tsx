import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/utils/api';
import { UserProfile, UserStats } from '../../src/types/settings';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  secondary: '#FF6F00',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
  info: '#1976D2',
};

const HORIZONTAL_PADDING = 16;

// ============ PROFILE HEADER ============
const ProfileHeader = ({ 
  profile, 
  onEditPress 
}: { 
  profile: UserProfile | null; 
  onEditPress: () => void;
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.avatarSection}>
        {profile?.picture ? (
          <Image source={{ uri: profile.picture }} style={headerStyles.avatar} />
        ) : (
          <View style={headerStyles.avatarPlaceholder}>
            <Text style={headerStyles.avatarInitials}>
              {profile?.name ? getInitials(profile.name) : 'U'}
            </Text>
          </View>
        )}
        
        <TouchableOpacity style={headerStyles.editAvatarBtn} onPress={onEditPress}>
          <Ionicons name="camera" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={headerStyles.infoSection}>
        <View style={headerStyles.nameRow}>
          <Text style={headerStyles.name}>{profile?.name || 'User'}</Text>
          {profile?.verified && (
            <View style={headerStyles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
            </View>
          )}
        </View>
        
        <View style={headerStyles.emailRow}>
          <Ionicons name="mail-outline" size={14} color={COLORS.textSecondary} />
          <Text style={headerStyles.email}>{profile?.email}</Text>
          {profile?.email_verified && (
            <View style={headerStyles.verifiedSmallBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>

        {profile?.phone && (
          <View style={headerStyles.emailRow}>
            <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
            <Text style={headerStyles.email}>{profile.phone}</Text>
            {profile?.phone_verified && (
              <View style={headerStyles.verifiedSmallBadge}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </View>
        )}

        {profile?.location && (
          <View style={headerStyles.emailRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={headerStyles.email}>{profile.location}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={headerStyles.editButton} onPress={onEditPress}>
        <Ionicons name="pencil" size={16} color={COLORS.primary} />
        <Text style={headerStyles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: HORIZONTAL_PADDING,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  infoSection: {
    alignItems: 'center',
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {},
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  verifiedSmallBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

// ============ STATS ROW ============
const StatsRow = ({ stats }: { stats: UserStats | null }) => {
  const statItems = [
    { label: 'Listings', value: stats?.active_listings || 0, icon: 'list' },
    { label: 'Sold', value: stats?.sold_listings || 0, icon: 'checkmark-circle' },
    { label: 'Favorites', value: stats?.total_favorites || 0, icon: 'heart' },
  ];

  return (
    <View style={statsStyles.container}>
      {statItems.map((item, index) => (
        <View key={item.label} style={statsStyles.statItem}>
          <View style={statsStyles.iconContainer}>
            <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
          </View>
          <Text style={statsStyles.value}>{item.value}</Text>
          <Text style={statsStyles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

const statsStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

// ============ ACTIVITY SECTION ============
const ActivitySection = ({ onItemPress }: { onItemPress: (route: string) => void }) => {
  const activityItems = [
    { id: 'listings', label: 'My Listings', icon: 'list-outline', route: '/profile/my-listings', badge: null },
    { id: 'purchases', label: 'Purchases', icon: 'bag-outline', route: '/profile/purchases', badge: null },
    { id: 'sales', label: 'Sales', icon: 'cash-outline', route: '/profile/sales', badge: null },
    { id: 'saved', label: 'Saved Items', icon: 'heart-outline', route: '/profile/saved', badge: null },
    { id: 'viewed', label: 'Recently Viewed', icon: 'eye-outline', route: '/profile/recently-viewed', badge: null },
  ];

  return (
    <View style={activityStyles.container}>
      <View style={activityStyles.header}>
        <Ionicons name="analytics-outline" size={20} color={COLORS.text} />
        <Text style={activityStyles.title}>My Activity</Text>
      </View>
      
      {activityItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={activityStyles.item}
          onPress={() => onItemPress(item.route)}
        >
          <View style={activityStyles.itemLeft}>
            <View style={activityStyles.iconContainer}>
              <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
            </View>
            <Text style={activityStyles.itemLabel}>{item.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const activityStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
});

// ============ TRUST SECTION ============
const TrustSection = ({ profile, onVerifyPress }: { profile: UserProfile | null; onVerifyPress: (type: string) => void }) => {
  const trustItems = [
    { id: 'email', label: 'Email Verified', verified: profile?.email_verified || profile?.verified, icon: 'mail', route: '/profile/verify-email' },
    { id: 'phone', label: 'Phone Verified', verified: profile?.phone_verified, icon: 'call', route: '/profile/verify-phone' },
    { id: 'id', label: 'ID Verified', verified: profile?.id_verified, icon: 'shield-checkmark', route: '/profile/verify-id', status: profile?.id_verification_status },
  ];

  const getStatusText = (item: typeof trustItems[0]) => {
    if (item.verified) return 'Verified';
    if (item.id === 'id' && item.status === 'pending') return 'Under Review';
    if (item.id === 'id' && item.status === 'rejected') return 'Try Again';
    return 'Not Verified';
  };

  return (
    <View style={trustStyles.container}>
      <View style={trustStyles.header}>
        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.text} />
        <Text style={trustStyles.title}>Trust & Identity</Text>
      </View>
      
      <View style={trustStyles.items}>
        {trustItems.map((item) => (
          <TouchableOpacity 
            key={item.label} 
            style={trustStyles.item}
            onPress={() => !item.verified && onVerifyPress(item.route)}
            disabled={item.verified || item.status === 'pending'}
          >
            <View style={[trustStyles.iconContainer, item.verified && trustStyles.iconContainerVerified]}>
              <Ionicons name={item.icon as any} size={18} color={item.verified ? COLORS.success : COLORS.textSecondary} />
            </View>
            <View style={trustStyles.itemContent}>
              <Text style={[trustStyles.itemLabel, item.verified && trustStyles.itemLabelVerified]}>
                {item.label}
              </Text>
              <Text style={[trustStyles.statusText, item.verified && trustStyles.statusTextVerified]}>
                {getStatusText(item)}
              </Text>
            </View>
            {item.verified ? (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            ) : item.status === 'pending' ? (
              <Ionicons name="hourglass-outline" size={20} color={COLORS.warning} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={trustStyles.publicProfileBtn}
        onPress={() => onVerifyPress(`/profile/public/${profile?.user_id}`)}
      >
        <Ionicons name="person-outline" size={18} color={COLORS.primary} />
        <Text style={trustStyles.publicProfileText}>View Public Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const trustStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  items: {
    gap: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerVerified: {
    backgroundColor: '#E8F5E9',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  itemLabelVerified: {
    color: COLORS.text,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusTextVerified: {
    color: COLORS.success,
  },
  publicProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  publicProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

// ============ QUICK ACTIONS ============
const QuickActions = ({ router, onLogout }: { router: any; onLogout: () => void }) => {
  return (
    <View style={quickActionsStyles.container}>
      <TouchableOpacity style={quickActionsStyles.item} onPress={() => router.push('/settings')}>
        <View style={quickActionsStyles.iconContainer}>
          <Ionicons name="settings-outline" size={22} color={COLORS.text} />
        </View>
        <Text style={quickActionsStyles.label}>Settings</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={quickActionsStyles.item} onPress={() => router.push('/notifications')}>
        <View style={quickActionsStyles.iconContainer}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
        </View>
        <Text style={quickActionsStyles.label}>Notifications</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={quickActionsStyles.item} onPress={() => router.push('/help')}>
        <View style={quickActionsStyles.iconContainer}>
          <Ionicons name="help-circle-outline" size={22} color={COLORS.text} />
        </View>
        <Text style={quickActionsStyles.label}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={[quickActionsStyles.item, quickActionsStyles.logoutItem]} onPress={onLogout}>
        <View style={[quickActionsStyles.iconContainer, quickActionsStyles.logoutIcon]}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
        </View>
        <Text style={[quickActionsStyles.label, quickActionsStyles.logoutLabel]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const quickActionsStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: 16,
    padding: 8,
    marginBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
  logoutIcon: {
    backgroundColor: '#FFEBEE',
  },
  logoutLabel: {
    color: COLORS.error,
  },
});

// ============ MAIN SCREEN ============
export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleActivityPress = (route: string) => {
    router.push(route as any);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loginPrompt}>
          <View style={styles.loginIconContainer}>
            <Ionicons name="person-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.loginTitle}>Welcome to avida</Text>
          <Text style={styles.loginSubtitle}>
            Sign in to manage your listings, messages, and more
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => router.push('/register')}
          >
            <Text style={styles.registerButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <ProfileHeader profile={profile} onEditPress={handleEditProfile} />
        
        <StatsRow stats={profile?.stats || null} />
        
        <ActivitySection onItemPress={handleActivityPress} />
        
        <TrustSection profile={profile} />
        
        <QuickActions router={router} onLogout={handleLogout} />

        <Text style={styles.version}>avida v1.0.0</Text>
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
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: HORIZONTAL_PADDING * 2,
  },
  loginIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  registerButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
});
