import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/utils/api';
import { useAuthStore } from '../src/store/authStore';
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
  unreadDot: '#4CAF50',
  unreadBg: '#F1F8E9',
};

// Type definitions
type NotificationType = 'message' | 'follow' | 'review' | 'price_drop' | 'system';

interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  cta_label?: string;
  cta_route?: string;
  read: boolean;
  created_at: string;
  actor_id?: string;
  actor_name?: string;
  actor_picture?: string;
  listing_id?: string;
  listing_title?: string;
  image_url?: string;
  meta?: Record<string, any>;
}

// Filter chips configuration
const FILTER_CHIPS = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'message', label: 'Messages', icon: 'chatbubble-outline' },
  { key: 'follow', label: 'Follows', icon: 'person-add-outline' },
  { key: 'review', label: 'Reviews', icon: 'star-outline' },
  { key: 'price_drop', label: 'Price Drops', icon: 'pricetag-outline' },
  { key: 'system', label: 'System', icon: 'shield-checkmark-outline' },
];

// Get icon for notification type
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'message': return { name: 'chatbubble', color: COLORS.info };
    case 'follow': return { name: 'person-add', color: COLORS.primary };
    case 'review': return { name: 'star', color: '#FFB800' };
    case 'price_drop': return { name: 'trending-down', color: COLORS.success };
    case 'system': return { name: 'shield-checkmark', color: COLORS.textSecondary };
    default: return { name: 'notifications', color: COLORS.textSecondary };
  }
};

// Get CTA label for notification type
const getCtaLabel = (type: NotificationType) => {
  switch (type) {
    case 'message': return 'MESSAGE';
    case 'follow': return 'VIEW';
    case 'review': return 'REVIEW';
    case 'price_drop': return 'VIEW';
    case 'system': return 'VIEW';
    default: return 'VIEW';
  }
};

// Get CTA color for notification type
const getCtaColor = (type: NotificationType) => {
  switch (type) {
    case 'message': return COLORS.info;
    case 'follow': return COLORS.primary;
    case 'review': return '#FFB800';
    case 'price_drop': return COLORS.success;
    case 'system': return COLORS.textSecondary;
    default: return COLORS.primary;
  }
};

// Skeleton loader component
const SkeletonItem = () => (
  <View style={styles.notificationCard}>
    <View style={[styles.iconContainer, { backgroundColor: COLORS.border }]} />
    <View style={styles.contentContainer}>
      <View style={[styles.skeletonLine, { width: '60%', marginBottom: 8 }]} />
      <View style={[styles.skeletonLine, { width: '90%', marginBottom: 4 }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
    </View>
  </View>
);

// Notification item component
const NotificationItem = ({
  notification,
  onPress,
  onActionPress,
}: {
  notification: Notification;
  onPress: () => void;
  onActionPress: () => void;
}) => {
  const icon = getNotificationIcon(notification.type);
  const ctaLabel = notification.cta_label || getCtaLabel(notification.type);
  const ctaColor = getCtaColor(notification.type);
  
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: false })
    .replace('about ', '')
    .replace('less than a minute', '1m')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' days', 'd')
    .replace(' day', 'd');

  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !notification.read && styles.unreadCard,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      {notification.image_url ? (
        <Image source={{ uri: notification.image_url }} style={styles.thumbnailImage} />
      ) : notification.actor_picture ? (
        <Image source={{ uri: notification.actor_picture }} style={styles.actorImage} />
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
          <Ionicons name={icon.name as any} size={22} color={icon.color} />
        </View>
      )}

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.timeText}>{timeAgo} ago</Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: `${ctaColor}15` }]}
            onPress={onActionPress}
          >
            <Text style={[styles.ctaText, { color: ctaColor }]}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Unread indicator */}
      {!notification.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

// Empty state component
const EmptyState = ({ type }: { type: 'all' | 'unread' }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Ionicons
        name={type === 'unread' ? 'checkmark-circle-outline' : 'notifications-off-outline'}
        size={64}
        color={COLORS.textSecondary}
      />
    </View>
    <Text style={styles.emptyTitle}>
      {type === 'unread' ? "You're all caught up!" : 'No notifications yet'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {type === 'unread'
        ? 'You have no unread notifications'
        : 'When you get notifications, they will appear here'}
    </Text>
  </View>
);

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  
  // Filter state
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Menu state
  const [showMenu, setShowMenu] = useState(false);

  const fetchNotifications = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const params: Record<string, any> = {
        page: pageNum,
        limit: 20,
      };
      
      if (activeTab === 'unread') {
        params.unread_only = true;
      }
      
      if (activeFilter !== 'all') {
        params.notification_type = activeFilter;
      }

      const response = await api.get('/notifications', { params });
      const data = response.data;

      if (refresh || pageNum === 1) {
        setNotifications(data.notifications || []);
      } else {
        setNotifications(prev => [...prev, ...(data.notifications || [])]);
      }

      setUnreadCount(data.unread_count || 0);
      setTypeCounts(data.type_counts || {});
      setHasMore((data.notifications || []).length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [isAuthenticated, activeTab, activeFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    fetchNotifications(1, true);
  }, [isAuthenticated, activeTab, activeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchNotifications(page + 1);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
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

    // Navigate to relevant screen
    handleAction(notification);
  };

  const handleAction = (notification: Notification) => {
    const route = notification.cta_route;
    
    if (route) {
      router.push(route as any);
      return;
    }

    // Default routes based on type
    switch (notification.type) {
      case 'message':
        if (notification.meta?.thread_id) {
          router.push(`/chat/${notification.meta.thread_id}`);
        }
        break;
      case 'follow':
        if (notification.actor_id) {
          router.push(`/profile/public/${notification.actor_id}`);
        }
        break;
      case 'review':
        router.push('/profile/my-listings');
        break;
      case 'price_drop':
        if (notification.listing_id) {
          router.push(`/listing/${notification.listing_id}`);
        }
        break;
      case 'system':
        router.push('/settings');
        break;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      setTypeCounts({});
      setShowMenu(false);
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
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
              setTypeCounts({});
              setShowMenu(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loginRequired}>
          <Ionicons name="notifications-off-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.loginTitle}>Sign in required</Text>
          <Text style={styles.loginSubtitle}>Please sign in to view your notifications</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unread' && styles.tabActive]}
          onPress={() => setActiveTab('unread')}
        >
          <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
            Unread {unreadCount > 0 && `(${unreadCount > 99 ? '99+' : unreadCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {FILTER_CHIPS.map(chip => {
          const count = chip.key === 'all' ? unreadCount : (typeCounts[chip.key] || 0);
          const isActive = activeFilter === chip.key;
          
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveFilter(chip.key)}
            >
              <Ionicons
                name={chip.icon as any}
                size={16}
                color={isActive ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.label}
              </Text>
              {count > 0 && activeTab === 'all' && (
                <View style={[styles.chipBadge, isActive && styles.chipBadgeActive]}>
                  <Text style={[styles.chipBadgeText, isActive && styles.chipBadgeTextActive]}>
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Notifications List */}
      {loading ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <SkeletonItem />}
          contentContainerStyle={styles.listContent}
        />
      ) : notifications.length === 0 ? (
        <EmptyState type={activeTab} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={() => handleNotificationPress(item)}
              onActionPress={() => {
                handleNotificationPress(item);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} />
            ) : null
          }
        />
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleMarkAllRead}>
              <Ionicons name="checkmark-done-outline" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>Mark all as read</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/settings/alerts');
              }}
            >
              <Ionicons name="settings-outline" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>Notification settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[styles.menuItemText, { color: COLORS.error }]}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  chipBadgeActive: { backgroundColor: COLORS.primary },
  chipBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  chipBadgeTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingBottom: 100 },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadCard: {
    backgroundColor: COLORS.unreadBg,
    borderColor: COLORS.primaryLight,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbnailImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  actorImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  contentContainer: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  body: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: { fontSize: 12, color: COLORS.textSecondary },
  ctaButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  ctaText: { fontSize: 11, fontWeight: '700' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.unreadDot,
    marginLeft: 8,
    alignSelf: 'center',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  loginRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  loginTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  loginSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  signInBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 8,
  },
  signInBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: 60,
    marginRight: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemDanger: { borderBottomWidth: 0 },
  menuItemText: { fontSize: 14, color: COLORS.text },
});
