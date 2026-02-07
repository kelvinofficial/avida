import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Dimensions,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { conversationsApi, usersApi } from '../../src/utils/api';
import { Conversation, Message } from '../../src/types';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { useResponsive } from '../../src/hooks/useResponsive';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Get backend URL
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || 
                    process.env.EXPO_PUBLIC_BACKEND_URL || 
                    'http://localhost:8001';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E8E8E8',
  error: '#E53935',
  online: '#4CAF50',
  unread: '#2E7D32',
};

// Helper functions
const getTimeLabel = (date?: string) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isToday(d)) {
      return format(d, 'HH:mm');
    } else if (isYesterday(d)) {
      return 'Yesterday';
    }
    return format(d, 'dd MMM');
  } catch {
    return '';
  }
};

// Filter Tabs Component
interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  unreadCount: number;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ activeFilter, onFilterChange, unreadCount }) => {
  const filters = [
    { id: 'all', label: 'All', icon: 'chatbubbles-outline' },
    { id: 'unread', label: 'Unread', icon: 'mail-unread-outline', badge: unreadCount },
    { id: 'buying', label: 'Buying', icon: 'cart-outline' },
    { id: 'selling', label: 'Selling', icon: 'pricetag-outline' },
  ];

  return (
    <View style={filterStyles.container}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[filterStyles.tab, activeFilter === filter.id && filterStyles.tabActive]}
          onPress={() => onFilterChange(filter.id)}
        >
          <Ionicons
            name={filter.icon as any}
            size={16}
            color={activeFilter === filter.id ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[filterStyles.tabText, activeFilter === filter.id && filterStyles.tabTextActive]}>
            {filter.label}
          </Text>
          {filter.badge && filter.badge > 0 && (
            <View style={filterStyles.badge}>
              <Text style={filterStyles.badgeText}>{filter.badge > 99 ? '99+' : filter.badge}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const filterStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

// Helper function to format last seen
const formatLastSeen = (lastSeen: string | null): string => {
  if (!lastSeen) return '';
  try {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(date, 'MMM d');
  } catch {
    return '';
  }
};

// Conversation Item Component
interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
  isSelected?: boolean;
  isDesktop?: boolean;
  userStatus?: { is_online: boolean | null; last_seen: string | null };
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, onPress, isSelected, isDesktop, userStatus }) => {
  const { user } = useAuthStore();
  const hasUnread = conversation.unread > 0;
  const isOnline = userStatus?.is_online === true;
  
  const listingImage = conversation.listing?.images?.[0];
  const imageSource = listingImage
    ? listingImage.startsWith('data:')
      ? { uri: listingImage }
      : listingImage.startsWith('http')
        ? { uri: listingImage }
        : { uri: `data:image/jpeg;base64,${listingImage}` }
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.conversationItem, 
        hasUnread && styles.conversationItemUnread,
        isSelected && styles.conversationItemSelected,
        Platform.OS === 'web' && { cursor: 'pointer' } as any,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        {conversation.other_user?.picture ? (
          <Image
            source={{ uri: conversation.other_user.picture }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {(conversation.other_user?.name || 'U')[0].toUpperCase()}
            </Text>
          </View>
        )}
        {/* Online indicator */}
        {isOnline && (
          <View style={styles.onlineIndicator} />
        )}
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <View style={styles.headerRow}>
          <Text style={[styles.userName, hasUnread && styles.userNameUnread]} numberOfLines={1}>
            {conversation.other_user?.name || 'Unknown User'}
          </Text>
          <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
            {getTimeLabel(conversation.last_message_time)}
          </Text>
        </View>

        {/* Listing Title */}
        <View style={styles.listingRow}>
          <Ionicons name="pricetag-outline" size={12} color={COLORS.primary} />
          <Text style={styles.listingTitle} numberOfLines={1}>
            {conversation.listing?.title || 'Direct Message'}
          </Text>
        </View>

        {/* Last Message */}
        <View style={styles.messageRow}>
          {hasUnread && <View style={styles.unreadDot} />}
          <Text
            style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {conversation.last_message || 'Start a conversation'}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {conversation.unread > 9 ? '9+' : conversation.unread}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Listing Image */}
      {imageSource && (
        <View style={styles.listingImageContainer}>
          <Image source={imageSource} style={styles.listingImage} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Main Messages Screen
export default function MessagesScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  
  // Embedded chat states
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const chatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  
  // User online status tracking
  const [userStatuses, setUserStatuses] = useState<Record<string, { is_online: boolean | null; last_seen: string | null }>>({});

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const data = await conversationsApi.getAll();
      setConversations(data);
      
      // Fetch online status for all conversation users
      const userIds = data
        .map((c: Conversation) => c.other_user?.user_id)
        .filter((id: string | undefined): id is string => !!id);
      
      if (userIds.length > 0) {
        try {
          const statuses = await usersApi.getStatusBatch(userIds);
          setUserStatuses(statuses);
        } catch (err) {
          console.error('Error fetching user statuses:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  // Listen for online/offline status changes via socket
  useEffect(() => {
    if (!socketRef.current) return;
    
    const handleUserOnline = (data: { user_id: string; is_online: boolean }) => {
      setUserStatuses(prev => ({
        ...prev,
        [data.user_id]: { ...prev[data.user_id], is_online: data.is_online }
      }));
    };
    
    const handleUserOffline = (data: { user_id: string }) => {
      setUserStatuses(prev => ({
        ...prev,
        [data.user_id]: { ...prev[data.user_id], is_online: false, last_seen: new Date().toISOString() }
      }));
    };
    
    socketRef.current.on('user_online_status', handleUserOnline);
    socketRef.current.on('user_offline', handleUserOffline);
    
    return () => {
      socketRef.current?.off('user_online_status', handleUserOnline);
      socketRef.current?.off('user_offline', handleUserOffline);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // Calculate unread count
  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread || 0), 0);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesUser = c.other_user?.name?.toLowerCase().includes(query);
      const matchesListing = c.listing?.title?.toLowerCase().includes(query);
      const matchesMessage = c.last_message?.toLowerCase().includes(query);
      if (!matchesUser && !matchesListing && !matchesMessage) return false;
    }

    // Tab filter
    switch (activeFilter) {
      case 'unread':
        return c.unread > 0;
      case 'buying':
        // If user initiated the conversation (they're the buyer)
        return c.listing?.user_id !== user?.user_id;
      case 'selling':
        // If user owns the listing (they're the seller)
        return c.listing?.user_id === user?.user_id;
      default:
        return true;
    }
  });

  // Fetch chat messages when conversation is selected (desktop only)
  const fetchChatMessages = useCallback(async (conversationId: string) => {
    if (!isLargeScreen) return;
    
    setChatLoading(true);
    try {
      const data = await conversationsApi.getOne(conversationId);
      setChatMessages(data.messages || []);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    } finally {
      setChatLoading(false);
    }
  }, [isLargeScreen]);

  // Connect to socket for real-time messages
  const connectSocket = useCallback((conversationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_conversation', { conversation_id: socketRef.current.conversationId });
      socketRef.current.disconnect();
    }

    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true,
    }) as Socket & { conversationId?: string };
    
    socket.conversationId = conversationId;

    socket.on('connect', () => {
      socket.emit('join_conversation', { conversation_id: conversationId });
    });

    socket.on('new_message', (data: { conversation_id: string; message: Message }) => {
      if (data.conversation_id === conversationId) {
        setChatMessages((prev) => [...prev, data.message]);
        setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    socketRef.current = socket;
  }, []);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (isLargeScreen) {
      fetchChatMessages(conversation.id);
      connectSocket(conversation.id);
    }
  }, [isLargeScreen, fetchChatMessages, connectSocket]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedConversation) return;

    const content = newMessage.trim();
    const tempId = `temp_${Date.now()}`;
    
    // Optimistic update
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_id: user?.user_id || '',
      content,
      message_type: 'text',
      read: false,
      created_at: new Date().toISOString(),
    };
    
    setChatMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 50);

    setSending(true);
    try {
      await conversationsApi.sendMessage(selectedConversation.id, content);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages((prev) => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Header Component
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Title Row */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.composeButton}>
          <Ionicons name="create-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <FilterTabs
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        unreadCount={unreadCount}
      />
    </View>
  );

  // Empty state based on filter
  const getEmptyState = () => {
    if (searchQuery) {
      return {
        icon: 'search-outline',
        title: 'No results found',
        description: `No conversations matching "${searchQuery}"`,
      };
    }
    switch (activeFilter) {
      case 'unread':
        return {
          icon: 'checkmark-done-outline',
          title: 'All caught up!',
          description: 'You have no unread messages',
        };
      case 'buying':
        return {
          icon: 'cart-outline',
          title: 'No buying conversations',
          description: 'Start shopping to chat with sellers',
        };
      case 'selling':
        return {
          icon: 'pricetag-outline',
          title: 'No selling conversations',
          description: 'Post a listing to receive inquiries',
        };
      default:
        return {
          icon: 'chatbubbles-outline',
          title: 'No messages yet',
          description: 'Start a conversation by contacting a seller',
        };
    }
  };

  if (!isAuthenticated) {
    // Desktop unauthenticated - split screen layout
    if (isLargeScreen) {
      return (
        <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
          <View style={desktopStyles.splitContainer}>
            {/* Left side - Promo illustration */}
            <View style={desktopStyles.unauthLeftPanel}>
              <View style={desktopStyles.unauthPromoContent}>
                <View style={desktopStyles.unauthIconBgLarge}>
                  <Ionicons name="chatbubbles" size={80} color="#1976D2" />
                </View>
                <Text style={desktopStyles.unauthPromoTitle}>Connect with Buyers & Sellers</Text>
                <Text style={desktopStyles.unauthPromoText}>
                  Real-time messaging, negotiate prices, make offers, and close deals securely.
                </Text>
                
                {/* Features grid */}
                <View style={desktopStyles.featuresGrid}>
                  <View style={desktopStyles.featureCard}>
                    <View style={[desktopStyles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
                      <Ionicons name="chatbubble-ellipses" size={24} color="#1976D2" />
                    </View>
                    <Text style={desktopStyles.featureTitle}>Real-time Chat</Text>
                    <Text style={desktopStyles.featureDesc}>Instant messaging with buyers and sellers</Text>
                  </View>
                  <View style={desktopStyles.featureCard}>
                    <View style={[desktopStyles.featureIcon, { backgroundColor: '#E8F5E9' }]}>
                      <Ionicons name="pricetag" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={desktopStyles.featureTitle}>Make Offers</Text>
                    <Text style={desktopStyles.featureDesc}>Negotiate prices directly in chat</Text>
                  </View>
                  <View style={desktopStyles.featureCard}>
                    <View style={[desktopStyles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
                      <Ionicons name="shield-checkmark" size={24} color="#F57C00" />
                    </View>
                    <Text style={desktopStyles.featureTitle}>Secure</Text>
                    <Text style={desktopStyles.featureDesc}>Safe & private conversations</Text>
                  </View>
                  <View style={desktopStyles.featureCard}>
                    <View style={[desktopStyles.featureIcon, { backgroundColor: '#FCE4EC' }]}>
                      <Ionicons name="notifications" size={24} color="#E91E63" />
                    </View>
                    <Text style={desktopStyles.featureTitle}>Notifications</Text>
                    <Text style={desktopStyles.featureDesc}>Never miss a message</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Right side - Sign in form */}
            <View style={desktopStyles.unauthRightPanel}>
              <View style={desktopStyles.unauthFormCard}>
                <Text style={desktopStyles.unauthFormTitle}>Sign in to Messages</Text>
                <Text style={desktopStyles.unauthFormSubtitle}>
                  Access your conversations and connect with the community
                </Text>

                <TouchableOpacity 
                  style={desktopStyles.unauthPrimaryBtn} 
                  onPress={() => router.push('/login')}
                >
                  <Ionicons name="log-in-outline" size={22} color="#fff" />
                  <Text style={desktopStyles.unauthPrimaryBtnText}>Sign In</Text>
                </TouchableOpacity>

                <View style={desktopStyles.unauthDivider}>
                  <View style={desktopStyles.unauthDividerLine} />
                  <Text style={desktopStyles.unauthDividerText}>or</Text>
                  <View style={desktopStyles.unauthDividerLine} />
                </View>

                <TouchableOpacity 
                  style={desktopStyles.unauthSecondaryBtn} 
                  onPress={() => router.push('/register')}
                >
                  <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
                  <Text style={desktopStyles.unauthSecondaryBtnText}>Create New Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    // Mobile unauthenticated
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <ScrollView 
          style={styles.unauthScrollView}
          contentContainerStyle={styles.unauthContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Illustration */}
          <View style={styles.unauthIllustration}>
            <View style={styles.unauthIconBg}>
              <Ionicons name="chatbubbles" size={48} color="#1976D2" />
            </View>
            <View style={[styles.floatingBubble, styles.floatingBubble1]}>
              <Ionicons name="chatbubble" size={14} color={COLORS.primary} />
            </View>
            <View style={[styles.floatingBubble, styles.floatingBubble2]}>
              <Ionicons name="send" size={12} color="#F57C00" />
            </View>
          </View>

          <Text style={styles.unauthTitle}>Your Messages</Text>
          <Text style={styles.unauthSubtitle}>
            Sign in to chat with buyers and sellers, negotiate prices, and close deals
          </Text>

          {/* Benefits */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#1976D2" />
              </View>
              <Text style={styles.benefitText}>Real-time messaging</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="pricetag" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.benefitText}>Make and receive offers</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="shield-checkmark" size={18} color="#F57C00" />
              </View>
              <Text style={styles.benefitText}>Safe & secure conversations</Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity 
            style={styles.unauthSignInBtn} 
            onPress={() => router.push('/login')}
          >
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.unauthSignInBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.unauthSignUpBtn} 
            onPress={() => router.push('/register')}
          >
            <Text style={styles.unauthSignUpBtnText}>Create Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isLargeScreen && desktopStyles.container]} edges={['top']}>
        {isLargeScreen ? (
          <View style={desktopStyles.masterDetailContainer}>
            <View style={desktopStyles.sidebarContainer}>
              {renderHeader()}
            </View>
            <View style={desktopStyles.detailContainer}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading conversations...</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            {renderHeader()}
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          </>
        )}
      </SafeAreaView>
    );
  }

  const emptyState = getEmptyState();

  // Desktop: Master-Detail Layout with Embedded Chat
  if (isLargeScreen) {
    return (
      <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
        <View style={desktopStyles.pageWrapper}>
          <View style={desktopStyles.masterDetailContainer}>
            {/* Left Sidebar - Conversation List (25% width) */}
            <View style={desktopStyles.sidebarContainer}>
              {/* Sidebar Header - NOT sticky */}
              <View style={desktopStyles.sidebarHeader}>
                <Text style={desktopStyles.sidebarTitle}>Messages</Text>
                <TouchableOpacity style={desktopStyles.composeBtn}>
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={desktopStyles.searchContainer}>
                <Ionicons name="search" size={16} color={COLORS.textSecondary} />
                <TextInput
                  style={desktopStyles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Chips - All visible, wrapped */}
              <View style={desktopStyles.filterChipsContainer}>
                {[
                  { id: 'all', label: 'All', icon: 'chatbubbles-outline' },
                  { id: 'unread', label: 'Unread', icon: 'mail-unread-outline', badge: unreadCount },
                  { id: 'buying', label: 'Buying', icon: 'cart-outline' },
                  { id: 'selling', label: 'Selling', icon: 'pricetag-outline' },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      desktopStyles.filterChip,
                      activeFilter === filter.id && desktopStyles.filterChipActive,
                    ]}
                    onPress={() => setActiveFilter(filter.id)}
                  >
                    <Ionicons
                      name={filter.icon as any}
                      size={14}
                      color={activeFilter === filter.id ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[
                      desktopStyles.filterChipText,
                      activeFilter === filter.id && desktopStyles.filterChipTextActive,
                    ]}>
                      {filter.label}
                    </Text>
                    {filter.badge && filter.badge > 0 && (
                      <View style={desktopStyles.filterChipBadge}>
                        <Text style={desktopStyles.filterChipBadgeText}>
                          {filter.badge > 99 ? '99+' : filter.badge}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Conversation List */}
              <FlatList
                data={filteredConversations}
                renderItem={({ item }) => (
                  <ConversationItem
                    conversation={item}
                    onPress={() => handleSelectConversation(item)}
                    isSelected={selectedConversation?.id === item.id}
                    isDesktop={true}
                  />
                )}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <View style={desktopStyles.sidebarEmptyState}>
                    <Ionicons name={emptyState.icon as any} size={32} color={COLORS.textMuted} />
                    <Text style={desktopStyles.sidebarEmptyTitle}>{emptyState.title}</Text>
                    <Text style={desktopStyles.sidebarEmptyDesc}>{emptyState.description}</Text>
                  </View>
                }
                contentContainerStyle={desktopStyles.conversationList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                    tintColor={COLORS.primary}
                  />
                }
                ItemSeparatorComponent={() => <View style={desktopStyles.listSeparator} />}
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Right Panel - Full Chat View */}
            <View style={desktopStyles.chatContainer}>
              {selectedConversation ? (
                <View style={desktopStyles.chatWrapper}>
                  {/* Chat Header */}
                  <View style={desktopStyles.chatHeader}>
                    <TouchableOpacity
                      style={desktopStyles.chatUserInfo}
                      onPress={() => router.push(`/profile/public/${selectedConversation.other_user?.user_id}`)}
                    >
                      {selectedConversation.other_user?.picture ? (
                        <Image
                          source={{ uri: selectedConversation.other_user.picture }}
                          style={desktopStyles.chatAvatar}
                        />
                      ) : (
                        <View style={desktopStyles.chatAvatarPlaceholder}>
                          <Text style={desktopStyles.chatAvatarInitial}>
                            {(selectedConversation.other_user?.name || 'U')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={desktopStyles.chatHeaderTextInfo}>
                        <Text style={desktopStyles.chatHeaderName}>
                          {selectedConversation.other_user?.name || 'Unknown User'}
                        </Text>
                        {selectedConversation.listing && (
                          <Text style={desktopStyles.chatHeaderListing} numberOfLines={1}>
                            Re: {selectedConversation.listing.title}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={desktopStyles.chatHeaderActions}>
                      {selectedConversation.listing && (
                        <TouchableOpacity
                          style={desktopStyles.viewListingBtn}
                          onPress={() => router.push(`/listing/${selectedConversation.listing!.id}`)}
                        >
                          <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                          <Text style={desktopStyles.viewListingBtnText}>View Listing</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Chat Messages */}
                  <View style={desktopStyles.chatMessagesArea}>
                    {chatLoading ? (
                      <View style={desktopStyles.chatLoadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={desktopStyles.chatLoadingText}>Loading messages...</Text>
                      </View>
                    ) : (
                      <FlatList
                        ref={chatListRef}
                        data={chatMessages}
                        renderItem={({ item: msg }) => {
                          const isOwn = msg.sender_id === user?.user_id;
                          return (
                            <View style={[
                              desktopStyles.messageBubbleRow,
                              isOwn ? desktopStyles.messageBubbleRowOwn : desktopStyles.messageBubbleRowOther,
                            ]}>
                              <View style={[
                                desktopStyles.messageBubble,
                                isOwn ? desktopStyles.messageBubbleOwn : desktopStyles.messageBubbleOther,
                              ]}>
                                <Text style={[
                                  desktopStyles.messageText,
                                  isOwn && desktopStyles.messageTextOwn,
                                ]}>
                                  {msg.content}
                                </Text>
                                <Text style={[
                                  desktopStyles.messageTime,
                                  isOwn && desktopStyles.messageTimeOwn,
                                ]}>
                                  {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}
                                </Text>
                              </View>
                            </View>
                          );
                        }}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={desktopStyles.messagesListContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                          <View style={desktopStyles.noMessagesContainer}>
                            <Ionicons name="chatbubble-ellipses-outline" size={48} color={COLORS.textMuted} />
                            <Text style={desktopStyles.noMessagesText}>No messages yet</Text>
                            <Text style={desktopStyles.noMessagesSubtext}>Start the conversation!</Text>
                          </View>
                        }
                      />
                    )}
                  </View>

                  {/* Message Input */}
                  <View style={desktopStyles.chatInputContainer}>
                    <TextInput
                      style={desktopStyles.chatInput}
                      placeholder="Type a message..."
                      placeholderTextColor={COLORS.textMuted}
                      value={newMessage}
                      onChangeText={setNewMessage}
                      multiline
                      maxLength={1000}
                      onSubmitEditing={handleSendMessage}
                    />
                    <TouchableOpacity
                      style={[
                        desktopStyles.sendBtn,
                        (!newMessage.trim() || sending) && desktopStyles.sendBtnDisabled,
                      ]}
                      onPress={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                    >
                      {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="send" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // No conversation selected
                <View style={desktopStyles.emptyDetailContainer}>
                  <View style={desktopStyles.emptyDetailIcon}>
                    <Ionicons name="chatbubbles-outline" size={56} color={COLORS.primary} />
                  </View>
                  <Text style={desktopStyles.emptyDetailTitle}>Select a Conversation</Text>
                  <Text style={desktopStyles.emptyDetailText}>
                    Choose a conversation from the list to start chatting
                  </Text>
                  {filteredConversations.length === 0 && (
                    <TouchableOpacity
                      style={desktopStyles.browseListingsBtn}
                      onPress={() => router.push('/')}
                    >
                      <Ionicons name="search-outline" size={18} color="#fff" />
                      <Text style={desktopStyles.browseListingsBtnText}>Browse Listings</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }


  // Mobile Layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredConversations}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => router.push(`/chat/${item.id}`)}
          />
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  headerContainer: {
    backgroundColor: COLORS.surface,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  composeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  
  // List
  listContent: {
    flexGrow: 1,
  },
  
  // Conversation Item
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  conversationItemUnread: {
    backgroundColor: '#FAFFFE',
  },
  
  // Avatar
  avatarSection: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.online,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  
  // Content
  contentSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  userNameUnread: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  timeTextUnread: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Listing Row
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 12,
    color: COLORS.primary,
    flex: 1,
  },
  
  // Message Row
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    color: COLORS.text,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Listing Image
  listingImageContainer: {
    marginLeft: 12,
  },
  listingImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  
  // Separator
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 86,
  },
  
  // Loading
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
  
  // Login Button
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Unauthenticated State Styles
  unauthScrollView: {
    flex: 1,
  },
  unauthContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingBottom: 100,
  },
  unauthIllustration: {
    position: 'relative',
    marginBottom: 24,
  },
  unauthIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBubble: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingBubble1: {
    top: -5,
    right: -10,
  },
  floatingBubble2: {
    bottom: 10,
    left: -15,
  },
  unauthTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  benefitsList: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  unauthSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  unauthSignInBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  unauthSignUpBtn: {
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  unauthSignUpBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  conversationItemSelected: {
    backgroundColor: COLORS.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
});

// Desktop-specific styles
const desktopStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F2F5',
  },
  
  // Page wrapper for max-width constraint
  pageWrapper: {
    flex: 1,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Master-Detail Layout
  masterDetailContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  
  // Sidebar (Conversation List) - 25% width
  sidebarContainer: {
    width: '25%',
    minWidth: 280,
    maxWidth: 350,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  composeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  
  // Filter Chips - wrapped, all visible
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterChipBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterChipBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  
  conversationList: {
    flexGrow: 1,
  },
  listSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 60,
  },
  sidebarEmptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarEmptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 10,
    textAlign: 'center',
  },
  sidebarEmptyDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Chat Container - 75% width
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chatWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  
  // Chat Header
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  chatAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAvatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  chatHeaderTextInfo: {
    marginLeft: 12,
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  chatHeaderListing: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewListingBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Chat Messages Area
  chatMessagesArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  chatLoadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  messagesListContent: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubbleRow: {
    marginBottom: 8,
  },
  messageBubbleRowOwn: {
    alignItems: 'flex-end',
  },
  messageBubbleRowOther: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  messageBubbleOwn: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  noMessagesSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  
  // Chat Input
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  
  // Empty Detail State
  emptyDetailContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyDetailIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyDetailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  browseListingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 20,
  },
  browseListingsBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Unauthenticated Desktop Styles
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  unauthLeftPanel: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  unauthPromoContent: {
    maxWidth: 500,
    alignItems: 'center',
  },
  unauthIconBgLarge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  unauthPromoTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  unauthPromoText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  featureCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  
  unauthRightPanel: {
    width: 480,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  unauthFormCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  unauthFormTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthFormSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  unauthPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 10,
    width: '100%',
  },
  unauthPrimaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  unauthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  unauthDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  unauthDividerText: {
    paddingHorizontal: 16,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  unauthSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unauthSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
