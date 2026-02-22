/**
 * Premium Animated Splash Screen
 * Features:
 * - Smooth fade-in animations
 * - Pulsing logo effect
 * - Animated loading dots
 * - Professional gradient background
 * - Staggered text animations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationComplete?: () => void;
}

const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  onAnimationComplete,
}) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  const shimmerPosition = useRef(new Animated.Value(-width)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Dot animations
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations sequence
    const animationSequence = Animated.sequence([
      // Phase 1: Logo appears with scale and rotation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: App name slides up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 3: Tagline appears
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(taglineTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 4: Loading dots appear
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start();

    // Pulse animation for logo (continuous)
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Loading dots animation (continuous)
    const dotsAnimation = Animated.loop(
      Animated.stagger(200, [
        Animated.sequence([
          Animated.timing(dot1, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot1, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    dotsAnimation.start();

    // Shimmer effect (continuous)
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: width,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();

    // Notify parent when initial animation is complete
    const timer = setTimeout(() => {
      onAnimationComplete?.();
    }, 2500);

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
      dotsAnimation.stop();
      shimmerAnimation.stop();
    };
  }, []);

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#43A047']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />

        {/* Main content */}
        <View style={styles.content}>
          {/* Animated Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: Animated.multiply(logoScale, pulseAnim) },
                  { rotate: logoRotation },
                ],
              },
            ]}
          >
            <View style={styles.logoInner}>
              <Ionicons name="storefront" size={60} color="#fff" />
            </View>
            {/* Shimmer effect */}
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerPosition }],
                },
              ]}
            />
          </Animated.View>

          {/* App Name */}
          <Animated.View
            style={{
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            }}
          >
            <Text style={styles.appName}>avida</Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View
            style={{
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            }}
          >
            <Text style={styles.tagline}>Buy & Sell Locally</Text>
          </Animated.View>

          {/* Loading Dots */}
          <Animated.View style={[styles.dotsContainer, { opacity: dotsOpacity }]}>
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dot1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dot1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.3],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dot2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dot2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.3],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dot3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dot3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.3],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>
        </View>

        {/* Bottom branding */}
        <View style={styles.bottomBranding}>
          <Text style={styles.bottomText}>Tanzania's Marketplace</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: -50,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    top: '40%',
    left: -75,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 50,
    transform: [{ skewX: '-20deg' }],
  },
  appName: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    letterSpacing: 1,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  bottomBranding: {
    position: 'absolute',
    bottom: 60,
  },
  bottomText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

export default AnimatedSplashScreen;
