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
  gradientStart: '#1565C0',
  gradientEnd: '#42A5F5',
};

export default function RegisterScreen() {
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

  const handleGoogleSignUp = async () => {
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
      console.error('Sign up error:', err);
      setError('Sign up failed. Please try again.');
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

        {/* Illustration - People connecting */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustration}>
            {/* Person Cards */}
            <View style={styles.personCard}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.personLines}>
                <View style={styles.personLine} />
                <View style={[styles.personLine, { width: '60%' }]} />
              </View>
            </View>
            
            <View style={[styles.personCard, styles.personCard2]}>
              <View style={[styles.avatarCircle, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="person" size={24} color={COLORS.gradientStart} />
              </View>
              <View style={styles.personLines}>
                <View style={styles.personLine} />
                <View style={[styles.personLine, { width: '50%' }]} />
              </View>
            </View>

            {/* Connection line */}
            <View style={styles.connectionLine} />
            
            {/* Floating elements */}
            <View style={[styles.floatingIcon, styles.floatingIcon1]}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
            </View>
            <View style={[styles.floatingIcon, styles.floatingIcon2]}>
              <Ionicons name="star" size={16} color="#FFB800" />
            </View>
            <View style={[styles.floatingIcon, styles.floatingIcon3]}>
              <Ionicons name="gift" size={16} color="#E91E63" />
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
            <Text style={styles.welcomeTitle}>Create Your Account</Text>
            <Text style={styles.welcomeSubtitle}>
              Join thousands of buyers and sellers in your area
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="storefront-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Post Free Listings</Text>
                <Text style={styles.benefitDesc}>Sell items without any fees</Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="chatbubbles-outline" size={20} color={COLORS.gradientStart} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Direct Messaging</Text>
                <Text style={styles.benefitDesc}>Chat safely with buyers</Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="heart-outline" size={20} color="#F57C00" />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Save Favorites</Text>
                <Text style={styles.benefitDesc}>Never miss a great deal</Text>
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

          {/* Google Sign Up Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignUp}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <View style={styles.googleIconContainer}>
                  <Image
                    source={{ uri: 'https://www.google.com/favicon.ico' }}
                    style={styles.googleIcon}
                  />
                </View>
                <Text style={styles.googleButtonText}>Sign up with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Already have account */}
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By signing up, you agree to our{'\n'}
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
    height: SCREEN_HEIGHT * 0.38,
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
    width: 180,
    height: 180,
    top: -40,
    left: -40,
  },
  circle2: {
    width: 120,
    height: 120,
    bottom: 30,
    right: -20,
  },
  circle3: {
    width: 60,
    height: 60,
    top: 80,
    right: 80,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
  },
  illustration: {
    position: 'relative',
    alignItems: 'center',
    width: 200,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    width: 160,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 12,
  },
  personCard2: {
    marginLeft: 40,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personLines: {
    flex: 1,
    gap: 6,
  },
  personLine: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    width: '80%',
  },
  connectionLine: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    top: '50%',
    marginTop: -10,
    left: '50%',
    marginLeft: -1,
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
    top: 10,
    right: -10,
  },
  floatingIcon2: {
    top: 50,
    left: -15,
  },
  floatingIcon3: {
    bottom: 10,
    right: 10,
  },
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 28,
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
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 14,
    gap: 14,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
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
    backgroundColor: COLORS.gradientStart,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: COLORS.gradientStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  loginPromptText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginLink: {
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
