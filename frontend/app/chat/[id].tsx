import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { conversationsApi } from '../../src/utils/api';
import { Conversation, Message } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  background: '#F0F2F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E8E8E8',
  myMessage: '#DCF8C6',
  theirMessage: '#FFFFFF',
  inputBg: '#F0F0F0',
};

// Date separator component
const DateSeparator = ({ date }: { date: string }) => {
  const getLabel = () => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEEE, MMMM d');
  };

  return (
    <View style={dateSeparatorStyles.container}>
      <View style={dateSeparatorStyles.line} />
      <View style={dateSeparatorStyles.badge}>
        <Text style={dateSeparatorStyles.text}>{getLabel()}</Text>
      </View>
      <View style={dateSeparatorStyles.line} />
    </View>
  );
};

const dateSeparatorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  badge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});

// Message bubble component
interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  otherUser?: any;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine, showAvatar, otherUser }) => {
  const formatTime = (date: string) => {
    try {
      return format(new Date(date), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <View style={[bubbleStyles.row, isMine && bubbleStyles.rowMine]}>
      {!isMine && showAvatar && (
        otherUser?.picture ? (
          <Image source={{ uri: otherUser.picture }} style={bubbleStyles.avatar} />
        ) : (
          <View style={bubbleStyles.avatarPlaceholder}>
            <Text style={bubbleStyles.avatarInitial}>
              {(otherUser?.name || 'U')[0].toUpperCase()}
            </Text>
          </View>
        )
      )}
      {!isMine && !showAvatar && <View style={bubbleStyles.avatarSpacer} />}

      <View style={[
        bubbleStyles.bubble,
        isMine ? bubbleStyles.bubbleMine : bubbleStyles.bubbleTheirs,
        isMine ? bubbleStyles.bubbleTailMine : bubbleStyles.bubbleTailTheirs,
      ]}>
        <Text style={[bubbleStyles.text, isMine && bubbleStyles.textMine]}>
          {message.content}
        </Text>
        <View style={bubbleStyles.footer}>
          <Text style={[bubbleStyles.time, isMine && bubbleStyles.timeMine]}>
            {formatTime(message.created_at)}
          </Text>
          {isMine && (
            <View style={bubbleStyles.readStatus}>
              <Ionicons
                name={message.read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={message.read ? '#4FC3F7' : 'rgba(0,0,0,0.3)'}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  avatarSpacer: {
    width: 40,
  },
  bubble: {
    maxWidth: SCREEN_WIDTH * 0.72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: COLORS.myMessage,
  },
  bubbleTheirs: {
    backgroundColor: COLORS.theirMessage,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleTailMine: {
    borderBottomRightRadius: 4,
    marginRight: 4,
  },
  bubbleTailTheirs: {
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  textMine: {
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  timeMine: {
    color: 'rgba(0,0,0,0.4)',
  },
  readStatus: {
    marginLeft: 2,
  },
});

// Quick reply buttons
const QuickReplies = ({ onSelect }: { onSelect: (text: string) => void }) => {
  const replies = [
    'Is this still available?',
    'What\'s your best price?',
    'Can you share more photos?',
    'Where can I pick it up?',
  ];

  return (
    <View style={quickReplyStyles.container}>
      <Text style={quickReplyStyles.title}>Quick replies</Text>
      <View style={quickReplyStyles.buttons}>
        {replies.map((text) => (
          <TouchableOpacity
            key={text}
            style={quickReplyStyles.button}
            onPress={() => onSelect(text)}
          >
            <Text style={quickReplyStyles.buttonText}>{text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const quickReplyStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  buttonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

// Main Chat Screen
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
      setMessages((prev) => [
        ...prev,
        {
          id: `temp_${Date.now()}`,
          conversation_id: id!,
          sender_id: user?.user_id || '',
          content,
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Add date separators between messages
  const getMessagesWithSeparators = useCallback(() => {
    const result: Array<Message | { type: 'date'; date: string }> = [];
    let lastDate: string | null = null;

    messages.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== lastDate) {
        result.push({ type: 'date', date: msg.created_at });
        lastDate = msgDate;
      }
      result.push(msg);
    });

    return result;
  }, [messages]);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (item.type === 'date') {
        return <DateSeparator date={item.date} />;
      }

      const message = item as Message;
      const isMine = message.sender_id === user?.user_id;
      const prevItem = getMessagesWithSeparators()[index - 1];
      const showAvatar =
        !isMine &&
        (index === 0 ||
          prevItem?.type === 'date' ||
          (prevItem as Message)?.sender_id !== message.sender_id);

      return (
        <MessageBubble
          message={message}
          isMine={isMine}
          showAvatar={showAvatar}
          otherUser={conversation?.other_user}
        />
      );
    },
    [user, conversation, getMessagesWithSeparators]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const listingImage = conversation?.listing?.images?.[0];
  const imageSource = listingImage
    ? listingImage.startsWith('data:')
      ? { uri: listingImage }
      : listingImage.startsWith('http')
        ? { uri: listingImage }
        : { uri: `data:image/jpeg;base64,${listingImage}` }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerContent}
          onPress={() =>
            conversation?.other_user?.user_id &&
            router.push(`/profile/public/${conversation.other_user.user_id}`)
          }
        >
          {conversation?.other_user?.picture ? (
            <Image
              source={{ uri: conversation.other_user.picture }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>
                {(conversation?.other_user?.name || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conversation?.other_user?.name || 'User'}
            </Text>
            {isTyping ? (
              <Text style={styles.typingText}>typing...</Text>
            ) : (
              <Text style={styles.headerStatus}>
                <View style={styles.onlineDot} />
                {' Online'}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="call-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
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
          <View style={styles.listingBannerAction}>
            <Text style={styles.listingBannerActionText}>View</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </View>
        </TouchableOpacity>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={getMessagesWithSeparators()}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            (item as any).type === 'date' ? `date-${index}` : (item as Message).id
          }
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={48}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.emptyChatText}>Start the conversation!</Text>
              <Text style={styles.emptyChatSubtext}>
                Send a message to inquire about this item
              </Text>
            </View>
          }
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingBubble}>
              <View style={[styles.typingDot, { opacity: 0.4 }]} />
              <View style={[styles.typingDot, { opacity: 0.6 }]} />
              <View style={[styles.typingDot, { opacity: 0.8 }]} />
            </View>
          </View>
        )}

        {/* Quick Replies */}
        {messages.length === 0 && (
          <QuickReplies onSelect={(text) => setNewMessage(text)} />
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textMuted}
              value={newMessage}
              onChangeText={handleTyping}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Ionicons name="happy-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {newMessage.trim() ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.micButton}>
              <Ionicons name="mic" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  typingText: {
    fontSize: 12,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Listing Banner
  listingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listingBannerImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  listingBannerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listingBannerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  listingBannerPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listingBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  listingBannerActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Chat
  chatContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 12,
    flexGrow: 1,
  },

  // Empty Chat
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChatIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Typing Indicator
  typingIndicator: {
    paddingHorizontal: 60,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    alignSelf: 'flex-start',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  attachButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.inputBg,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  emojiButton: {
    paddingVertical: 8,
    paddingLeft: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
