import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isDesktop, isTablet } = useResponsive();
  
  const [isClient, setIsClient] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    setIsClient(true);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setIsLargeScreen(window.innerWidth > 768);
      const handleResize = () => setIsLargeScreen(window.innerWidth > 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } else {
      setIsLargeScreen(isDesktop || isTablet);
    }
  }, [isDesktop, isTablet]);
  
  const handleForgotPassword = async () => {
    setError(null);
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.detail || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBackToLogin = () => {
    router.replace('/login');
  };
  
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
                  <Ionicons name="mail-outline" size={64} color={COLORS.primary} />
                </View>
                <Text style={desktopStyles.successTitle}>Check Your Email</Text>
                <Text style={desktopStyles.successSubtitle}>
                  If an account exists for {email}, you&apos;ll receive a password reset link shortly. Please check your inbox and spam folder.
                </Text>
                <TouchableOpacity style={desktopStyles.primaryBtn} onPress={handleBackToLogin}>
                  <Ionicons name="arrow-back-outline" size={20} color="#fff" />
                  <Text style={desktopStyles.primaryBtnText}>Back to Login</Text>
                </TouchableOpacity>
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
                  <Ionicons name="mail-outline" size={72} color="#fff" />
                </View>
                <Text style={styles.successTitleMobile}>Check Your Email</Text>
                <Text style={styles.successSubtitleMobile}>
                  If an account exists, you&apos;ll receive a password reset link shortly.
                </Text>
                <TouchableOpacity style={styles.successBtn} onPress={handleBackToLogin}>
                  <Ionicons name="arrow-back-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.successBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </SafeAreaView>
        )}
      </View>
    );
  }
  
  // Desktop Form
  if (isLargeScreen) {
    return (
      <View style={desktopStyles.container}>
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
          <TouchableOpacity style={desktopStyles.closeBtn} onPress={handleBackToLogin}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <ScrollView style={desktopStyles.formScroll} contentContainerStyle={desktopStyles.formContent}>
            <View style={desktopStyles.formIcon}>
              <Ionicons name="key-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={desktopStyles.formTitle}>Forgot Password?</Text>
            <Text style={desktopStyles.formSubtitle}>
              No worries! Enter your email and we&apos;ll send you a link to reset your password.
            </Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            <View style={desktopStyles.inputGroup}>
              <Text style={desktopStyles.inputLabel}>Email Address</Text>
              <View style={desktopStyles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={desktopStyles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="forgot-password-email-input"
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={desktopStyles.primaryBtn}
              onPress={handleForgotPassword}
              disabled={loading}
              testID="forgot-password-submit-btn"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={desktopStyles.primaryBtnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={desktopStyles.backLink} onPress={handleBackToLogin}>
              <Ionicons name="arrow-back-outline" size={18} color={COLORS.primary} />
              <Text style={desktopStyles.backLinkText}>Back to Login</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    );
  }
  
  // Mobile Form
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity style={styles.closeButton} onPress={handleBackToLogin}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={[styles.decorCircle, styles.circle1]} />
        <View style={[styles.decorCircle, styles.circle2]} />
        
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="key-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Forgot Password?</Text>
          <Text style={styles.headerSubtitle}>We'll help you reset it</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.contentCard}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.infoText}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleForgotPassword}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.backLink} onPress={handleBackToLogin}>
            <Ionicons name="arrow-back-outline" size={18} color={COLORS.primary} />
            <Text style={styles.backLinkText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    minHeight: SCREEN_HEIGHT * 0.28,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
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
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.text,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Success screen mobile
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitleMobile: {
    fontSize: 28,
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
  },
  successBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
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
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  formScroll: {
    width: '100%',
    maxWidth: 420,
  },
  formContent: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  formIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: COLORS.text,
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
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Success screen
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 420,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
});
