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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { isDesktop, isTablet } = useResponsive();
  
  const [isClient, setIsClient] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
  
  // Verify token on mount
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setVerifying(false);
      setError('No reset token provided');
    }
  }, [token]);
  
  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-reset-token/${token}`);
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setTokenValid(true);
        setEmail(data.email);
      } else {
        setError(data.detail || 'Invalid or expired reset link');
      }
    } catch (err) {
      setError('Failed to verify reset link. Please try again.');
    } finally {
      setVerifying(false);
    }
  };
  
  const handleResetPassword = async () => {
    setError(null);
    
    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.detail || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoToLogin = () => {
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
                  <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
                </View>
                <Text style={desktopStyles.successTitle}>Password Reset!</Text>
                <Text style={desktopStyles.successSubtitle}>
                  Your password has been successfully reset. You can now sign in with your new password.
                </Text>
                <TouchableOpacity style={desktopStyles.primaryBtn} onPress={handleGoToLogin}>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={desktopStyles.primaryBtnText}>Sign In</Text>
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
                  <Ionicons name="checkmark-circle" size={72} color="#fff" />
                </View>
                <Text style={styles.successTitleMobile}>Password Reset!</Text>
                <Text style={styles.successSubtitleMobile}>
                  Your password has been successfully reset.
                </Text>
                <TouchableOpacity style={styles.successBtn} onPress={handleGoToLogin}>
                  <Ionicons name="log-in-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.successBtnText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </SafeAreaView>
        )}
      </View>
    );
  }
  
  // Loading/Verifying Screen
  if (verifying) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Verifying reset link...</Text>
      </View>
    );
  }
  
  // Invalid Token Screen
  if (!tokenValid) {
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
                  <Ionicons name="alert-circle" size={64} color={COLORS.error} />
                </View>
                <Text style={desktopStyles.errorTitle}>Invalid Link</Text>
                <Text style={desktopStyles.errorSubtitle}>{error}</Text>
                <TouchableOpacity style={desktopStyles.primaryBtn} onPress={() => router.replace('/login')}>
                  <Text style={desktopStyles.primaryBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <SafeAreaView style={[styles.container, styles.centerContent]}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={64} color={COLORS.error} />
            </View>
            <Text style={styles.errorTitle}>{error}</Text>
            <TouchableOpacity style={styles.backToLoginBtn} onPress={() => router.replace('/login')}>
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </View>
    );
  }
  
  // Desktop Reset Form
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
          <TouchableOpacity style={desktopStyles.closeBtn} onPress={() => router.replace('/login')}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <ScrollView style={desktopStyles.formScroll} contentContainerStyle={desktopStyles.formContent}>
            <View style={desktopStyles.formIcon}>
              <Ionicons name="key-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={desktopStyles.formTitle}>Reset Password</Text>
            <Text style={desktopStyles.formSubtitle}>
              Create a new password for {email}
            </Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            <View style={desktopStyles.inputGroup}>
              <Text style={desktopStyles.inputLabel}>New Password</Text>
              <View style={desktopStyles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={desktopStyles.input}
                  placeholder="Enter new password (min 6 chars)"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="reset-password-input"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={desktopStyles.inputGroup}>
              <Text style={desktopStyles.inputLabel}>Confirm Password</Text>
              <View style={desktopStyles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={desktopStyles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor={COLORS.textLight}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  testID="reset-confirm-password-input"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity
              style={desktopStyles.primaryBtn}
              onPress={handleResetPassword}
              disabled={loading}
              testID="reset-password-submit-btn"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={desktopStyles.primaryBtnText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    );
  }
  
  // Mobile Reset Form
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
        <TouchableOpacity style={styles.closeButton} onPress={() => router.replace('/login')}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={[styles.decorCircle, styles.circle1]} />
        <View style={[styles.decorCircle, styles.circle2]} />
        
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="key-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <Text style={styles.headerSubtitle}>Create a new password</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.contentCard}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <Text style={styles.emailLabel}>Resetting password for:</Text>
          <Text style={styles.emailValue}>{email}</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password (min 6 chars)"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.textLight}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Reset Password</Text>
              </>
            )}
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
    right: 20,
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
  emailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 24,
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
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
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
  eyeButton: {
    padding: 8,
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
  // Success screen mobile styles
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
  // Success/Error screens
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 400,
  },
  successIcon: {
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
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 400,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  errorSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
});
