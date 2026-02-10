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
  verification_tier: string;
  is_active: boolean;
  total_listings: number;
  total_views: number;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

// ============ PROFILE CARD ============
const ProfileCard = ({ 
  profile, 
  onVerify, 
  onReject, 
  onUpgradePremium, 
  onRevokePremium,
  onToggleActive,
  onView 
}: { 
  profile: BusinessProfile;
  onVerify: () => void;
  onReject: () => void;
  onUpgradePremium: () => void;
  onRevokePremium: () => void;
  onToggleActive: () => void;
  onView: () => void;
}) => (
  <View style={[cardStyles.container, !profile.is_active && cardStyles.inactive]}>
    <TouchableOpacity style={cardStyles.header} onPress={onView}>
      {/* Logo */}
      {profile.logo_url ? (
        <Image source={{ uri: profile.logo_url }} style={cardStyles.logo} />
      ) : (
        <View style={cardStyles.logoPlaceholder}>
          <Ionicons name="storefront" size={24} color={COLORS.textSecondary} />
        </View>
      )}
      
      {/* Info */}
      <View style={cardStyles.info}>
        <View style={cardStyles.nameRow}>
          <Text style={cardStyles.name} numberOfLines={1}>{profile.business_name}</Text>
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
        
        <Text style={cardStyles.identifier}>@{profile.identifier}</Text>
        
        {profile.city && (
          <Text style={cardStyles.location}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
            {' '}{profile.city}{profile.country ? `, ${profile.country}` : ''}
          </Text>
        )}
        
        <View style={cardStyles.statsRow}>
          <Text style={cardStyles.stat}>{profile.total_listings} listings</Text>
          <Text style={cardStyles.stat}>•</Text>
          <Text style={cardStyles.stat}>{profile.total_views} views</Text>
        </View>
        
        {profile.user && (
          <Text style={cardStyles.userInfo}>Owner: {profile.user.name} ({profile.user.email})</Text>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
    
    {/* Actions */}
    <View style={cardStyles.actions}>
      {/* Verification Actions */}
      {profile.verification_status === 'pending' && (
        <>
          <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.approveBtn]} onPress={onVerify}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={cardStyles.actionBtnTextLight}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.rejectBtn]} onPress={onReject}>
            <Ionicons name="close" size={16} color="#fff" />
            <Text style={cardStyles.actionBtnTextLight}>Reject</Text>
          </TouchableOpacity>
        </>
      )}
      
      {/* Premium Actions */}
      {profile.is_verified && !profile.is_premium && (
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.upgradeBtn]} onPress={onUpgradePremium}>
          <Ionicons name="diamond-outline" size={16} color={COLORS.premium} />
          <Text style={[cardStyles.actionBtnText, { color: COLORS.premium }]}>Upgrade Premium</Text>
        </TouchableOpacity>
      )}
      
      {profile.is_premium && (
        <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.revokeBtn]} onPress={onRevokePremium}>
          <Ionicons name="arrow-down-outline" size={16} color={COLORS.error} />
          <Text style={[cardStyles.actionBtnText, { color: COLORS.error }]}>Revoke Premium</Text>
        </TouchableOpacity>
      )}
      
      {/* Toggle Active */}
      <TouchableOpacity style={[cardStyles.actionBtn, cardStyles.toggleBtn]} onPress={onToggleActive}>
        <Ionicons name={profile.is_active ? "eye-off-outline" : "eye-outline"} size={16} color={COLORS.textSecondary} />
        <Text style={cardStyles.actionBtnText}>{profile.is_active ? 'Deactivate' : 'Activate'}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const cardStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  inactive: { opacity: 0.6, borderColor: COLORS.error },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  logo: { width: 56, height: 56, borderRadius: 12, backgroundColor: COLORS.border },
  logoPlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  verifiedBadge: { backgroundColor: COLORS.verified },
  premiumBadge: { backgroundColor: COLORS.premium },
  pendingBadge: { backgroundColor: COLORS.pending },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  identifier: { fontSize: 13, color: COLORS.primary, marginBottom: 4 },
  location: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stat: { fontSize: 12, color: COLORS.textSecondary },
  userInfo: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, paddingTop: 0, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 0 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  approveBtn: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  upgradeBtn: { borderColor: COLORS.premium },
  revokeBtn: { borderColor: COLORS.error },
  toggleBtn: { borderColor: COLORS.border },
  actionBtnText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  actionBtnTextLight: { fontSize: 13, fontWeight: '500', color: '#fff' },
});

// ============ FILTER TABS ============
const FilterTabs = ({ activeFilter, onFilterChange }: { activeFilter: string; onFilterChange: (filter: string) => void }) => {
  const filters = [
    { id: 'all', label: 'All', icon: 'list' },
    { id: 'pending', label: 'Pending', icon: 'time' },
    { id: 'verified', label: 'Verified', icon: 'checkmark-circle' },
    { id: 'premium', label: 'Premium', icon: 'diamond' },
  ];
  
  return (
    <View style={filterStyles.container}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[filterStyles.tab, activeFilter === filter.id && filterStyles.tabActive]}
          onPress={() => onFilterChange(filter.id)}
        >
          <Ionicons name={filter.icon as any} size={16} color={activeFilter === filter.id ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[filterStyles.tabText, activeFilter === filter.id && filterStyles.tabTextActive]}>{filter.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const filterStyles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: COLORS.surface, padding: 8, borderRadius: 12, marginBottom: 16, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
});

// ============ MAIN SCREEN ============
export default function AdminBusinessProfilesScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, verified: 0, premium: 0, pending: 0 });

  const fetchProfiles = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        if (filter === 'pending') params.append('verification_status', 'pending');
        else if (filter === 'verified') params.append('is_verified', 'true');
        else if (filter === 'premium') params.append('is_premium', 'true');
      }
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await api.get(`/admin/business-profiles/?${params.toString()}`);
      setProfiles(response.data.profiles || []);
      
      // Fetch stats
      const statsResponse = await api.get('/admin/business-profiles/stats/overview');
      setStats(statsResponse.data);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to access this page');
        router.back();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, searchQuery]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  const handleVerify = async (profileId: string) => {
    Alert.alert('Approve Profile', 'Grant Verified Business status to this profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await api.post(`/admin/business-profiles/${profileId}/verify`, { action: 'approve' });
            fetchProfiles();
            Alert.alert('Success', 'Profile verified successfully');
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to verify profile');
          }
        }
      }
    ]);
  };

  const handleReject = async (profileId: string) => {
    Alert.prompt(
      'Reject Verification',
      'Enter reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              await api.post(`/admin/business-profiles/${profileId}/verify`, { action: 'reject', reason: reason || 'Did not meet requirements' });
              fetchProfiles();
              Alert.alert('Rejected', 'Verification request rejected');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to reject');
            }
          }
        }
      ],
      'plain-text',
      ''
    );
  };

  const handleUpgradePremium = async (profileId: string) => {
    Alert.alert('Upgrade to Premium', 'Grant Premium Verified Business status?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Upgrade',
        onPress: async () => {
          try {
            await api.post(`/admin/business-profiles/${profileId}/upgrade-premium`, { duration_days: 30 });
            fetchProfiles();
            Alert.alert('Success', 'Profile upgraded to Premium');
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to upgrade');
          }
        }
      }
    ]);
  };

  const handleRevokePremium = async (profileId: string) => {
    Alert.alert('Revoke Premium', 'Downgrade this profile from Premium to regular Verified?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/admin/business-profiles/${profileId}/revoke-premium`);
            fetchProfiles();
            Alert.alert('Revoked', 'Premium status removed');
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to revoke');
          }
        }
      }
    ]);
  };

  const handleToggleActive = async (profile: BusinessProfile) => {
    const action = profile.is_active ? 'deactivate' : 'activate';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Profile`,
      `Are you sure you want to ${action} this business profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: profile.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.post(`/admin/business-profiles/${profile.id}/toggle-active`);
              fetchProfiles();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || `Failed to ${action}`);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Profiles</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router)}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Profiles</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.pending }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.verified }]}>{stats.verified}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.premium }]}>{stats.premium}</Text>
            <Text style={styles.statLabel}>Premium</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or identifier..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchProfiles}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchProfiles(); }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <FilterTabs activeFilter={filter} onFilterChange={setFilter} />

        {/* Profiles List */}
        {profiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No business profiles found</Text>
          </View>
        ) : (
          profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onVerify={() => handleVerify(profile.id)}
              onReject={() => handleReject(profile.id)}
              onUpgradePremium={() => handleUpgradePremium(profile.id)}
              onRevokePremium={() => handleRevokePremium(profile.id)}
              onToggleActive={() => handleToggleActive(profile)}
              onView={() => router.push(`/business/${profile.identifier}`)}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 16 },
  
  // Stats
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  
  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 12 },
});
