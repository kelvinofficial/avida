import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { BlockedUser } from '../../src/types/settings';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
};

const HORIZONTAL_PADDING = 16;

// ============ BLOCKED USER ITEM ============
const BlockedUserItem = ({ 
  user, 
  onUnblock 
}: { 
  user: BlockedUser; 
  onUnblock: () => void;
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
    <View style={itemStyles.container}>
      {user.picture ? (
        <Image source={{ uri: user.picture }} style={itemStyles.avatar} />
      ) : (
        <View style={itemStyles.avatarPlaceholder}>
          <Text style={itemStyles.avatarInitials}>{getInitials(user.name)}</Text>
        </View>
      )}
      
      <View style={itemStyles.info}>
        <Text style={itemStyles.name}>{user.name}</Text>
        {user.reason && (
          <Text style={itemStyles.reason} numberOfLines={1}>Reason: {user.reason}</Text>
        )}
      </View>
      
      <TouchableOpacity style={itemStyles.unblockBtn} onPress={onUnblock}>
        <Text style={itemStyles.unblockText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );
};

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: HORIZONTAL_PADDING,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  reason: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

// ============ EMPTY STATE ============
const EmptyState = () => (
  <View style={emptyStyles.container}>
    <View style={emptyStyles.iconContainer}>
      <Ionicons name="ban-outline" size={48} color={COLORS.textSecondary} />
    </View>
    <Text style={emptyStyles.title}>No Blocked Users</Text>
    <Text style={emptyStyles.subtitle}>
      Users you block won't be able to message you or view your profile
    </Text>
  </View>
);

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: HORIZONTAL_PADDING * 2,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

// ============ MAIN SCREEN ============
export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const response = await api.get('/blocked-users');
      setBlockedUsers(response.data.blocked_users || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.name}? They will be able to message you and view your profile again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unblock', 
          onPress: async () => {
            try {
              await api.delete(`/blocked-users/${user.blocked_user_id}`);
              setBlockedUsers(prev => prev.filter(u => u.id !== user.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to unblock user');
            }
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : blockedUsers.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BlockedUserItem user={item} onUnblock={() => handleUnblock(item)} />
          )}
          ListHeaderComponent={
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>
                Blocked users can't message you, view your profile, or see your listings.
              </Text>
            </View>
          }
        />
      )}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: HORIZONTAL_PADDING,
    padding: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
});
