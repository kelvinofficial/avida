import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
  ScrollView,
  Linking,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, saveUserData } from '../src/store/authStore';
import { authApi } from '../src/utils/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../src/hooks/useResponsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// URLs for Terms and Privacy
const TERMS_URL = 'https://www.emergentagent.com/terms';
const PRIVACY_URL = 'https://www.emergentagent.com/privacy';

const COLORS = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#81C784',
  accent: '#4CAF50',
  surface: '#FFFFFF',
  background: '#F8FAF8',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E8E8E8',
  error: '#D32F2F',
  google: '#4285F4',
  gradientStart: '#2E7D32',
  gradientEnd: '#66BB6A',
};

export default function LoginScreen() {
  const router = useRouter();
  const { signedOut, redirect } = useLocalSearchParams<{ signedOut?: string; redirect?: string }>();
  const { setUser, setToken } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  // Determine where to redirect after successful login
  const redirectAfterLogin = redirect || '/';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(signedOut === 'true');
  
  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');

  const handleClose = () => {
    router.replace('/');
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open link');
    }
  };

  const handleTermsPress = () => {
    openLink(TERMS_URL);
  };

  const handlePrivacyPress = () => {
    openLink(PRIVACY_URL);
  };

  // Email/Password Login
  const handleEmailLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authApi.login(email.trim(), password);
      if (result.user && result.session_token) {
        await setToken(result.session_token);
        setUser(result.user);
        await saveUserData(result.user);
        router.replace(redirectAfterLogin as any);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Registration
  const handleEmailRegister = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authApi.register(email.trim(), password, name.trim());
      if (result.user && result.session_token) {
        await setToken(result.session_token);
        setUser(result.user);
        await saveUserData(result.user);
        Alert.alert('Success', 'Account created successfully!');
        router.replace('/');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const redirectUrl = Platform.OS === 'web'
        ? `${BACKEND_URL}/`
        : ExpoLinking.createURL('/');

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

        if (result.type === 'success' && result.url) {
          const urlMatch = result.url.match(/[#?]session_id=([^&]+)/);
          if (urlMatch) {
            const sessionId = urlMatch[1];
            await exchangeSession(sessionId);
          }
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exchangeSession = async (sessionId: string) => {
    try {
      const result = await authApi.exchangeSession(sessionId);
      if (result.user && result.session_token) {
        await setToken(result.session_token);
        setUser(result.user);
        await saveUserData(result.user);
        router.replace('/');
      }
    } catch (err) {
      console.error('Session exchange error:', err);
      setError('Authentication failed. Please try again.');
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  // Welcome Back screen shown after sign out
  if (showWelcomeBack) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeBackGradient}
        >
          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.circle1]} />
          <View style={[styles.decorCircle, styles.circle2]} />
          <View style={[styles.decorCircle, styles.circle3]} />

          {/* Content */}
          <View style={styles.welcomeBackContent}>
            <View style={styles.welcomeIconContainer}>
              <Ionicons name="hand-right" size={48} color="#fff" />
            </View>
            <Text style={styles.welcomeBackTitle}>See You Soon!</Text>
            <Text style={styles.welcomeBackSubtitle}>
              You've been signed out successfully.{'\n'}Come back anytime!
            </Text>

            {/* Sign In Options */}
            <View style={styles.welcomeBackOptions}>
              <TouchableOpacity 
                style={styles.welcomeBackPrimaryBtn}
                onPress={() => setShowWelcomeBack(false)}
              >
                <Ionicons name="log-in-outline" size={22} color={COLORS.primary} />
                <Text style={styles.welcomeBackPrimaryBtnText}>Sign In Again</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.welcomeBackGoogleBtn}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Image 
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIconSmall}
                />
                <Text style={styles.welcomeBackGoogleBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.welcomeBackSecondaryBtn}
                onPress={handleClose}
              >
                <Ionicons name="home-outline" size={20} color="#fff" />
                <Text style={styles.welcomeBackSecondaryBtnText}>Browse as Guest</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* App branding */}
          <View style={styles.welcomeBackFooter}>
            <View style={styles.welcomeBackBrand}>
              <Ionicons name="storefront" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.welcomeBackBrandText}>avida marketplace</Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ============ DESKTOP VIEW ============
  if (isLargeScreen) {
    return (
      <View style={desktopStyles.container}>
        {/* Left Side - Branding */}
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={desktopStyles.leftPanel}
        >
          <View style={[styles.decorCircle, styles.circle1]} />
          <View style={[styles.decorCircle, styles.circle2]} />
          <View style={[styles.decorCircle, styles.circle3]} />
          
          <View style={desktopStyles.brandContent}>
            <View style={desktopStyles.logoLarge}>
              <Ionicons name="storefront" size={48} color="#fff" />
            </View>
            <Text style={desktopStyles.brandTitle}>avida</Text>
            <Text style={desktopStyles.brandSubtitle}>Your local marketplace</Text>
            
            <View style={desktopStyles.featuresList}>
              <View style={desktopStyles.featureItem}>
                <View style={desktopStyles.featureIcon}>
                  <Ionicons name="shield-checkmark" size={20} color="#fff" />
                </View>
                <Text style={desktopStyles.featureText}>Secure transactions</Text>
              </View>
              <View style={desktopStyles.featureItem}>
                <View style={desktopStyles.featureIcon}>
                  <Ionicons name="location" size={20} color="#fff" />
                </View>
                <Text style={desktopStyles.featureText}>Local listings nearby</Text>
              </View>
              <View style={desktopStyles.featureItem}>
                <View style={desktopStyles.featureIcon}>
                  <Ionicons name="chatbubbles" size={20} color="#fff" />
                </View>
                <Text style={desktopStyles.featureText}>Direct messaging</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Right Side - Form */}
        <View style={desktopStyles.rightPanel}>
          <TouchableOpacity style={desktopStyles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <ScrollView 
            style={desktopStyles.formScroll}
            contentContainerStyle={desktopStyles.formContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={desktopStyles.formTitle}>
              {isLoginMode ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={desktopStyles.formSubtitle}>
              {isLoginMode 
                ? 'Sign in to continue to your account' 
                : 'Join avida marketplace today'}
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!isLoginMode && (
              <View style={desktopStyles.inputGroup}>
                <Text style={desktopStyles.inputLabel}>Full Name</Text>
                <View style={desktopStyles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
                  <TextInput
                    style={desktopStyles.input}
                    placeholder="Enter your name"
                    placeholderTextColor={COLORS.textLight}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
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
                />
              </View>
            </View>

            <View style={desktopStyles.inputGroup}>
              <Text style={desktopStyles.inputLabel}>Password</Text>
              <View style={desktopStyles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={desktopStyles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
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

            <TouchableOpacity
              style={desktopStyles.primaryBtn}
              onPress={isLoginMode ? handleEmailLogin : handleEmailRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={desktopStyles.primaryBtnText}>
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={desktopStyles.divider}>
              <View style={desktopStyles.dividerLine} />
              <Text style={desktopStyles.dividerText}>or continue with</Text>
              <View style={desktopStyles.dividerLine} />
            </View>

            <TouchableOpacity style={desktopStyles.googleBtn} onPress={handleGoogleLogin} disabled={loading}>
              <Image
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                style={desktopStyles.googleIcon}
              />
              <Text style={desktopStyles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={desktopStyles.guestBtn} onPress={() => router.replace('/')}>
              <Ionicons name="compass-outline" size={20} color={COLORS.primary} />
              <Text style={desktopStyles.guestBtnText}>Browse as Guest</Text>
            </TouchableOpacity>

            <View style={desktopStyles.toggleRow}>
              <Text style={desktopStyles.toggleText}>
                {isLoginMode ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <TouchableOpacity onPress={toggleMode}>
                <Text style={desktopStyles.toggleLink}>
                  {isLoginMode ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={desktopStyles.terms}>
              By continuing, you agree to our{' '}
              <Text style={desktopStyles.termsLink} onPress={handleTermsPress}>Terms of Service</Text> and{' '}
              <Text style={desktopStyles.termsLink} onPress={handlePrivacyPress}>Privacy Policy</Text>
            </Text>
          </ScrollView>
        </View>
      </View>
    );
  }

  // ============ MOBILE VIEW ============
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header with gradient background */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.circle1]} />
        <View style={[styles.decorCircle, styles.circle2]} />

        {/* Header Content */}
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="storefront" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>
            {isLoginMode ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isLoginMode 
              ? 'Sign in to continue to avida' 
              : 'Join avida marketplace today'}
          </Text>
        </View>
      </LinearGradient>

      {/* Content Card */}
      <View style={styles.contentCard}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Name Input (Register only) */}
          {!isLoginMode && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.textLight}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Email Input */}
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

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={isLoginMode ? "Enter your password" : "Create a password (min 6 chars)"}
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login/Register Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={isLoginMode ? handleEmailLogin : handleEmailRegister}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons 
                  name={isLoginMode ? "log-in-outline" : "person-add-outline"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.primaryButtonText}>
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            <View style={styles.googleIconContainer}>
              <Image
                source={{ uri: 'https://www.google.com/favicon.ico' }}
                style={styles.googleIcon}
              />
            </View>
            <Text style={styles.googleButtonText}>Google</Text>
          </TouchableOpacity>

          {/* Browse as Guest */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}
          >
            <Ionicons name="compass-outline" size={20} color={COLORS.primary} />
            <Text style={styles.guestButtonText}>Browse as Guest</Text>
          </TouchableOpacity>

          {/* Toggle Login/Register */}
          <View style={styles.togglePrompt}>
            <Text style={styles.togglePromptText}>
              {isLoginMode ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.toggleLink}>
                {isLoginMode ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to our{'\n'}
            <Text style={styles.termsLink} onPress={handleTermsPress}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink} onPress={handlePrivacyPress}>Privacy Policy</Text>
          </Text>
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
    height: SCREEN_HEIGHT * 0.28,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 13,
    color: COLORS.textLight,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 12,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  togglePrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  togglePromptText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  terms: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Welcome Back Screen Styles
  welcomeBackGradient: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  circle3: {
    width: 150,
    height: 150,
    bottom: 100,
    right: -40,
  },
  welcomeBackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeBackTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeBackSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  welcomeBackOptions: {
    width: '100%',
    gap: 12,
  },
  welcomeBackPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeBackPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  welcomeBackGoogleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 16,
    borderRadius: 14,
  },
  welcomeBackGoogleBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  googleIconSmall: {
    width: 20,
    height: 20,
  },
  welcomeBackSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  welcomeBackSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  welcomeBackFooter: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  welcomeBackBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeBackBrandText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
});

// ============ DESKTOP STYLES ============
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
    marginBottom: 40,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
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
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
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
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  guestBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  terms: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});
