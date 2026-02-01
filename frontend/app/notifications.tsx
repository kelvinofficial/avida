import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import api from '../src/utils/api';
import { Notification, NotificationType } from '../src/types/settings';
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
  warning: '#F57C00',
  info: '#1976D2',
  unread: '#E3F2FD',
};

const HORIZONTAL_PADDING = 16;

// Get icon and color for notification type
const getNotificationMeta = (type: NotificationType) => {
  const meta: Record<string, { icon: string; color: string; bgColor: string }> = {
    chat_message: { icon: 'chatbubble', color: COLORS.info, bgColor: '#E3F2FD' },
    offer_received: { icon: 'pricetag', color: COLORS.success, bgColor: '#E8F5E9' },
    offer_accepted: { icon: 'checkmark-circle', color: COLORS.success, bgColor: '#E8F5E9' },
    offer_rejected: { icon: 'close-circle', color: COLORS.error, bgColor: '#FFEBEE' },
    price_drop: { icon: 'trending-down', color: COLORS.warning, bgColor: '#FFF3E0' },
    saved_search_match: { icon: 'search', color: COLORS.primary, bgColor: COLORS.primaryLight },
    better_deal: { icon: 'flash', color: COLORS.warning, bgColor: '#FFF3E0' },
    seller_response: { icon: 'person', color: COLORS.info, bgColor: '#E3F2FD' },
    security_alert: { icon: 'shield', color: COLORS.error, bgColor: '#FFEBEE' },
    system_announcement: { icon: 'megaphone', color: COLORS.primary, bgColor: COLORS.primaryLight },
    listing_sold: { icon: 'checkmark-done', color: COLORS.success, bgColor: '#E8F5E9' },
    listing_expired: { icon: 'time', color: COLORS.textSecondary, bgColor: '#F5F5F5' },
    new_follower: { icon: 'person-add', color: COLORS.info, bgColor: '#E3F2FD' },
  };
  return meta[type] || { icon: 'notifications', color: COLORS.textSecondary, bgColor: '#F5F5F5' };
};

// ============ NOTIFICATION ITEM ============
const NotificationItem = ({ 
  notification, 
  onPress, 
  onMarkRead,
  onDelete,
}: { 
  notification: Notification; 
  onPress: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) => {
  const meta = getNotificationMeta(notification.type as NotificationType);
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <TouchableOpacity 
      style={[itemStyles.container, !notification.read && itemStyles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[itemStyles.iconContainer, { backgroundColor: meta.bgColor }]}>
        <Ionicons name={meta.icon as any} size={22} color={meta.color} />
      </View>
      
      <View style={itemStyles.content}>
        <View style={itemStyles.header}>
          <Text style={itemStyles.title} numberOfLines={1}>{notification.title}</Text>
          {!notification.read && <View style={itemStyles.unreadDot} />}
        </View>
        <Text style={itemStyles.body} numberOfLines={2}>{notification.body}</Text>
        <Text style={itemStyles.time}>{timeAgo}</Text>
      </View>

      <TouchableOpacity style={itemStyles.menuBtn} onPress={onDelete}>
        <Ionicons name="close" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: HORIZONTAL_PADDING,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  unread: {
    backgroundColor: COLORS.unread,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ============ DATE SEPARATOR ============
const DateSeparator = ({ date }: { date: string }) => (
  <View style={separatorStyles.container}>
    <Text style={separatorStyles.text}>{date}</Text>
  </View>
);

const separatorStyles = StyleSheet.create({
  container: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// ============ EMPTY STATE ============
const EmptyState = () => (
  <View style={emptyStyles.container}>
    <View style={emptyStyles.iconContainer}>
      <Ionicons name="notifications-off-outline" size={48} color={COLORS.textSecondary} />
    </View>
    <Text style={emptyStyles.title}>No Notifications</Text>
    <Text style={emptyStyles.subtitle}>You're all caught up! We'll notify you when something new happens.</Text>
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
export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications', { params: { limit: 50 } });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    const { data_payload, type } = notification;
    if (data_payload?.listing_id) {
      router.push(`/listing/${data_payload.listing_id}`);
    } else if (data_payload?.conversation_id) {
      router.push(`/chat/${data_payload.conversation_id}`);
    } else if (type === 'security_alert') {
      router.push('/settings');
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/notifications');
              setNotifications([]);
              setUnreadCount(0);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear notifications');
            }
          }
        },
      ]
    );
  };

  // Group notifications by date
  const groupNotificationsByDate = (items: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    items.forEach(item => {
      const itemDate = new Date(item.created_at).toDateString();
      let dateLabel = itemDate;
      
      if (itemDate === today) dateLabel = 'Today';
      else if (itemDate === yesterday) dateLabel = 'Yesterday';
      else dateLabel = new Date(item.created_at).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });

      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(item);
    });

    return groups;
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={emptyStyles.container}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={[emptyStyles.title, { marginTop: 16 }]}>Sign In Required</Text>
          <Text style={emptyStyles.subtitle}>Please sign in to view your notifications</Text>
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
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const groupedNotifications = groupNotificationsByDate(notifications);
  const sections = Object.entries(groupedNotifications);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleMarkAllRead} disabled={unreadCount === 0}>
          <Ionicons 
            name="checkmark-done" 
            size={24} 
            color={unreadCount > 0 ? COLORS.primary : COLORS.border} 
          />
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item[0]}
          renderItem={({ item: [date, items] }) => (
            <View>
              <DateSeparator date={date} />
              {items.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
                  onMarkRead={() => handleMarkRead(notification.id)}
                  onDelete={() => handleDelete(notification.id)}
                />
              ))}
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListFooterComponent={
            notifications.length > 0 ? (
              <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                <Text style={styles.clearAllText}>Clear All Notifications</Text>
              </TouchableOpacity>
            ) : null
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInBtn: {
    marginTop: 20,
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
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  clearAllText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
  },
});
