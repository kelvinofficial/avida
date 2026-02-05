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
  Animated,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { conversationsApi } from '../../src/utils/api';
import { Conversation, Message } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { format, isToday, isYesterday } from 'date-fns';

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
  recording: '#E53935',
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
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});

// Typing Indicator Component
const TypingIndicator = ({ userName }: { userName?: string }) => {
  const [dot1] = useState(new Animated.Value(0.3));
  const [dot2] = useState(new Animated.Value(0.3));
  const [dot3] = useState(new Animated.Value(0.3));

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 200);
    animateDot(dot3, 400);
  }, []);

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubble}>
        <Animated.View style={[typingStyles.dot, { opacity: dot1 }]} />
        <Animated.View style={[typingStyles.dot, { opacity: dot2 }]} />
        <Animated.View style={[typingStyles.dot, { opacity: dot3 }]} />
      </View>
      <Text style={typingStyles.text}>{userName || 'Someone'} is typing...</Text>
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingBottom: 8,
    gap: 8,
  },
  bubble: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },
  text: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});

// Voice Message Recording UI
interface VoiceRecordingProps {
  isRecording: boolean;
  duration: number;
  onCancel: () => void;
  onSend: () => void;
}

const VoiceRecordingUI: React.FC<VoiceRecordingProps> = ({ isRecording, duration, onCancel, onSend }) => {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <View style={voiceStyles.container}>
      <TouchableOpacity style={voiceStyles.cancelButton} onPress={onCancel}>
        <Ionicons name="trash-outline" size={24} color={COLORS.recording} />
      </TouchableOpacity>
      
      <View style={voiceStyles.recordingInfo}>
        <Animated.View style={[voiceStyles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={voiceStyles.durationText}>{formatDuration(duration)}</Text>
        <Text style={voiceStyles.recordingLabel}>Recording...</Text>
      </View>

      <TouchableOpacity style={voiceStyles.sendButton} onPress={onSend}>
        <Ionicons name="send" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const voiceStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.recording,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  recordingLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Check if message is a voice message
  const isVoiceMessage = message.content?.startsWith('[VOICE:');

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
        {isVoiceMessage ? (
          <View style={bubbleStyles.voiceContent}>
            <TouchableOpacity style={bubbleStyles.playButton}>
              <Ionicons name="play" size={20} color={isMine ? COLORS.primary : COLORS.primary} />
            </TouchableOpacity>
            <View style={bubbleStyles.waveform}>
              {[...Array(15)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    bubbleStyles.waveformBar,
                    { height: Math.random() * 16 + 8 },
                    isMine && bubbleStyles.waveformBarMine,
                  ]}
                />
              ))}
            </View>
            <Text style={[bubbleStyles.voiceDuration, isMine && bubbleStyles.voiceDurationMine]}>
              {message.content?.match(/\[VOICE:(\d+)s\]/)?.[1] || '0'}s
            </Text>
          </View>
        ) : (
          <Text style={[bubbleStyles.text, isMine && bubbleStyles.textMine]}>
            {message.content}
          </Text>
        )}
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
  // Voice message styles
  voiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  waveformBar: {
    width: 3,
    backgroundColor: COLORS.textSecondary,
    borderRadius: 2,
  },
  waveformBarMine: {
    backgroundColor: COLORS.primaryDark,
  },
  voiceDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  voiceDurationMine: {
    color: 'rgba(0,0,0,0.5)',
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
  const [typingUser, setTypingUser] = useState<string | undefined>(undefined);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      // Stop any active recording
      if (recording) {
        recording.stopAndUnloadAsync();
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

    // Real-time typing indicator from WebSocket
    socket.on('user_typing', (data: { user_id: string; user_name?: string }) => {
      if (data.user_id !== user?.user_id) {
        setIsTyping(true);
        setTypingUser(data.user_name);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypingUser(undefined);
        }, 3000);
      }
    });

    socket.on('user_stop_typing', (data: { user_id: string }) => {
      if (data.user_id !== user?.user_id) {
        setIsTyping(false);
        setTypingUser(undefined);
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

    // Emit stop typing
    if (socketRef.current) {
      socketRef.current.emit('stop_typing', {
        conversation_id: id,
        user_id: user?.user_id,
      });
    }

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
    if (socketRef.current) {
      // Emit typing event
      socketRef.current.emit('typing', {
        conversation_id: id,
        user_id: user?.user_id,
        user_name: user?.name,
      });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('stop_typing', {
            conversation_id: id,
            user_id: user?.user_id,
          });
        }
      }, 2000);
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow microphone access to record voice messages');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const cancelRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }

    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const sendVoiceMessage = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const duration = recordingDuration;

      if (!uri) {
        Alert.alert('Error', 'No recording found');
        return;
      }

      setSending(true);

      // Upload the audio file
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'audio/m4a',
        name: `voice_${Date.now()}.m4a`,
      } as any);

      try {
        const uploadResult = await conversationsApi.uploadMedia(formData, 'audio');
        
        // Send message with media URL
        await conversationsApi.sendMessage(
          id!,
          'Voice message',
          'audio',
          uploadResult.media_url,
          duration
        );
      } catch (uploadError) {
        console.error('Upload failed, sending placeholder:', uploadError);
        // Fallback to placeholder if upload fails
        await conversationsApi.sendMessage(id!, `🎤 Voice message (${duration}s)`, 'text');
      }
      
      setMessages((prev) => [
        ...prev,
        {
          id: `temp_${Date.now()}`,
          conversation_id: id!,
          sender_id: user?.user_id || '',
          content: 'Voice message',
          message_type: 'audio',
          media_duration: duration,
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message');
    } finally {
      setSending(false);
      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  // Image/Video Attachment Functions
  const showAttachmentOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Record Video'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await pickImage('camera', 'image');
          } else if (buttonIndex === 2) {
            await pickImage('library', 'image');
          } else if (buttonIndex === 3) {
            await pickImage('camera', 'video');
          }
        }
      );
    } else {
      Alert.alert(
        'Add Attachment',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: () => pickImage('camera', 'image') },
          { text: 'Choose from Library', onPress: () => pickImage('library', 'image') },
          { text: 'Record Video', onPress: () => pickImage('camera', 'video') },
        ]
      );
    }
  };

  const pickImage = async (source: 'camera' | 'library', mediaType: 'image' | 'video') => {
    try {
      const permissionResult = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', `Please allow ${source} access to attach ${mediaType}s`);
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: mediaType === 'video' ? ['videos'] : ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        await sendMediaMessage(result.assets[0], mediaType);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const sendMediaMessage = async (asset: ImagePicker.ImagePickerAsset, mediaType: 'image' | 'video') => {
    setSending(true);
    
    try {
      const formData = new FormData();
      const fileName = asset.uri.split('/').pop() || `${mediaType}_${Date.now()}`;
      const fileType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
      
      formData.append('file', {
        uri: asset.uri,
        type: fileType,
        name: fileName,
      } as any);

      try {
        const uploadResult = await conversationsApi.uploadMedia(formData, mediaType);
        
        await conversationsApi.sendMessage(
          id!,
          mediaType === 'image' ? 'Photo' : 'Video',
          mediaType,
          uploadResult.media_url
        );
      } catch (uploadError) {
        console.error('Upload failed:', uploadError);
        // Send base64 as fallback
        const base64 = asset.base64 || '';
        await conversationsApi.sendMessage(
          id!,
          `📷 ${mediaType === 'image' ? 'Photo' : 'Video'}`,
          'text'
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `temp_${Date.now()}`,
          conversation_id: id!,
          sender_id: user?.user_id || '',
          content: mediaType === 'image' ? 'Photo' : 'Video',
          message_type: mediaType,
          media_url: asset.uri,
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending media:', error);
      Alert.alert('Error', 'Failed to send media');
    } finally {
      setSending(false);
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
              <Text style={styles.typingStatusText}>typing...</Text>
            ) : (
              <Text style={styles.headerStatus}>Online</Text>
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
        {isTyping && <TypingIndicator userName={typingUser || conversation?.other_user?.name} />}

        {/* Quick Replies */}
        {messages.length === 0 && !isRecording && (
          <QuickReplies onSelect={(text) => setNewMessage(text)} />
        )}

        {/* Voice Recording UI */}
        <VoiceRecordingUI
          isRecording={isRecording}
          duration={recordingDuration}
          onCancel={cancelRecording}
          onSend={sendVoiceMessage}
        />

        {/* Input Bar */}
        {!isRecording && (
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
              <TouchableOpacity
                style={styles.micButton}
                onPress={startRecording}
              >
                <Ionicons name="mic" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
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
  },
  typingStatusText: {
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
