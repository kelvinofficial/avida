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
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/utils/api';
import { format, isToday, isYesterday } from 'date-fns';

const COLORS = {
  primary: '#2E7D32',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  sent: '#DCF8C6',
  received: '#FFFFFF',
};

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'seller';
  timestamp: string;
  read?: boolean;
}

interface Property {
  id: string;
  title: string;
  price: number;
  images: string[];
  seller: {
    id: string;
    name: string;
    type: string;
  };
}

// Typing Indicator Component
const TypingIndicator = ({ sellerName }: { sellerName: string }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = animateDot(dot1, 0);
    const animation2 = animateDot(dot2, 150);
    const animation3 = animateDot(dot3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  const getDotStyle = (dot: Animated.Value) => ({
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
    ],
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.avatarPlaceholder}>
        <Ionicons name="person" size={14} color={COLORS.textSecondary} />
      </View>
      <View style={typingStyles.bubble}>
        <Text style={typingStyles.name}>{sellerName}</Text>
        <View style={typingStyles.dotsContainer}>
          <Animated.View style={[typingStyles.dot, getDotStyle(dot1)]} />
          <Animated.View style={[typingStyles.dot, getDotStyle(dot2)]} />
          <Animated.View style={[typingStyles.dot, getDotStyle(dot3)]} />
        </View>
        <Text style={typingStyles.typingText}>typing...</Text>
      </View>
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: COLORS.received,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  typingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});

// Format timestamp
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Yesterday ' + format(date, 'HH:mm');
  }
  return format(date, 'dd/MM/yyyy HH:mm');
};

// Message Bubble Component
const MessageBubble = ({ message, isLast }: { message: Message; isLast: boolean }) => {
  const isUser = message.sender === 'user';

  return (
    <View style={[bubbleStyles.container, isUser ? bubbleStyles.userContainer : bubbleStyles.sellerContainer]}>
      {!isUser && (
        <View style={bubbleStyles.avatarPlaceholder}>
          <Ionicons name="business" size={14} color={COLORS.textSecondary} />
        </View>
      )}
      <View style={[bubbleStyles.bubble, isUser ? bubbleStyles.userBubble : bubbleStyles.sellerBubble]}>
        <Text style={[bubbleStyles.text, isUser && bubbleStyles.userText]}>{message.text}</Text>
        <View style={bubbleStyles.footer}>
          <Text style={[bubbleStyles.time, isUser && bubbleStyles.userTime]}>{formatTime(message.timestamp)}</Text>
          {isUser && message.read && <Ionicons name="checkmark-done" size={14} color="#4FC3F7" />}
        </View>
      </View>
    </View>
  );
};

const bubbleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  sellerContainer: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: COLORS.sent,
    borderBottomRightRadius: 4,
  },
  sellerBubble: {
    backgroundColor: COLORS.received,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  userText: {
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
    color: COLORS.textSecondary,
  },
  userTime: {
    color: '#666666',
  },
});

// Property Preview Header
const PropertyPreview = ({ property, onPress }: { property: Property; onPress: () => void }) => (
  <TouchableOpacity style={previewStyles.container} onPress={onPress}>
    <Image source={{ uri: property.images[0] }} style={previewStyles.image} />
    <View style={previewStyles.info}>
      <Text style={previewStyles.title} numberOfLines={1}>{property.title}</Text>
      <Text style={previewStyles.price}>€{property.price.toLocaleString()}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
  </TouchableOpacity>
);

const previewStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  price: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 2,
  },
});

// Auto-replies for simulation
const AUTO_REPLIES = [
  "Thank you for your interest in this property! I'd be happy to help.",
  "When would you like to schedule a viewing?",
  "This property is still available. Would you like more details?",
  "I can arrange a viewing at your convenience. What times work for you?",
  "Great question! Let me check and get back to you shortly.",
  "The property has excellent transport links and is in a quiet neighborhood.",
];

// Initial messages for new chat
const INITIAL_MESSAGES: Message[] = [
  {
    id: 'init_1',
    text: 'Hello! I noticed you\'re interested in this property. How can I help you today?',
    sender: 'seller',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

export default function PropertyChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Fetch property details
  const fetchProperty = useCallback(async () => {
    try {
      const response = await api.get(`/property/listings/${id}`);
      setProperty(response.data);
      // Initialize with dummy messages
      setMessages(INITIAL_MESSAGES.map(m => ({
        ...m,
        text: m.text.replace('this property', response.data.title),
      })));
    } catch (error) {
      console.error('Error fetching property:', error);
      Alert.alert('Error', 'Failed to load property');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id, fetchProperty]);

  // Send message
  const handleSend = () => {
    if (!inputText.trim() || !property) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      read: false,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    Keyboard.dismiss();

    // Simulate typing and auto-reply
    setTimeout(() => {
      setIsTyping(true);
      
      setTimeout(() => {
        setIsTyping(false);
        const reply: Message = {
          id: `reply_${Date.now()}`,
          text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
          sender: 'seller',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => {
          // Mark previous user messages as read
          const updated = prev.map(m => m.sender === 'user' ? { ...m, read: true } : m);
          return [...updated, reply];
        });
      }, 2000 + Math.random() * 2000);
    }, 1000);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.errorText}>Property not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{property.seller.name}</Text>
          <Text style={styles.headerStatus}>
            {property.seller.type === 'agent' ? 'Verified Agent' : 'Property Owner'}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.push(`/property/${id}`)}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Property Preview */}
      <PropertyPreview property={property} onPress={() => router.push(`/property/${id}`)} />

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MessageBubble message={item} isLast={index === messages.length - 1} />
          )}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isTyping ? <TypingIndicator sellerName={property.seller.name} /> : null}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color={inputText.trim() ? '#fff' : COLORS.textSecondary} />
          </TouchableOpacity>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerStatus: {
    fontSize: 12,
    color: COLORS.primary,
  },
  chatArea: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
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
});
