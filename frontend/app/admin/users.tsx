import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
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
  verified: '#1976D2',
  premium: '#FF8F00',
  pending: '#FF9800',
  success: '#4CAF50',
};

interface User {
  user_id: string;
  name: string;
  email: string;
  is_verified: boolean;
  is_premium?: boolean;
  is_seller?: boolean;
  created_at: string;
  avatar_url?: string;
  phone?: string;
  status?: string;
}

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  identifier: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  is_premium: boolean;
  verification_status: string;
  is_active: boolean;
  total_listings: number;
  created_at: string;
  user?: { name: string; email: string; };
}

interface Stats {
  total_users: number;
  verified_sellers: number;
  verified_businesses: number;
  premium_businesses: number;
  pending_verifications: number;
}

type TabType = 'all_users' | 'verified_sellers' | 'business_profiles' | 'premium_profiles';

// ============ USER CARD ============
const UserCard = ({ user, onVerify, onBan }: { 
  user: User; 
  onVerify: () => void;
  onBan: () => void;
}) => (
  <View style={cardStyles.container}>
    <View style={cardStyles.row}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={cardStyles.avatar} />
      ) : (
        <View style={[cardStyles.avatar, cardStyles.avatarPlaceholder]}>
          <Ionicons name="person" size={20} color={COLORS.textSecondary} />
        </View>
      )}
      <View style={cardStyles.info}>
        <View style={cardStyles.nameRow}>
          <Text style={cardStyles.name}>{user.name || 'Unknown'}</Text>
          {user.is_verified && (
            <View style={[cardStyles.badge, cardStyles.verifiedBadge]}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={cardStyles.badgeText}>Verified</Text>
            </View>
          )}
          {user.is_premium && (
            <View style={[cardStyles.badge, cardStyles.premiumBadge]}>
              <Ionicons name="diamond" size={12} color="#fff" />
              <Text style={cardStyles.badgeText}>Premium</Text>
            </View>
          )}
        </View>
        <Text style={cardStyles.email}>{user.email}</Text>
        <Text style={cardStyles.date}>Joined: {new Date(user.created_at).toLocaleDateString()}</Text>
      </View>
    </View>
    <View style={cardStyles.actions}>
      {!user.is_verified && (
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.verifyBtn]} onPress={onVerify}>
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={cardStyles.actionBtnText}>Verify</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.banBtn]} onPress={onBan}>
        <Ionicons name="ban" size={16} color="#fff" />
        <Text style={cardStyles.actionBtnText}>{user.status === 'banned' ? 'Unban' : 'Ban'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ============ BUSINESS PROFILE CARD ============
const BusinessProfileCard = ({ profile, onVerify, onUpgradePremium, onRevokePremium, onView }: { 
  profile: BusinessProfile;
  onVerify: () => void;
  onUpgradePremium: () => void;
  onRevokePremium: () => void;
  onView: () => void;
}) => (
  <View style={cardStyles.container}>
    <TouchableOpacity style={cardStyles.row} onPress={onView}>
      {profile.logo_url ? (
        <Image source={{ uri: profile.logo_url }} style={cardStyles.logo} />
      ) : (
        <View style={[cardStyles.logo, cardStyles.logoPlaceholder]}>
          <Ionicons name="storefront" size={24} color={COLORS.textSecondary} />
        </View>
      )}
      <View style={cardStyles.info}>
        <View style={cardStyles.nameRow}>
          <Text style={cardStyles.name}>{profile.business_name}</Text>
          {profile.is_premium && (
            <View style={[cardStyles.badge, cardStyles.premiumBadge]}>
              <Ionicons name="diamond" size={12} color="#fff" />
              <Text style={cardStyles.badgeText}>Premium</Text>
            </View>
          )}
          {profile.is_verified && !profile.is_premium && (
            <View style={[cardStyles.badge, cardStyles.verifiedBadge]}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={cardStyles.badgeText}>Verified</Text>
            </View>
          )}
          {profile.verification_status === 'pending' && (
            <View style={[cardStyles.badge, cardStyles.pendingBadge]}>
              <Ionicons name="time" size={12} color="#fff" />
              <Text style={cardStyles.badgeText}>Pending</Text>
            </View>
          )}
        </View>
        <Text style={cardStyles.email}>@{profile.identifier}</Text>
        {profile.city && <Text style={cardStyles.location}>{profile.city}, {profile.country}</Text>}
        <Text style={cardStyles.stats}>{profile.total_listings} listings</Text>
      </View>
    </TouchableOpacity>
    <View style={cardStyles.actions}>
      {profile.verification_status === 'pending' && (
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.verifyBtn]} onPress={onVerify}>
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={cardStyles.actionBtnText}>Approve</Text>
        </TouchableOpacity>
      )}
      {profile.is_verified && !profile.is_premium && (
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.premiumBtn]} onPress={onUpgradePremium}>
          <Ionicons name="diamond" size={16} color="#fff" />
          <Text style={cardStyles.actionBtnText}>Upgrade Premium</Text>
        </TouchableOpacity>
      )}
      {profile.is_premium && (
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.revokeBtn]} onPress={onRevokePremium}>
          <Ionicons name="close" size={16} color="#fff" />
          <Text style={cardStyles.actionBtnText}>Revoke Premium</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export default function UsersManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('all_users');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [stats, setStats] = useState<Stats>({
    total_users: 0,
    verified_sellers: 0,
    verified_businesses: 0,
    premium_businesses: 0,
    pending_verifications: 0,
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);

  const isAdmin = user?.email === 'admin@marketplace.com' || user?.email === 'admin@example.com';

  const fetchData = useCallback(async () => {
    try {
      // Fetch stats
      const [usersRes, businessRes] = await Promise.all([
        api.get('/admin/verification/users').catch(() => ({ data: [] })),
        api.get('/admin/business-profiles/').catch(() => ({ data: { profiles: [] } })),
      ]);
      
      const allUsers = usersRes.data || [];
      const allProfiles = businessRes.data.profiles || businessRes.data || [];
      
      setUsers(allUsers);
      setBusinessProfiles(allProfiles);
      
      // Calculate stats
      setStats({
        total_users: allUsers.length,
        verified_sellers: allUsers.filter((u: User) => u.is_verified).length,
        verified_businesses: allProfiles.filter((p: BusinessProfile) => p.is_verified).length,
        premium_businesses: allProfiles.filter((p: BusinessProfile) => p.is_premium).length,
        pending_verifications: allProfiles.filter((p: BusinessProfile) => p.verification_status === 'pending').length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const handleVerifyUser = async (userId: string) => {
    try {
      await api.post(`/admin/verification/users/${userId}/verify`);
      Alert.alert('Success', 'User verified successfully');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to verify user');
    }
  };

  const handleBanUser = async (userId: string, currentStatus: string) => {
    try {
      const action = currentStatus === 'banned' ? 'activate' : 'deactivate';
      await api.post(`/admin/verification/users/${userId}/${action}`);
      Alert.alert('Success', `User ${action}d successfully`);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleVerifyBusiness = async (profileId: string) => {
    try {
      await api.post(`/admin/business-profiles/${profileId}/verify`);
      Alert.alert('Success', 'Business profile verified');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to verify');
    }
  };

  const handleUpgradePremium = async (profileId: string) => {
    try {
      await api.post(`/admin/business-profiles/${profileId}/upgrade-premium`);
      Alert.alert('Success', 'Business upgraded to Premium');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to upgrade');
    }
  };

  const handleRevokePremium = async (profileId: string) => {
    Alert.alert(
      'Revoke Premium',
      'Are you sure you want to revoke premium status?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Revoke', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/admin/business-profiles/${profileId}/revoke-premium`);
              Alert.alert('Success', 'Premium status revoked');
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to revoke');
            }
          }
        }
      ]
    );
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verifiedSellers = users.filter(u => u.is_verified);
  const verifiedBusinesses = businessProfiles.filter(p => p.is_verified || p.verification_status === 'verified');
  const premiumBusinesses = businessProfiles.filter(p => p.is_premium);

  const tabs: { key: TabType; label: string; count: number; icon: string }[] = [
    { key: 'all_users', label: 'All Users', count: stats.total_users, icon: 'people' },
    { key: 'verified_sellers', label: 'Verified Sellers', count: stats.verified_sellers, icon: 'checkmark-circle' },
    { key: 'business_profiles', label: 'Verified Business', count: stats.verified_businesses, icon: 'storefront' },
    { key: 'premium_profiles', label: 'Premium Business', count: stats.premium_businesses, icon: 'diamond' },
  ];

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Users & Verification</Text>
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
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Users & Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Overview */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
          <Text style={styles.statValue}>{stats.total_users}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.statValue}>{stats.verified_businesses}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.statValue}>{stats.premium_businesses}</Text>
          <Text style={styles.statLabel}>Premium</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
          <Text style={styles.statValue}>{stats.pending_verifications}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabsContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={16} 
                color={activeTab === tab.key ? COLORS.primary : COLORS.textSecondary} 
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'all_users' && (
          <>
            <Text style={styles.sectionTitle}>All Users ({filteredUsers.length})</Text>
            {filteredUsers.map(user => (
              <UserCard
                key={user.user_id}
                user={user}
                onVerify={() => handleVerifyUser(user.user_id)}
                onBan={() => handleBanUser(user.user_id, user.status || '')}
              />
            ))}
          </>
        )}

        {activeTab === 'verified_sellers' && (
          <>
            <Text style={styles.sectionTitle}>Verified Sellers ({verifiedSellers.length})</Text>
            {verifiedSellers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No verified sellers yet</Text>
              </View>
            ) : (
              verifiedSellers.map(user => (
                <UserCard
                  key={user.user_id}
                  user={user}
                  onVerify={() => {}}
                  onBan={() => handleBanUser(user.user_id, user.status || '')}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'business_profiles' && (
          <>
            <Text style={styles.sectionTitle}>Verified Business Profiles ({verifiedBusinesses.length})</Text>
            {verifiedBusinesses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No verified business profiles</Text>
              </View>
            ) : (
              verifiedBusinesses.map(profile => (
                <BusinessProfileCard
                  key={profile.id}
                  profile={profile}
                  onVerify={() => handleVerifyBusiness(profile.id)}
                  onUpgradePremium={() => handleUpgradePremium(profile.id)}
                  onRevokePremium={() => handleRevokePremium(profile.id)}
                  onView={() => router.push(`/business/${profile.identifier}`)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'premium_profiles' && (
          <>
            <Text style={styles.sectionTitle}>Premium Business Profiles ({premiumBusinesses.length})</Text>
            {premiumBusinesses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="diamond-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No premium business profiles</Text>
              </View>
            ) : (
              premiumBusinesses.map(profile => (
                <BusinessProfileCard
                  key={profile.id}
                  profile={profile}
                  onVerify={() => {}}
                  onUpgradePremium={() => {}}
                  onRevokePremium={() => handleRevokePremium(profile.id)}
                  onView={() => router.push(`/business/${profile.identifier}`)}
                />
              ))
            )}
          </>
        )}

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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  
  tabsScroll: { maxHeight: 50, backgroundColor: COLORS.surface },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background },
  activeTab: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  activeTabText: { color: COLORS.primary, fontWeight: '600' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 15, color: COLORS.text },
  
  content: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12, marginTop: 8 },
  
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12 },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 56, height: 56, borderRadius: 12, marginRight: 12 },
  logoPlaceholder: { backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  email: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  location: { fontSize: 12, color: COLORS.textSecondary },
  date: { fontSize: 11, color: COLORS.textSecondary },
  stats: { fontSize: 12, color: COLORS.primary, marginTop: 4 },
  
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  verifiedBadge: { backgroundColor: COLORS.verified },
  premiumBadge: { backgroundColor: COLORS.premium },
  pendingBadge: { backgroundColor: COLORS.pending },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  verifyBtn: { backgroundColor: COLORS.success },
  banBtn: { backgroundColor: COLORS.error },
  premiumBtn: { backgroundColor: COLORS.premium },
  revokeBtn: { backgroundColor: COLORS.textSecondary },
});
