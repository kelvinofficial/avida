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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { conversationsApi } from '../../src/utils/api';
import { Conversation } from '../../src/types';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuthStore } from '../../src/store/authStore';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const getTimeAgo = (date?: string) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const listingImage = item.listing?.images?.[0];
    const imageSource = listingImage
      ? listingImage.startsWith('data:')
        ? { uri: listingImage }
        : { uri: `data:image/jpeg;base64,${listingImage}` }
      : null;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push(`/chat/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.other_user?.picture ? (
            <Image
              source={{ uri: item.other_user.picture }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
          )}
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread > 9 ? '9+' : item.unread}</Text>
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.other_user?.name || 'Unknown User'}
            </Text>
            <Text style={styles.time}>{getTimeAgo(item.last_message_time)}</Text>
          </View>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {item.listing?.title || 'Listing'}
          </Text>
          <Text
            style={[styles.lastMessage, item.unread > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.last_message || 'No messages yet'}
          </Text>
        </View>

        {imageSource && (
          <Image source={imageSource} style={styles.listingImage} />
        )}
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <EmptyState
          icon="chatbubbles-outline"
          title="Sign in to view messages"
          description="Log in to start chatting with sellers and buyers"
          action={
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No messages yet"
              description="Start a conversation by contacting a seller"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...theme.elevation.level1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: theme.colors.onError,
    fontSize: 11,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    flex: 1,
  },
  time: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginLeft: theme.spacing.sm,
  },
  listingTitle: {
    fontSize: 12,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  lastMessageUnread: {
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  listingImage: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginLeft: 84,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  loginButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
});
