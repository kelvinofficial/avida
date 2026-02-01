import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { ActiveSession } from '../../src/types/settings';
import { formatDistanceToNow } from 'date-fns';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#388E3C',
};

const HORIZONTAL_PADDING = 16;

// Get icon for device type
const getDeviceIcon = (type: string) => {
  switch (type) {
    case 'mobile': return 'phone-portrait';
    case 'tablet': return 'tablet-portrait';
    case 'desktop': return 'desktop';
    case 'web': return 'globe';
    default: return 'hardware-chip';
  }
};

// ============ SESSION ITEM ============
const SessionItem = ({ 
  session, 
  onRevoke 
}: { 
  session: ActiveSession; 
  onRevoke: () => void;
}) => {
  const lastActive = formatDistanceToNow(new Date(session.last_active), { addSuffix: true });

  return (
    <View style={[itemStyles.container, session.is_current && itemStyles.currentSession]}>
      <View style={[itemStyles.iconContainer, session.is_current && itemStyles.currentIcon]}>
        <Ionicons 
          name={getDeviceIcon(session.device_type) as any} 
          size={24} 
          color={session.is_current ? COLORS.primary : COLORS.text} 
        />
      </View>
      
      <View style={itemStyles.info}>
        <View style={itemStyles.headerRow}>
          <Text style={itemStyles.deviceName}>{session.device_name}</Text>
          {session.is_current && (
            <View style={itemStyles.currentBadge}>
              <Text style={itemStyles.currentBadgeText}>Current</Text>
            </View>
          )}
        </View>
        
        {session.location && (
          <View style={itemStyles.detailRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={itemStyles.detailText}>{session.location}</Text>
          </View>
        )}
        
        <View style={itemStyles.detailRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={itemStyles.detailText}>Active {lastActive}</Text>
        </View>
      </View>
      
      {!session.is_current && (
        <TouchableOpacity style={itemStyles.revokeBtn} onPress={onRevoke}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      )}
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
  currentSession: {
    backgroundColor: COLORS.primaryLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentIcon: {
    backgroundColor: COLORS.surface,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  currentBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  revokeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ============ MAIN SCREEN ============
export default function ActiveSessionsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await api.get('/sessions');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = (session: ActiveSession) => {
    Alert.alert(
      'End Session',
      `Are you sure you want to sign out of "${session.device_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/sessions/${session.id}`);
              setSessions(prev => prev.filter(s => s.id !== session.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to end session');
            }
          }
        },
      ]
    );
  };

  const handleRevokeAll = () => {
    Alert.alert(
      'Sign Out All Devices',
      'This will sign you out from all devices except this one. You will need to sign in again on those devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/sessions/revoke-all');
              setSessions(prev => prev.filter(s => s.is_current));
              Alert.alert('Success', 'Signed out from all other devices');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out from all devices');
            }
          }
        },
      ]
    );
  };

  const otherSessions = sessions.filter(s => !s.is_current);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Sessions</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SessionItem session={item} onRevoke={() => handleRevokeSession(item)} />
          )}
          ListHeaderComponent={
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                These are the devices currently signed into your account. You can sign out of any session you don't recognize.
              </Text>
            </View>
          }
          ListFooterComponent={
            otherSessions.length > 0 ? (
              <TouchableOpacity style={styles.revokeAllBtn} onPress={handleRevokeAll}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                <Text style={styles.revokeAllText}>Sign Out All Other Devices</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="phone-portrait-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No active sessions found</Text>
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
    alignItems: 'flex-start',
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
  revokeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: HORIZONTAL_PADDING,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
  },
  revokeAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.error,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
