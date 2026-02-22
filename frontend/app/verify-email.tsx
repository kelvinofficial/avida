import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../src/hooks/useResponsive';
import { API_URL } from '../src/utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#81C784',
  surface: '#FFFFFF',
  background: '#F8FAF8',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E8E8E8',
  error: '#D32F2F',
  success: '#2E7D32',
  gradientStart: '#2E7D32',
  gradientEnd: '#66BB6A',
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { isDesktop, isTablet } = useResponsive();
  
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setIsLargeScreen(window.innerWidth > 768);
      const handleResize = () => setIsLargeScreen(window.innerWidth > 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } else {
      setIsLargeScreen(isDesktop || isTablet);
    }
  }, [isDesktop, isTablet]);
  
  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setVerifying(false);
      setError('No verification token provided');
    }
  }, [token]);
  
  const verifyEmail = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email/${token}`);
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        setVerifiedEmail(data.email || '');
      } else {
        setError(data.detail || 'Failed to verify email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setVerifying(false);
    }
  };
  
  const handleGoToLogin = () => {
    router.replace('/login');
  };
  
  const handleGoHome = () => {
    router.replace('/');
  };
  
  // Loading Screen
  if (verifying) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Verifying your email...</Text>
      </View>
    );
  }
  
  // Success Screen
  if (success) {
    return (
      <View style={isLargeScreen ? desktopStyles.container : styles.container}>
        {isLargeScreen ? (
          <>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={desktopStyles.leftPanel}
            >
              <View style={[styles.decorCircle, styles.circle1]} />
              <View style={[styles.decorCircle, styles.circle2]} />
              <View style={desktopStyles.brandContent}>
                <View style={desktopStyles.logoLarge}>
                  <Ionicons name="storefront" size={48} color="#fff" />
                </View>
                <Text style={desktopStyles.brandTitle}>avida</Text>
                <Text style={desktopStyles.brandSubtitle}>Your local marketplace</Text>
              </View>
            </LinearGradient>
            <View style={desktopStyles.rightPanel}>
              <View style={desktopStyles.successContainer}>
                <View style={desktopStyles.successIcon}>
                  <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                </View>
                <Text style={desktopStyles.successTitle}>Email Verified!</Text>
                <Text style={desktopStyles.successSubtitle}>
                  Your email {verifiedEmail ? `(${verifiedEmail})` : ''} has been verified successfully. You now have full access to all Avida features.
                </Text>
                <View style={desktopStyles.buttonGroup}>
                  <TouchableOpacity style={desktopStyles.primaryBtn} onPress={handleGoHome} testID="verify-go-home-btn">
                    <Ionicons name="home-outline" size={20} color="#fff" />
                    <Text style={desktopStyles.primaryBtnText}>Browse Listings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={desktopStyles.secondaryBtn} onPress={handleGoToLogin} testID="verify-go-login-btn">
                    <Text style={desktopStyles.secondaryBtnText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        ) : (
          <SafeAreaView style={styles.container}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successGradient}
            >
              <View style={styles.successContent}>
                <View style={styles.successIconMobile}>
                  <Ionicons name="checkmark-circle" size={80} color="#fff" />
                </View>
                <Text style={styles.successTitleMobile}>Email Verified!</Text>
                <Text style={styles.successSubtitleMobile}>
                  Your account is now fully activated. Start buying and selling!
                </Text>
                <TouchableOpacity style={styles.successBtn} onPress={handleGoHome}>
                  <Ionicons name="home-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.successBtnText}>Browse Listings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.successBtnSecondary} onPress={handleGoToLogin}>
                  <Text style={styles.successBtnSecondaryText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </SafeAreaView>
        )}
      </View>
    );
  }
  
  // Error Screen
  return (
    <View style={isLargeScreen ? desktopStyles.container : styles.container}>
      {isLargeScreen ? (
        <>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={desktopStyles.leftPanel}
          >
            <View style={[styles.decorCircle, styles.circle1]} />
            <View style={[styles.decorCircle, styles.circle2]} />
            <View style={desktopStyles.brandContent}>
              <View style={desktopStyles.logoLarge}>
                <Ionicons name="storefront" size={48} color="#fff" />
              </View>
              <Text style={desktopStyles.brandTitle}>avida</Text>
              <Text style={desktopStyles.brandSubtitle}>Your local marketplace</Text>
            </View>
          </LinearGradient>
          <View style={desktopStyles.rightPanel}>
            <View style={desktopStyles.errorContainer}>
              <View style={desktopStyles.errorIcon}>
                <Ionicons name="alert-circle" size={80} color={COLORS.error} />
              </View>
              <Text style={desktopStyles.errorTitle}>Verification Failed</Text>
              <Text style={desktopStyles.errorSubtitle}>{error}</Text>
              <View style={desktopStyles.buttonGroup}>
                <TouchableOpacity style={desktopStyles.primaryBtn} onPress={handleGoToLogin}>
                  <Text style={desktopStyles.primaryBtnText}>Go to Login</Text>
                </TouchableOpacity>
              </View>
              <Text style={desktopStyles.helpText}>
                Need a new verification link? Sign in and request one from your profile.
              </Text>
            </View>
          </View>
        </>
      ) : (
        <SafeAreaView style={[styles.container, styles.centerContent]}>
          <View style={styles.errorIconMobile}>
            <Ionicons name="alert-circle" size={72} color={COLORS.error} />
          </View>
          <Text style={styles.errorTitle}>Verification Failed</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.backToLoginBtn} onPress={handleGoToLogin}>
            <Text style={styles.backToLoginText}>Go to Login</Text>
          </TouchableOpacity>
          <Text style={styles.helpTextMobile}>
            Need a new link? Sign in and request from your profile.
          </Text>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 100,
    height: 100,
    bottom: 20,
    left: -30,
  },
  // Success mobile
  successGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  successIconMobile: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitleMobile: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  successSubtitleMobile: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
  },
  successBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  successBtnSecondary: {
    paddingVertical: 14,
  },
  successBtnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  // Error mobile
  errorIconMobile: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  backToLoginBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backToLoginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpTextMobile: {
    marginTop: 20,
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

const desktopStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: '45%',
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  brandContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 1,
  },
  logoLarge: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Success
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 480,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Error
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 480,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  errorSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  helpText: {
    marginTop: 24,
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
