import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  star: '#FFD700',
};

// Confetti colors
const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'];

// Map badge icon names to Ionicons
const getBadgeIcon = (iconName: string): any => {
  const iconMap: Record<string, any> = {
    'verified': 'checkmark-circle',
    'trophy': 'trophy',
    'star': 'star',
    'medal': 'medal',
    'diamond': 'diamond',
    'heart': 'heart',
    'flame': 'flame',
    'shield': 'shield-checkmark',
    'crown': 'ribbon',
    'rocket': 'rocket',
    'flash': 'flash',
    'sparkles': 'sparkles',
  };
  return iconMap[iconName] || 'ribbon';
};

interface ConfettiPiece {
  id: number;
  x: number;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
}

interface BadgeCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  badge: {
    name: string;
    description: string;
    icon: string;
    color: string;
    points_earned?: number;
  } | null;
}

const ConfettiPiece: React.FC<{ piece: ConfettiPiece }> = ({ piece }) => {
  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: piece.x,
          width: piece.size,
          height: piece.size,
          backgroundColor: piece.color,
          transform: [
            { translateY: piece.y },
            { rotate: piece.rotation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            })},
            { scale: piece.scale },
          ],
        },
      ]}
    />
  );
};

export const BadgeCelebrationModal: React.FC<BadgeCelebrationModalProps> = ({
  visible,
  onClose,
  badge,
}) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeRotate = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && badge) {
      // Create confetti pieces
      const pieces: ConfettiPiece[] = [];
      for (let i = 0; i < 50; i++) {
        pieces.push({
          id: i,
          x: Math.random() * SCREEN_WIDTH,
          y: new Animated.Value(-50),
          rotation: new Animated.Value(0),
          scale: new Animated.Value(1),
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: Math.random() * 10 + 5,
        });
      }
      setConfetti(pieces);

      // Animate confetti falling
      pieces.forEach((piece, index) => {
        const delay = Math.random() * 500;
        const duration = 2000 + Math.random() * 1000;

        Animated.parallel([
          Animated.timing(piece.y, {
            toValue: SCREEN_HEIGHT + 100,
            duration,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotation, {
            toValue: 3,
            duration,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Badge entrance animation
      Animated.sequence([
        Animated.parallel([
          Animated.spring(badgeScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(badgeRotate, {
            toValue: 1,
            duration: 600,
            easing: Easing.elastic(1),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulsing glow effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset animations
      badgeScale.setValue(0);
      badgeRotate.setValue(0);
      glowOpacity.setValue(0);
      textOpacity.setValue(0);
      setConfetti([]);
    }
  }, [visible, badge]);

  if (!badge) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti */}
        {confetti.map((piece) => (
          <ConfettiPiece key={piece.id} piece={piece} />
        ))}

        {/* Content */}
        <View style={styles.content}>
          {/* Celebration Header */}
          <Animated.Text style={[styles.celebrationText, { opacity: textOpacity }]}>
            Congratulations!
          </Animated.Text>

          {/* Badge Container with Glow */}
          <Animated.View
            style={[
              styles.glowContainer,
              {
                opacity: glowOpacity,
                shadowColor: badge.color,
                shadowRadius: 30,
                shadowOpacity: 0.8,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.badgeContainer,
                {
                  backgroundColor: badge.color + '20',
                  borderColor: badge.color,
                  transform: [
                    { scale: badgeScale },
                    {
                      rotate: badgeRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name={getBadgeIcon(badge.icon)} size={64} color={badge.color} />
            </Animated.View>
          </Animated.View>

          {/* Badge Name */}
          <Animated.Text style={[styles.badgeName, { opacity: textOpacity, color: badge.color }]}>
            {badge.name}
          </Animated.Text>

          {/* Badge Description */}
          <Animated.Text style={[styles.badgeDescription, { opacity: textOpacity }]}>
            {badge.description}
          </Animated.Text>

          {/* Points Earned */}
          {badge.points_earned && (
            <Animated.View style={[styles.pointsContainer, { opacity: textOpacity }]}>
              <Ionicons name="flash" size={20} color={COLORS.warning} />
              <Text style={styles.pointsText}>+{badge.points_earned} points</Text>
            </Animated.View>
          )}

          {/* Close Button */}
          <Animated.View style={{ opacity: textOpacity }}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Awesome!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },
  content: {
    alignItems: 'center',
    padding: 32,
    maxWidth: 340,
  },
  celebrationText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.star,
    marginBottom: 24,
    textAlign: 'center',
  },
  glowContainer: {
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 24,
  },
  badgeContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  badgeName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 16,
    color: COLORS.surface,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.warning,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

export default BadgeCelebrationModal;
