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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/utils/theme';
import { api } from '../../../src/utils/api';
import { format, isToday, isYesterday } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface AutoConversation {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string;
  listing_price: number;
  seller_id: string;
  seller_name: string;
  seller_phone: string;
  buyer_id: string;
  buyer_name: string;
  messages: Message[];
  last_message: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  unread_count: number;
}

export default function AutoChatScreen() {
  const { id, listingId, title } = useLocalSearchParams<{ id: string; listingId?: string; title?: string }>();
  const router = useRouter();
  
  const [conversation, setConversation] = useState<AutoConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) {
      fetchConversation();
    }
  }, [id]);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/auto/conversations/${id}`);
      const data = response.data;
      setConversation(data);
      setMessages(data.messages || []);
      setCurrentUserId(data.buyer_id); // We're the buyer in this context
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      Alert.alert('Error', 'Failed to load conversation');
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

    // Optimistic update - add the message immediately
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      sender_id: currentUserId,
      sender_name: 'You',
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, tempMessage]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await api.post(`/auto/conversations/${id}/messages`, {
        content,
      });
      
      // Fetch updated conversation to get seller's auto-reply
      setTimeout(async () => {
        try {
          const response = await api.get(`/auto/conversations/${id}`);
          setMessages(response.data.messages || []);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (err) {
          console.error('Error fetching updated messages:', err);
        }
      }, 500);
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temp message on error
      setMessages((prev) => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(content); // Restore message on error
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
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

  const handleCall = () => {
    if (conversation?.seller_phone) {
      Alert.alert(
        'Call Seller',
        `Call ${conversation.seller_name}?\n\n${conversation.seller_phone}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {
            // In a real app, this would use Linking.openURL
            Alert.alert('Calling...', conversation.seller_phone);
          }},
        ]
      );
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.sender_id === currentUserId;
    const showAvatar = !isMine && (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);
    const showName = !isMine && showAvatar;

    return (
      <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
        {!isMine && showAvatar && (
          <View style={styles.messageAvatarPlaceholder}>
            <Ionicons name="person" size={14} color={theme.colors.onSurfaceVariant} />
          </View>
        )}
        {!isMine && !showAvatar && <View style={styles.avatarSpacer} />}
        
        <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
          {showName && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}
          <Text style={[styles.messageText, isMine && styles.myMessageText]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
              {formatMessageTime(item.timestamp)}
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.headerAvatarPlaceholder}>
            <Ionicons name="person" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conversation?.seller_name || title || 'Seller'}
            </Text>
            <Text style={styles.headerStatus}>Active now</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerButton} onPress={handleCall}>
          <Ionicons name="call" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Listing Banner */}
      {conversation && (
        <TouchableOpacity
          style={styles.listingBanner}
          onPress={() => router.push(`/auto/${conversation.listing_id}`)}
          activeOpacity={0.8}
        >
          {conversation.listing_image ? (
            <Image source={{ uri: conversation.listing_image }} style={styles.listingBannerImage} />
          ) : (
            <View style={[styles.listingBannerImage, styles.listingImagePlaceholder]}>
              <Ionicons name="car" size={24} color={theme.colors.outline} />
            </View>
          )}
          <View style={styles.listingBannerInfo}>
            <Text style={styles.listingBannerTitle} numberOfLines={1}>
              {conversation.listing_title}
            </Text>
            <Text style={styles.listingBannerPrice}>
              {formatPrice(conversation.listing_price)}
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
                Send a message to inquire about this vehicle
              </Text>
            </View>
          }
        />

        {/* Quick Replies */}
        {messages.length === 0 && (
          <View style={styles.quickReplies}>
            {['Is this still available?', 'Can I schedule a test drive?', 'What\'s the best price?'].map((text) => (
              <TouchableOpacity
                key={text}
                style={styles.quickReplyButton}
                onPress={() => setNewMessage(text)}
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
              onChangeText={setNewMessage}
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
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
  listingImagePlaceholder: {
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
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
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
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
