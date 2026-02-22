import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../hooks/useResponsive';

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
  gradientStart: '#2E7D32',
  gradientEnd: '#66BB6A',
};

interface AuthPromptProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  redirectPath?: string;
}

export const AuthPrompt: React.FC<AuthPromptProps> = ({
  title = 'Sign In Required',
  subtitle = 'Sign in to access this feature',
  icon = 'person-circle-outline',
  redirectPath,
}) => {
  const router = useRouter();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const handleSignIn = () => {
    const redirect = redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : '';
    router.push(`/login${redirect}` as any);
  };

  const handleBrowseGuest = () => {
    router.replace('/');
  };

  // Desktop Layout - Split screen like login.tsx
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

        {/* Right Side - Auth Prompt */}
        <View style={desktopStyles.rightPanel}>
          <TouchableOpacity style={desktopStyles.closeBtn} onPress={handleBrowseGuest}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={desktopStyles.formContent}>
            <View style={desktopStyles.iconContainer}>
              <Ionicons name={icon as any} size={64} color={COLORS.primary} />
            </View>
            
            <Text style={desktopStyles.formTitle}>{title}</Text>
            <Text style={desktopStyles.formSubtitle}>{subtitle}</Text>

            <TouchableOpacity
              style={desktopStyles.primaryBtn}
              onPress={handleSignIn}
              data-testid="auth-prompt-sign-in-btn"
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={desktopStyles.primaryBtnText}>Sign In</Text>
            </TouchableOpacity>

            <View style={desktopStyles.divider}>
              <View style={desktopStyles.dividerLine} />
              <Text style={desktopStyles.dividerText}>or</Text>
              <View style={desktopStyles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={desktopStyles.guestBtn} 
              onPress={handleBrowseGuest}
              data-testid="auth-prompt-browse-guest-btn"
            >
              <Ionicons name="compass-outline" size={20} color={COLORS.primary} />
              <Text style={desktopStyles.guestBtnText}>Browse as Guest</Text>
            </TouchableOpacity>

            <Text style={desktopStyles.terms}>
              By continuing, you agree to our{' '}
              <Text style={desktopStyles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={desktopStyles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Mobile Layout - Matching the login screen style
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with gradient background */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.circle1]} />
        <View style={[styles.decorCircle, styles.circle2]} />

        {/* Header Content */}
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name={icon as any} size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
      </LinearGradient>

      {/* Content Card */}
      <View style={styles.contentCard}>
        <View style={styles.scrollContent}>
          {/* Features */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>Secure transactions</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="location" size={20} color="#1976D2" />
              </View>
              <Text style={styles.featureText}>Local listings nearby</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="chatbubbles" size={20} color="#F57C00" />
              </View>
              <Text style={styles.featureText}>Direct messaging</Text>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSignIn}
            activeOpacity={0.9}
            data-testid="auth-prompt-sign-in-btn-mobile"
          >
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>

          {/* Browse as Guest */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleBrowseGuest}
            activeOpacity={0.7}
            data-testid="auth-prompt-browse-guest-btn-mobile"
          >
            <Ionicons name="compass-outline" size={20} color={COLORS.primary} />
            <Text style={styles.guestButtonText}>Browse as Guest</Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to our{'\n'}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    minHeight: SCREEN_HEIGHT * 0.30,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    position: 'relative',
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
  circle3: {
    width: 150,
    height: 150,
    bottom: 100,
    right: -40,
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
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: 20,
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
    paddingBottom: 100,
  },
  featuresList: {
    gap: 12,
    marginBottom: 28,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
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
  },
});

// Desktop styles
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
  formContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 420,
    width: '100%',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
    width: '100%',
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
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    width: '100%',
  },
  guestBtnText: {
    fontSize: 15,
    fontWeight: '600',
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

export default AuthPrompt;
