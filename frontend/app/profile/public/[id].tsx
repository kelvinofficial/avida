import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../../src/utils/api';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#388E3C',
  error: '#D32F2F',
};

// Listing Card
const ListingCard = ({ item, onPress }: { item: any; onPress: () => void }) => (
  <TouchableOpacity style={styles.listingCard} onPress={onPress}>
    <Image
      source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
      style={styles.listingImage}
    />
    <View style={styles.listingInfo}>
      <Text style={styles.listingPrice}>€{item.price?.toLocaleString()}</Text>
      <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
    </View>
  </TouchableOpacity>
);

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, listingsRes] = await Promise.all([
        api.get(`/profile/public/${id}`),
        api.get('/listings', { params: { user_id: id, status: 'active', limit: 20 } }),
      ]);
      
      setProfile(profileRes.data);
      setListings(listingsRes.data.listings || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${profile?.name}'s profile on avida!`,
        url: `https://avida.app/profile/${id}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleMessage = () => {
    // Navigate to chat or start conversation
    Alert.alert('Message', 'Start a conversation with this seller');
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile?.name}</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {profile?.picture ? (
            <Image source={{ uri: profile.picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials(profile?.name)}</Text>
            </View>
          )}
          
          <Text style={styles.profileName}>{profile?.name}</Text>
          
          {profile?.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}

          {profile?.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          )}

          {profile?.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.stats?.active_listings || 0}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.stats?.sold_listings || 0}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
              </View>
              <Text style={styles.statLabel}>{profile?.total_ratings || 0} reviews</Text>
            </View>
          </View>

          <Text style={styles.memberSince}>
            Member since {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>

          <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.messageBtnText}>Message Seller</Text>
          </TouchableOpacity>
        </View>

        {/* Listings Section */}
        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>
            Active Listings ({listings.length})
          </Text>
          
          {listings.length === 0 ? (
            <View style={styles.emptyListings}>
              <Ionicons name="cube-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No active listings</Text>
            </View>
          ) : (
            <View style={styles.listingsGrid}>
              {listings.map(item => (
                <ListingCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/listing/${item.id}`)}
                />
              ))}
            </View>
          )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: { fontSize: 15, color: COLORS.error, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  profileHeader: {
    backgroundColor: COLORS.surface,
    padding: 24,
    alignItems: 'center',
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
  avatarInitials: { fontSize: 36, fontWeight: '700', color: COLORS.primary },
  profileName: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: { fontSize: 13, color: COLORS.success, fontWeight: '500' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: { fontSize: 14, color: COLORS.textSecondary },
  bio: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberSince: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 20,
  },
  messageBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  listingsSection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  emptyListings: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  listingCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.border,
  },
  listingInfo: { padding: 10 },
  listingPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  listingTitle: { fontSize: 13, color: COLORS.text, marginTop: 4 },
});
