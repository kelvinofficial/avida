import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { conversationsApi } from '../../src/utils/api';
import { Conversation } from '../../src/types';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Conversation Item Component
interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, onPress }) => {
  const { user } = useAuthStore();
  const hasUnread = conversation.unread > 0;
  
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
      style={[styles.conversationItem, hasUnread && styles.conversationItemUnread]}
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
        {/* Online indicator - could be dynamic */}
        {Math.random() > 0.5 && (
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const data = await conversationsApi.getAll();
      setConversations(data);
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
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const emptyState = getEmptyState();

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
});
