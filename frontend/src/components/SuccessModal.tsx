import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface BoostPackage {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  features: string[];
}

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  buttonText?: string;
  onClose: () => void;
  listingId?: string;
  showBoostOption?: boolean;
  boostPackages?: BoostPackage[];
  onBoostSelect?: (packageId: string) => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title = 'Success!',
  message = 'Your listing has been published successfully!',
  buttonText = 'View Listings',
  onClose,
  listingId,
  showBoostOption = true,
  boostPackages = [],
  onBoostSelect,
}) => {
  const [showBoost, setShowBoost] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkRotate = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  // Default boost packages if none provided
  const defaultBoostPackages: BoostPackage[] = [
    { id: 'basic', name: 'Basic Boost', duration_days: 3, price: 2.99, features: ['3x more views', 'Priority placement'] },
    { id: 'standard', name: 'Standard Boost', duration_days: 7, price: 4.99, features: ['5x more views', 'Top of category', 'Featured badge'] },
    { id: 'premium', name: 'Premium Boost', duration_days: 14, price: 9.99, features: ['10x more views', 'Homepage feature', 'Premium badge', 'Social promotion'] },
  ];

  const packages = boostPackages.length > 0 ? boostPackages : defaultBoostPackages;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      checkmarkScale.setValue(0);
      checkmarkRotate.setValue(0);
      confettiAnim.setValue(0);

      // Start animation sequence
      Animated.sequence([
        // Fade in and scale up modal
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Animate checkmark with bounce and rotation
        Animated.parallel([
          Animated.spring(checkmarkScale, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(checkmarkRotate, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Confetti burst
        Animated.spring(confettiAnim, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const rotateInterpolate = checkmarkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  // Confetti particles
  const renderConfetti = () => {
    const particles = [];
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * 2 * Math.PI;
      const distance = 80 + Math.random() * 40;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const size = 8 + Math.random() * 8;
      const color = colors[i % colors.length];
      
      particles.push(
        <Animated.View
          key={i}
          style={[
            styles.confettiParticle,
            {
              backgroundColor: color,
              width: size,
              height: size,
              borderRadius: Math.random() > 0.5 ? size / 2 : 2,
              transform: [
                {
                  translateX: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, x],
                  }),
                },
                {
                  translateY: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, y],
                  }),
                },
                {
                  scale: confettiAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1.2, 0.8],
                  }),
                },
                {
                  rotate: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${Math.random() * 360}deg`],
                  }),
                },
              ],
              opacity: confettiAnim.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [0, 1, 1, 0.3],
              }),
            },
          ]}
        />
      );
    }
    return particles;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Confetti container */}
          <View style={styles.confettiContainer}>
            {renderConfetti()}
          </View>

          {/* Success checkmark circle */}
          <Animated.View
            style={[
              styles.checkmarkCircle,
              {
                transform: [
                  { scale: checkmarkScale },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          >
            <Ionicons name="checkmark" size={48} color="#fff" />
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Celebration text */}
          <View style={styles.celebrationRow}>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.celebrationText}>Congratulations!</Text>
            <Text style={styles.emoji}>🎉</Text>
          </View>

          {/* Boost Section */}
          {showBoostOption && !showBoost && (
            <View style={styles.boostSection}>
              <View style={styles.boostDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.boostDividerText}>Want more visibility?</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity
                style={styles.boostButton}
                onPress={() => setShowBoost(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="rocket" size={20} color="#fff" />
                <Text style={styles.boostButtonText}>Boost Your Listing</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Boost Packages */}
          {showBoost && (
            <View style={styles.boostPackages}>
              <Text style={styles.boostTitle}>Choose a Boost Package</Text>
              {packages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    selectedPackage === pkg.id && styles.packageCardSelected,
                  ]}
                  onPress={() => setSelectedPackage(pkg.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packagePrice}>${pkg.price}</Text>
                  </View>
                  <Text style={styles.packageDuration}>{pkg.duration_days} days</Text>
                  <View style={styles.packageFeatures}>
                    {pkg.features.map((feature, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
              
              <View style={styles.boostActions}>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.skipButtonText}>Skip for now</Text>
                </TouchableOpacity>
                
                {selectedPackage && (
                  <TouchableOpacity
                    style={styles.purchaseButton}
                    onPress={() => {
                      if (onBoostSelect) {
                        onBoostSelect(selectedPackage);
                      }
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.purchaseButtonText}>Purchase Boost</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Action button - only show when not showing boost options */}
          {!showBoost && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{buttonText}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: width - 48,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  confettiContainer: {
    position: 'absolute',
    top: 80,
    left: '50%',
    width: 0,
    height: 0,
  },
  confettiParticle: {
    position: 'absolute',
  },
  checkmarkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  emoji: {
    fontSize: 24,
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
    width: '100%',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  // Boost section styles
  boostSection: {
    width: '100%',
    marginTop: 16,
    marginBottom: 8,
  },
  boostDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  boostDividerText: {
    marginHorizontal: 12,
    color: '#666',
    fontSize: 13,
  },
  boostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  boostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  boostPackages: {
    width: '100%',
    marginTop: 8,
  },
  boostTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  packageCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageCardSelected: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF8F3',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B00',
  },
  packageDuration: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  packageFeatures: {
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  featureText: {
    fontSize: 13,
    color: '#555',
  },
  boostActions: {
    marginTop: 8,
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 15,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SuccessModal;
