import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface FavoriteToastProps {
  visible: boolean;
  userName: string;
  listingTitle: string;
  onDismiss: () => void;
  duration?: number;
  onPress?: () => void;
}

export const FavoriteToast: React.FC<FavoriteToastProps> = ({
  visible,
  userName,
  listingTitle,
  onDismiss,
  duration = 4000,
  onPress,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Slide in animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={() => {
          if (onPress) onPress();
          handleDismiss();
        }}
        activeOpacity={0.9}
        data-testid="favorite-toast"
      >
        <View style={styles.iconContainer}>
          <Ionicons name="heart" size={24} color="#E91E63" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            New Favorite!
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            <Text style={styles.userName}>{userName}</Text> favorited your listing "{listingTitle}"
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={18} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 16,
    right: 16,
    zIndex: 10000,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E91E63',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  userName: {
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default FavoriteToast;
