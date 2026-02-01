import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { theme } from '../../src/utils/theme';
import { conversationsApi } from '../../src/utils/api';
import { Conversation, Message } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      fetchConversation();
      connectSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_conversation', { conversation_id: id });
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [id]);

  const connectSocket = () => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('join_conversation', { conversation_id: id });
    });

    socket.on('new_message', (data: { conversation_id: string; message: Message }) => {
      if (data.conversation_id === id) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    socket.on('user_typing', (data: { user_id: string }) => {
      if (data.user_id !== user?.user_id) {
        setIsTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
      }
    });

    socketRef.current = socket;
  };

  const fetchConversation = async () => {
    try {
      const data = await conversationsApi.getOne(id!);
      setConversation(data);
      setMessages(data.messages || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    Keyboard.dismiss();

    try {
      await conversationsApi.sendMessage(id!, content);
      // Message will be added via socket or we add it optimistically
      setMessages((prev) => [...prev, {
        id: `temp_${Date.now()}`,
        conversation_id: id!,
        sender_id: user?.user_id || '',
        content,
        read: false,
        created_at: new Date().toISOString(),
      }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (socketRef.current && text) {
      socketRef.current.emit('typing', {
        conversation_id: id,
        user_id: user?.user_id,
      });
    }
  };

  const formatMessageTime = (date: string) => {
    try {
      const d = new Date(date);
      if (isToday(d)) {
        return format(d, 'HH:mm');
      } else if (isYesterday(d)) {
        return 'Yesterday ' + format(d, 'HH:mm');
      }
      return format(d, 'MMM d, HH:mm');
    } catch {
      return '';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.sender_id === user?.user_id;
    const showAvatar = !isMine && (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);

    return (
      <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
        {!isMine && showAvatar && (
          conversation?.other_user?.picture ? (
            <Image
              source={{ uri: conversation.other_user.picture }}
              style={styles.messageAvatar}
            />
          ) : (
            <View style={styles.messageAvatarPlaceholder}>
              <Ionicons name="person" size={14} color={theme.colors.onSurfaceVariant} />
            </View>
          )
        )}
        {!isMine && !showAvatar && <View style={styles.avatarSpacer} />}
        
        <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
          <Text style={[styles.messageText, isMine && styles.myMessageText]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
              {formatMessageTime(item.created_at)}
            </Text>
            {isMine && (
              <Ionicons
                name={item.read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={isMine ? 'rgba(255,255,255,0.7)' : theme.colors.onSurfaceVariant}
                style={styles.readIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const listingImage = conversation?.listing?.images?.[0];
  const imageSource = listingImage
    ? listingImage.startsWith('data:')
      ? { uri: listingImage }
      : { uri: `data:image/jpeg;base64,${listingImage}` }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerContent}
          onPress={() => conversation?.listing && router.push(`/listing/${conversation.listing.id}`)}
        >
          {conversation?.other_user?.picture ? (
            <Image
              source={{ uri: conversation.other_user.picture }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={20} color={theme.colors.onSurfaceVariant} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conversation?.other_user?.name || 'User'}
            </Text>
            {isTyping ? (
              <Text style={styles.typingIndicator}>typing...</Text>
            ) : (
              <Text style={styles.headerStatus}>Active</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Listing Banner */}
      {conversation?.listing && (
        <TouchableOpacity
          style={styles.listingBanner}
          onPress={() => router.push(`/listing/${conversation.listing!.id}`)}
          activeOpacity={0.8}
        >
          {imageSource && (
            <Image source={imageSource} style={styles.listingBannerImage} />
          )}
          <View style={styles.listingBannerInfo}>
            <Text style={styles.listingBannerTitle} numberOfLines={1}>
              {conversation.listing.title}
            </Text>
            <Text style={styles.listingBannerPrice}>
              {formatPrice(conversation.listing.price)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.primary} />
              </View>
              <Text style={styles.emptyChatText}>Start the conversation!</Text>
              <Text style={styles.emptyChatSubtext}>
                Send a message to inquire about this item
              </Text>
            </View>
          }
        />

        {/* Typing indicator */}
        {isTyping && (
          <View style={styles.typingBubble}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
          </View>
        )}

        {/* Quick Replies */}
        {messages.length === 0 && (
          <View style={styles.quickReplies}>
            {['Is this still available?', 'What\'s the lowest price?', 'Can I see more photos?'].map((text) => (
              <TouchableOpacity
                key={text}
                style={styles.quickReplyButton}
                onPress={() => {
                  setNewMessage(text);
                }}
              >
                <Text style={styles.quickReplyText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="camera" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={newMessage}
              onChangeText={handleTyping}
              multiline
              maxLength={1000}
            />
          </View>
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Ionicons name="send" size={20} color={theme.colors.onPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  headerStatus: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  typingIndicator: {
    fontSize: 12,
    color: theme.colors.primary,
    fontStyle: 'italic',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  listingBannerImage: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  listingBannerInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  listingBannerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  listingBannerPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: theme.spacing.sm,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarSpacer: {
    width: 36,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  myMessage: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  messageText: {
    fontSize: 15,
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
  myMessageText: {
    color: theme.colors.onPrimary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  readIcon: {
    marginLeft: 4,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyChatIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  typingBubble: {
    paddingHorizontal: theme.spacing.md + 36,
    paddingBottom: theme.spacing.sm,
  },
  typingDots: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    alignSelf: 'flex-start',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.onSurfaceVariant,
    opacity: 0.4,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  quickReplyButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  quickReplyText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    gap: theme.spacing.sm,
  },
  attachButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    fontSize: 15,
    color: theme.colors.onSurface,
    maxHeight: 100,
    paddingVertical: theme.spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.outline,
  },
});
