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
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../src/hooks/useResponsive';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
  info: '#3B82F6',
  unreadDot: '#22C55E',
  unreadBg: '#F0FDF4',
  messageColor: '#3B82F6',
  followColor: '#8B5CF6',
  reviewColor: '#F59E0B',
  priceDropColor: '#10B981',
  systemColor: '#6B7280',
};

type NotificationType = 'message' | 'follow' | 'review' | 'price_drop' | 'system' | 'offer_received' | 'offer_accepted' | 'offer_rejected';

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

const FILTER_CHIPS = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'offer', label: 'Offers', icon: 'pricetag-outline' },
  { key: 'message', label: 'Messages', icon: 'chatbubble-outline' },
  { key: 'follow', label: 'Follows', icon: 'person-add-outline' },
  { key: 'review', label: 'Reviews', icon: 'star-outline' },
  { key: 'price_drop', label: 'Deals', icon: 'trending-down-outline' },
  { key: 'system', label: 'System', icon: 'shield-outline' },
];

const getNotificationConfig = (type: NotificationType) => {
  switch (type) {
    case 'message':
      return { icon: 'chatbubble', color: COLORS.messageColor, gradient: ['#3B82F6', '#2563EB'] };
    case 'follow':
      return { icon: 'person-add', color: COLORS.followColor, gradient: ['#8B5CF6', '#7C3AED'] };
    case 'review':
      return { icon: 'star', color: COLORS.reviewColor, gradient: ['#F59E0B', '#D97706'] };
    case 'price_drop':
      return { icon: 'trending-down', color: COLORS.priceDropColor, gradient: ['#10B981', '#059669'] };
    case 'offer_received':
      return { icon: 'pricetag', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] };
    case 'offer_accepted':
      return { icon: 'checkmark-circle', color: '#16A34A', gradient: ['#16A34A', '#15803D'] };
    case 'offer_rejected':
      return { icon: 'close-circle', color: '#DC2626', gradient: ['#DC2626', '#B91C1C'] };
    case 'system':
      return { icon: 'shield-checkmark', color: COLORS.systemColor, gradient: ['#6B7280', '#4B5563'] };
    default:
      return { icon: 'notifications', color: COLORS.textSecondary, gradient: ['#9CA3AF', '#6B7280'] };
  }
};

const formatTimeAgo = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

// Skeleton loader
const SkeletonItem = () => (
  <View style={styles.notificationCard}>
    <View style={[styles.skeletonCircle, { backgroundColor: COLORS.border }]} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '50%' }]} />
      <View style={[styles.skeletonLine, { width: '80%', marginTop: 8 }]} />
      <View style={[styles.skeletonLine, { width: '30%', marginTop: 8 }]} />
    </View>
  </View>
);

// Notification Item Component
const NotificationItem = ({
  notification,
  onPress,
  onSwipeAction,
}: {
  notification: Notification;
  onPress: () => void;
  onSwipeAction?: () => void;
}) => {
  const config = getNotificationConfig(notification.type);
  const timeAgo = formatTimeAgo(notification.created_at);

  return (
    <TouchableOpacity
      style={[styles.notificationCard, !notification.read && styles.unreadCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left Icon/Image */}
      <View style={styles.avatarSection}>
        {notification.actor_picture ? (
          <Image source={{ uri: notification.actor_picture }} style={styles.actorAvatar} />
        ) : notification.image_url ? (
          <Image source={{ uri: notification.image_url }} style={styles.listingThumbnail} />
        ) : (
          <LinearGradient colors={config.gradient as any} style={styles.iconGradient}>
            <Ionicons name={config.icon as any} size={20} color="#fff" />
          </LinearGradient>
        )}
        {!notification.read && <View style={styles.unreadIndicator} />}
      </View>

      {/* Content */}
      <View style={styles.contentSection}>
        <View style={styles.headerRow}>
          <Text style={[styles.notifTitle, !notification.read && styles.unreadTitle]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>
          {notification.body}
        </Text>
        
        {/* Action Button */}
        <View style={styles.actionRow}>
          <View style={[styles.typeBadge, { backgroundColor: `${config.color}15` }]}>
            <Ionicons name={config.icon as any} size={12} color={config.color} />
            <Text style={[styles.typeBadgeText, { color: config.color }]}>
              {notification.type === 'offer_received' ? 'Offer' :
               notification.type === 'offer_accepted' ? 'Accepted' :
               notification.type === 'offer_rejected' ? 'Declined' :
               notification.type.replace('_', ' ')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: config.color }]}
            onPress={onPress}
          >
            <Text style={styles.ctaButtonText}>
              {notification.cta_label || 'View'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Empty State
const EmptyState = ({ type }: { type: string }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <LinearGradient colors={[COLORS.primaryLight, '#fff']} style={styles.emptyIconBg}>
        <Ionicons
          name={type === 'unread' ? 'checkmark-circle' : 'notifications-off'}
          size={48}
          color={COLORS.primary}
        />
      </LinearGradient>
    </View>
    <Text style={styles.emptyTitle}>
      {type === 'unread' ? "You're all caught up!" : 'No notifications yet'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {type === 'unread'
        ? 'All your notifications have been read'
        : 'When you get notifications, they will show up here'}
    </Text>
  </View>
);

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showMenu, setShowMenu] = useState(false);

  const fetchNotifications = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const params: Record<string, any> = { page: pageNum, limit: 20 };
      if (activeTab === 'unread') params.unread_only = true;
      if (activeFilter !== 'all') params.notification_type = activeFilter;

      const response = await api.get('/notifications', { params });
      const data = response.data;

      if (refresh || pageNum === 1) {
        setNotifications(data.notifications || []);
      } else {
        setNotifications(prev => [...prev, ...(data.notifications || [])]);
      }

      setUnreadCount(data.unread_count || 0);
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
    if (isAuthenticated) {
      setLoading(true);
      fetchNotifications(1, true);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, activeTab, activeFilter, fetchNotifications]);

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
    if (!notification.read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // Navigate based on type
    const route = notification.cta_route;
    if (route) {
      router.push(route as any);
      return;
    }

    switch (notification.type) {
      case 'message':
        if (notification.meta?.thread_id) router.push(`/chat/${notification.meta.thread_id}`);
        break;
      case 'follow':
        if (notification.actor_id) router.push(`/profile/public/${notification.actor_id}`);
        break;
      case 'price_drop':
      case 'review':
        if (notification.listing_id) router.push(`/listing/${notification.listing_id}`);
        break;
      case 'offer_received':
        // Navigate to offers page to see incoming offers
        router.push('/offers' as any);
        break;
      case 'offer_accepted':
      case 'offer_rejected':
        // Navigate to the listing or offers page
        if (notification.listing_id) {
          router.push(`/listing/${notification.listing_id}`);
        } else {
          router.push('/offers' as any);
        }
        break;
      case 'system':
        router.push('/settings' as any);
        break;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      setShowMenu(false);
    } catch {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleClearAll = () => {
    Alert.alert('Clear All', 'Delete all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/notifications');
            setNotifications([]);
            setUnreadCount(0);
            setShowMenu(false);
          } catch {
            Alert.alert('Error', 'Failed to clear notifications');
          }
        },
      },
    ]);
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (!isAuthenticated) {
    // Desktop unauthenticated
    if (isLargeScreen && isReady) {
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#F0F2F5' }]} edges={['top']}>
          <View style={desktopStyles.globalHeader}>
            <View style={desktopStyles.globalHeaderInner}>
              <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
                <View style={desktopStyles.logoIcon}>
                  <Ionicons name="storefront" size={20} color="#fff" />
                </View>
                <Text style={desktopStyles.logoText}>avida</Text>
              </TouchableOpacity>
              <View style={desktopStyles.headerActions}>
                <TouchableOpacity style={desktopStyles.signInBtn} onPress={() => router.push('/login')}>
                  <Text style={desktopStyles.signInBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={desktopStyles.signUpBtn} onPress={() => router.push('/login')}>
                  <Text style={desktopStyles.signUpBtnText}>Sign Up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={desktopStyles.postBtn} onPress={() => router.push('/post')}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={desktopStyles.postBtnText}>Post Listing</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={desktopStyles.pageWrapper}>
            <View style={desktopStyles.unauthContainer}>
              <View style={desktopStyles.unauthIcon}>
                <Ionicons name="notifications-outline" size={64} color={COLORS.primary} />
              </View>
              <Text style={desktopStyles.unauthTitle}>Sign in to view notifications</Text>
              <Text style={desktopStyles.unauthSubtitle}>
                Stay updated on offers, messages, and activity
              </Text>
              <TouchableOpacity style={desktopStyles.unauthSignInBtn} onPress={() => router.push('/login')}>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={desktopStyles.unauthSignInBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }
    
    // Mobile unauthenticated
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.authRequired}>
          <Ionicons name="lock-closed-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.authTitle}>Sign in required</Text>
          <Text style={styles.authSubtitle}>Sign in to view your notifications</Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/login')}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (!isReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F0F2F5' }]} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ============ DESKTOP VIEW ============
  if (isLargeScreen) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#F0F2F5' }]} edges={['top']}>
        {/* Global Header */}
        <View style={desktopStyles.globalHeader}>
          <View style={desktopStyles.globalHeaderInner}>
            <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
              <View style={desktopStyles.logoIcon}>
                <Ionicons name="storefront" size={20} color="#fff" />
              </View>
              <Text style={desktopStyles.logoText}>avida</Text>
            </TouchableOpacity>
            <View style={desktopStyles.headerActions}>
              <TouchableOpacity style={desktopStyles.headerIconBtn} onPress={() => router.push('/profile')}>
                <Ionicons name="person-circle-outline" size={26} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={desktopStyles.postBtn} onPress={() => router.push('/post')}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={desktopStyles.postBtnText}>Post Listing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Page Content */}
        <View style={desktopStyles.pageWrapper}>
          {/* Page Header */}
          <View style={desktopStyles.pageHeader}>
            <TouchableOpacity style={desktopStyles.backBtn} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={desktopStyles.pageTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={desktopStyles.pageBadge}>
                <Text style={desktopStyles.pageBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={desktopStyles.menuBtn} onPress={handleMarkAllRead}>
              <Ionicons name="checkmark-done" size={18} color={COLORS.primary} />
              <Text style={desktopStyles.menuBtnText}>Mark all read</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs & Filters Row */}
          <View style={desktopStyles.tabsRow}>
            <View style={desktopStyles.tabs}>
              <TouchableOpacity
                style={[desktopStyles.tab, activeTab === 'all' && desktopStyles.tabActive]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[desktopStyles.tabText, activeTab === 'all' && desktopStyles.tabTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[desktopStyles.tab, activeTab === 'unread' && desktopStyles.tabActive]}
                onPress={() => setActiveTab('unread')}
              >
                <Text style={[desktopStyles.tabText, activeTab === 'unread' && desktopStyles.tabTextActive]}>
                  Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Filter Chips */}
            <View style={desktopStyles.filterChips}>
              {FILTER_CHIPS.map(chip => {
                const isActive = activeFilter === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    style={[desktopStyles.filterChip, isActive && desktopStyles.filterChipActive]}
                    onPress={() => setActiveFilter(chip.key)}
                  >
                    <Ionicons
                      name={chip.icon as any}
                      size={14}
                      color={isActive ? '#fff' : COLORS.textSecondary}
                    />
                    <Text style={[desktopStyles.filterChipText, isActive && desktopStyles.filterChipTextActive]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notifications List */}
          <View style={desktopStyles.listContainer}>
            {loading ? (
              <View style={desktopStyles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={desktopStyles.loadingText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={desktopStyles.emptyContainer}>
                <View style={desktopStyles.emptyIcon}>
                  <Ionicons
                    name={activeTab === 'unread' ? 'checkmark-circle' : 'notifications-off'}
                    size={64}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={desktopStyles.emptyTitle}>
                  {activeTab === 'unread' ? "You're all caught up!" : 'No notifications yet'}
                </Text>
                <Text style={desktopStyles.emptySubtitle}>
                  {activeTab === 'unread'
                    ? 'All your notifications have been read'
                    : 'When you get notifications, they will show up here'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const config = getNotificationConfig(item.type);
                  return (
                    <TouchableOpacity
                      style={[desktopStyles.notificationCard, !item.read && desktopStyles.notificationCardUnread]}
                      onPress={() => handleNotificationPress(item)}
                    >
                      {item.actor_picture ? (
                        <Image source={{ uri: item.actor_picture }} style={desktopStyles.notificationAvatar} />
                      ) : item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={desktopStyles.notificationImage} />
                      ) : (
                        <LinearGradient colors={config.gradient as any} style={desktopStyles.notificationIconBg}>
                          <Ionicons name={config.icon as any} size={22} color="#fff" />
                        </LinearGradient>
                      )}
                      <View style={desktopStyles.notificationContent}>
                        <View style={desktopStyles.notificationHeader}>
                          <Text style={[desktopStyles.notificationTitle, !item.read && desktopStyles.notificationTitleUnread]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={desktopStyles.notificationTime}>{formatTimeAgo(item.created_at)}</Text>
                        </View>
                        <Text style={desktopStyles.notificationBody} numberOfLines={2}>{item.body}</Text>
                        <View style={desktopStyles.notificationFooter}>
                          <View style={[desktopStyles.typeBadge, { backgroundColor: `${config.color}15` }]}>
                            <Ionicons name={config.icon as any} size={12} color={config.color} />
                            <Text style={[desktopStyles.typeBadgeText, { color: config.color }]}>
                              {item.type === 'offer_received' ? 'Offer' :
                               item.type === 'offer_accepted' ? 'Accepted' :
                               item.type === 'offer_rejected' ? 'Declined' :
                               item.type.replace('_', ' ')}
                            </Text>
                          </View>
                          <TouchableOpacity style={[desktopStyles.ctaBtn, { backgroundColor: config.color }]}>
                            <Text style={desktopStyles.ctaBtnText}>{item.cta_label || 'View'}</Text>
                            <Ionicons name="chevron-forward" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {!item.read && <View style={desktopStyles.unreadDot} />}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={desktopStyles.listContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} /> : null}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ============ MOBILE VIEW ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
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
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterChipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {FILTER_CHIPS.map(chip => {
            const isActive = activeFilter === chip.key;

            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(chip.key)}
              >
                <Ionicons
                  name={chip.icon as any}
                  size={14}
                  color={isActive ? '#fff' : COLORS.textSecondary}
                />
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            <TouchableOpacity style={styles.menuItem} onPress={handleMarkAllRead}>
              <View style={[styles.menuIconBg, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="checkmark-done" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>Mark all as read</Text>
                <Text style={styles.menuItemSubtitle}>Clear all unread indicators</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); router.push('/settings' as any); }}>
              <View style={[styles.menuIconBg, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>Notification settings</Text>
                <Text style={styles.menuItemSubtitle}>Manage your preferences</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleClearAll}>
              <View style={[styles.menuIconBg, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: COLORS.error }]}>Clear all notifications</Text>
                <Text style={styles.menuItemSubtitle}>This cannot be undone</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 15, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },

  // Filter Chips
  filterChipsWrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChips: { 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    minHeight: 36,
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '500' },

  // List
  listContent: { padding: 16 },

  // Notification Card
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: { backgroundColor: COLORS.unreadBg, borderWidth: 1, borderColor: COLORS.primaryLight },
  
  avatarSection: { marginRight: 12, position: 'relative' },
  actorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.border },
  listingThumbnail: { width: 48, height: 48, borderRadius: 10, backgroundColor: COLORS.border },
  iconGradient: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  unreadIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.unreadDot,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },

  contentSection: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text, flex: 1, marginRight: 8 },
  unreadTitle: { fontWeight: '700' },
  timeText: { fontSize: 12, color: COLORS.textLight },
  notifBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  ctaButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Skeleton
  skeletonCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.border, marginRight: 12 },
  skeletonContent: { flex: 1 },
  skeletonLine: { height: 12, backgroundColor: COLORS.border, borderRadius: 6 },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIconContainer: { marginBottom: 24 },
  emptyIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  seedButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // Seeding Overlay
  seedingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  seedingText: { fontSize: 16, color: COLORS.textSecondary },

  // Auth Required
  authRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  authTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  authSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  signInButton: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, marginTop: 8 },
  signInButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  menuHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  menuItemDanger: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 22 },
  menuIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  menuItemSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});

// ============ DESKTOP STYLES ============
const desktopStyles = StyleSheet.create({
  container: { backgroundColor: '#1A1A1A' }, // Dark footer background
  
  // Global Header
  globalHeader: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  globalHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  signInBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  signUpBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  postBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  
  // Page Wrapper
  pageWrapper: {
    flex: 1,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Unauthenticated
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  unauthIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  unauthTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  unauthSubtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 400, lineHeight: 24, marginBottom: 24 },
  unauthSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  unauthSignInBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  
  // Page Header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  pageBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  menuBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  
  // Tabs Row
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexWrap: 'wrap',
    gap: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  
  // Filter Chips
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff' },
  
  // List Container
  listContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 400, lineHeight: 22 },
  
  // Notification Card
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationCardUnread: {
    backgroundColor: COLORS.unreadBg,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  notificationAvatar: { width: 52, height: 52, borderRadius: 26 },
  notificationImage: { width: 52, height: 52, borderRadius: 12 },
  notificationIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: { flex: 1 },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text, flex: 1, marginRight: 8 },
  notificationTitleUnread: { fontWeight: '700' },
  notificationTime: { fontSize: 12, color: COLORS.textLight },
  notificationBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ctaBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.unreadDot,
    marginTop: 4,
  },
});
