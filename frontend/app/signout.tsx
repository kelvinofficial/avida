import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useResponsive } from '../src/hooks/useResponsive';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  warning: '#FFF3E0',
  warningText: '#E65100',
};

export default function SignOutScreen() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logout();
      router.replace('/login?signedOut=true');
    } catch (error) {
      console.error('Sign out error:', error);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // ============ DESKTOP VIEW ============
  if (isLargeScreen) {
    return (
      <View style={desktopStyles.container}>
        {/* Desktop Header */}
        <View style={desktopStyles.header}>
          <View style={desktopStyles.headerInner}>
            <TouchableOpacity style={desktopStyles.logoContainer} onPress={() => router.push('/')}>
              <View style={desktopStyles.logoIcon}>
                <Ionicons name="storefront" size={22} color="#fff" />
              </View>
              <Text style={desktopStyles.logoText}>avida</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={desktopStyles.mainContent}>
          <View style={desktopStyles.card}>
            {/* Icon */}
            <View style={desktopStyles.iconContainer}>
              <Ionicons name="log-out-outline" size={48} color={COLORS.primary} />
            </View>

            {/* Title */}
            <Text style={desktopStyles.title}>Sign Out</Text>
            <Text style={desktopStyles.subtitle}>
              Are you sure you want to sign out of your account?
            </Text>

            {/* User Info */}
            {user && (
              <View style={desktopStyles.userInfoCard}>
                <View style={desktopStyles.avatarContainer}>
                  {user.profile_picture ? (
                    <View style={desktopStyles.avatar}>
                      <Text style={desktopStyles.avatarText}>
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  ) : (
                    <View style={desktopStyles.avatar}>
                      <Text style={desktopStyles.avatarText}>
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={desktopStyles.userDetails}>
                  <Text style={desktopStyles.userName}>{user.name || 'User'}</Text>
                  <Text style={desktopStyles.userEmail}>{user.email}</Text>
                </View>
              </View>
            )}

            {/* Warning Message */}
            <View style={desktopStyles.warningBox}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.warningText} />
              <Text style={desktopStyles.warningText}>
                You will need to sign in again to access your listings, messages, and saved items.
              </Text>
            </View>

            {/* Buttons */}
            <View style={desktopStyles.buttonContainer}>
              <TouchableOpacity 
                style={desktopStyles.cancelButton} 
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={desktopStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[desktopStyles.signOutButton, loading && desktopStyles.buttonDisabled]} 
                onPress={handleSignOut}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={20} color="#fff" />
                    <Text style={desktopStyles.signOutButtonText}>Sign Out</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Additional Links */}
            <View style={desktopStyles.linksContainer}>
              <TouchableOpacity onPress={() => router.push('/help')}>
                <Text style={desktopStyles.linkText}>Need help?</Text>
              </TouchableOpacity>
              <Text style={desktopStyles.linkDivider}>•</Text>
              <TouchableOpacity onPress={() => router.push('/settings')}>
                <Text style={desktopStyles.linkText}>Back to Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ============ MOBILE VIEW ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign Out</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="log-out-outline" size={56} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Sign Out</Text>
        <Text style={styles.subtitle}>
          Are you sure you want to sign out of your account?
        </Text>

        {/* User Info */}
        {user && (
          <View style={styles.userInfoCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        {/* Warning */}
        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.warningText} />
          <Text style={styles.warningText}>
            You will need to sign in again to access your account.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.signOutButton, loading && styles.buttonDisabled]} 
            onPress={handleSignOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============ MOBILE STYLES ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warning,
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warningText,
    lineHeight: 18,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  signOutButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

// ============ DESKTOP STYLES ============
const desktopStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    maxWidth: 1280,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warning,
    padding: 14,
    borderRadius: 10,
    width: '100%',
    marginBottom: 28,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.warningText,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  signOutButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.error,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  linkDivider: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
