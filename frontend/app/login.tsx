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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, saveUserData } from '../src/store/authStore';
import { authApi } from '../src/utils/api';
import { LinearGradient } from 'expo-linear-gradient';

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
  const { setUser, setToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    // Always navigate to home - simpler and more reliable
    router.replace('/');
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to WebBrowser
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

  return (
    <View style={styles.container}>
      {/* Header with gradient background */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Close Button - Fixed position */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.circle1]} />
        <View style={[styles.decorCircle, styles.circle2]} />
        <View style={[styles.decorCircle, styles.circle3]} />

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustration}>
            <View style={styles.phoneFrame}>
              <View style={styles.phoneNotch} />
              <View style={styles.phoneContent}>
                <View style={styles.miniCard}>
                  <View style={styles.miniCardImage} />
                  <View style={styles.miniCardLines}>
                    <View style={styles.miniLine} />
                    <View style={[styles.miniLine, { width: '60%' }]} />
                  </View>
                </View>
                <View style={styles.miniCard}>
                  <View style={styles.miniCardImage} />
                  <View style={styles.miniCardLines}>
                    <View style={styles.miniLine} />
                    <View style={[styles.miniLine, { width: '50%' }]} />
                  </View>
                </View>
              </View>
            </View>
            {/* Floating elements */}
            <View style={[styles.floatingIcon, styles.floatingIcon1]}>
              <Ionicons name="heart" size={16} color={COLORS.error} />
            </View>
            <View style={[styles.floatingIcon, styles.floatingIcon2]}>
              <Ionicons name="chatbubble" size={14} color={COLORS.google} />
            </View>
            <View style={[styles.floatingIcon, styles.floatingIcon3]}>
              <Ionicons name="pricetag" size={14} color={COLORS.accent} />
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Content Card */}
      <View style={styles.contentCard}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome to</Text>
            <View style={styles.brandRow}>
              <View style={styles.logoIcon}>
                <Ionicons name="storefront" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.brandName}>avida</Text>
            </View>
            <Text style={styles.welcomeSubtitle}>
              Your neighborhood marketplace for buying and selling
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#1976D2" />
                </View>
                <Text style={styles.featureText}>Secure</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="flash" size={20} color="#F57C00" />
                </View>
                <Text style={styles.featureText}>Fast</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="cash" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.featureText}>Free</Text>
              </View>
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <View style={styles.googleIconContainer}>
                  <Image
                    source={{ uri: 'https://www.google.com/favicon.ico' }}
                    style={styles.googleIcon}
                  />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Browse as Guest */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}
          >
            <Ionicons name="compass-outline" size={20} color={COLORS.primary} />
            <Text style={styles.guestButtonText}>Browse as Guest</Text>
          </TouchableOpacity>

          {/* Create Account Link */}
          <View style={styles.signupPrompt}>
            <Text style={styles.signupPromptText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    height: SCREEN_HEIGHT * 0.42,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 150,
    height: 150,
    bottom: 50,
    left: -30,
  },
  circle3: {
    width: 80,
    height: 80,
    top: 100,
    left: 50,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  illustration: {
    position: 'relative',
    alignItems: 'center',
  },
  phoneFrame: {
    width: 140,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  phoneNotch: {
    width: 50,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
  },
  phoneContent: {
    flex: 1,
    gap: 8,
  },
  miniCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  miniCardImage: {
    width: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  miniCardLines: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  miniLine: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    width: '80%',
  },
  floatingIcon: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingIcon1: {
    top: -10,
    right: -25,
  },
  floatingIcon2: {
    bottom: 40,
    left: -30,
  },
  floatingIcon3: {
    bottom: -5,
    right: -20,
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
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  signupPromptText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signupLink: {
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
});
