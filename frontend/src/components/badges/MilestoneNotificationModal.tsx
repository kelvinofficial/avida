import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Share,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Milestone {
  id: string;
  type: 'count' | 'special';
  name: string;
  message: string;
  icon: string;
  threshold?: number;
  badge_name?: string;
}

interface MilestoneNotificationModalProps {
  visible: boolean;
  milestone: Milestone | null;
  onClose: () => void;
  onShare: () => void;
  userId: string;
  shareUrl?: string;
}

// Confetti particle component
const ConfettiParticle = ({ delay, color }: { delay: number; color: string }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(Math.random() * SCREEN_WIDTH - SCREEN_WIDTH / 2)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(translateY, {
        toValue: 500,
        duration: 3000,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: (Math.random() - 0.5) * 200,
        duration: 3000,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 10,
        duration: 3000,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 3000,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 10],
    outputRange: ['0deg', '3600deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotateInterpolate },
          ],
          opacity,
        },
      ]}
    />
  );
};

// Star burst animation component
const StarBurst = () => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.starBurst,
        {
          transform: [{ scale }, { rotate: rotateInterpolate }],
          opacity,
        },
      ]}
    >
      {[...Array(8)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.starRay,
            { transform: [{ rotate: `${i * 45}deg` }] },
          ]}
        />
      ))}
    </Animated.View>
  );
};

const getIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    'ribbon': 'ribbon',
    'medal': 'medal',
    'trophy': 'trophy',
    'star': 'star',
    'diamond': 'diamond',
    'pricetag': 'pricetag',
    'cash': 'cash',
    'trending-up': 'trending-up',
    'shield-checkmark': 'shield-checkmark',
    'time': 'time',
  };
  return iconMap[iconName] || 'ribbon';
};

const getMilestoneColor = (milestone: Milestone): string => {
  if (milestone.type === 'count') {
    const threshold = milestone.threshold || 1;
    if (threshold >= 50) return '#9333EA'; // Purple for legend
    if (threshold >= 25) return '#F59E0B'; // Gold for master
    if (threshold >= 10) return '#3B82F6'; // Blue for hunter
    if (threshold >= 5) return '#10B981'; // Green for collector
    return '#6366F1'; // Indigo for first badge
  }
  // Special badges
  if (milestone.badge_name?.includes('Sale')) return '#22C55E';
  if (milestone.badge_name?.includes('Seller')) return '#F59E0B';
  return '#6366F1';
};

const MilestoneNotificationModal: React.FC<MilestoneNotificationModalProps> = ({
  visible,
  milestone,
  onClose,
  onShare,
  userId,
  shareUrl,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];

  useEffect(() => {
    if (visible) {
      setShowConfetti(true);
      
      // Entrance animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }).start();

      // Icon bounce animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconBounce, {
            toValue: -10,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(iconBounce, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Stop confetti after animation
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleShare = async () => {
    const shareMessage = `I just unlocked "${milestone?.name}" on Avida Marketplace! Check out my badge collection.`;
    const url = shareUrl || `https://dating-subcats.preview.emergentagent.com/profile/${userId}`;
    
    if (Platform.OS === 'web') {
      try {
        await Clipboard.setStringAsync(`${shareMessage}\n${url}`);
        alert('Link copied to clipboard!');
      } catch (e) {
        console.error('Failed to copy:', e);
      }
    } else {
      try {
        await Share.share({
          message: `${shareMessage}\n${url}`,
          title: milestone?.name,
        });
      } catch (e) {
        console.error('Failed to share:', e);
      }
    }
    onShare();
  };

  if (!milestone) return null;

  const milestoneColor = getMilestoneColor(milestone);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="milestone-notification-modal"
    >
      <View style={styles.overlay} testID="milestone-modal-overlay">
        {/* Confetti */}
        {showConfetti && (
          <View style={styles.confettiContainer}>
            {[...Array(50)].map((_, i) => (
              <ConfettiParticle
                key={i}
                delay={i * 50}
                color={confettiColors[i % confettiColors.length]}
              />
            ))}
          </View>
        )}

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Star burst background */}
          <StarBurst />

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Badge icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { 
                backgroundColor: milestoneColor,
                transform: [{ translateY: iconBounce }],
              },
            ]}
          >
            <Ionicons
              name={getIconName(milestone.icon)}
              size={48}
              color="#fff"
            />
          </Animated.View>

          {/* Celebration text */}
          <Text style={styles.celebrationEmoji}>🎉</Text>
          
          <Text style={styles.title}>{milestone.name}</Text>
          <Text style={styles.message}>{milestone.message}</Text>

          {/* Milestone type indicator */}
          <View style={[styles.typeIndicator, { backgroundColor: `${milestoneColor}20` }]}>
            <Text style={[styles.typeText, { color: milestoneColor }]}>
              {milestone.type === 'count' 
                ? `${milestone.threshold} Badge${(milestone.threshold || 0) > 1 ? 's' : ''} Earned!`
                : 'Special Achievement!'
              }
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: milestoneColor }]}
              onPress={handleShare}
              testID="milestone-share-button"
            >
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Share Achievement</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.continueButton} onPress={onClose} testID="milestone-continue-button">
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  confettiParticle: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 380,
    width: '90%',
    overflow: 'hidden',
  },
  starBurst: {
    position: 'absolute',
    top: 60,
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starRay: {
    position: 'absolute',
    width: 4,
    height: 100,
    backgroundColor: '#FFD700',
    opacity: 0.3,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  celebrationEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  typeIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    backgroundColor: '#f5f5f5',
  },
  continueButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default MilestoneNotificationModal;
